// Raider Toolkit Companion
//
// Two windows:
//  - the overlay: a small panel on top of the game, with adjustable opacity. Parts of it can be unpinned into
//    their own small windows ("w-…"), moved and resized; they show and hide together with the overlay. (map condition, timers, list progress). Clicks always go
//    through it to whatever is behind, except while the panel is open, when it can be dragged to a new spot.
//  - the panel ("opened mode"): your list, map conditions, search and settings, opened with a keybind or the tray icon.
//  - the big map ("bigmap"): a larger map with your pins and route, opened with a keybind.
//
// By default the overlay shows only while ARC Raiders (or one of these windows) is the window in front. To know that,
// the app asks Windows for the title of the foreground window, the same thing the taskbar shows.
//
// All are ordinary Windows windows. The app never reads, changes or connects to the game: no memory reading,
// no game files, no screen capture, no injected code and no simulated input. Everything it shows comes from
// raidkits.com's public data and what the user types in.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_window_state::StateFlags;

/// Opens the panel, or hides it if it is open, and tells the overlay (which can be moved only while the panel is open).
fn toggle_panel_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("panel") {
        let open = !w.is_visible().unwrap_or(false);
        if open {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        } else {
            let _ = w.hide();
        }
        let _ = app.emit("panel-open", open);
    }
}

/// What decides whether the overlay is on screen: the user's own show/hide, and (if "only with the game" is on)
/// whether ARC Raiders or one of this app's own windows is the window in front.
struct View {
    user_show: bool,
    game_only: bool,
    game: bool,
    own: bool,
    binds: HashMap<String, String>,
    actions_on: bool,
}
struct Shared(Mutex<View>);

fn shared(app: &AppHandle) -> std::sync::MutexGuard<'_, View> {
    app.state::<Shared>()
        .inner()
        .0
        .lock()
        .unwrap_or_else(|e| e.into_inner())
}

/// Shows or hides the overlay and its unpinned widgets (windows "w-…") together, as the state says.
fn apply_visibility(app: &AppHandle) {
    let show = {
        let v = shared(app);
        v.user_show && (!v.game_only || v.game || v.own)
    };
    for (label, w) in app.webview_windows() {
        if label == "overlay" || label.starts_with("w-") {
            if w.is_visible().unwrap_or(false) != show {
                let _ = if show { w.show() } else { w.hide() };
            }
        }
    }
}

/// The user's show/hide of the overlay. `None` flips it.
fn overlay_visible(app: &AppHandle, show: Option<bool>) {
    let now = {
        let mut v = shared(app);
        v.user_show = show.unwrap_or(!v.user_show);
        v.user_show
    };
    apply_visibility(app);
    let _ = app.emit("overlay-shown", now);
}

/// Opens the big map, or hides it if it is open.
fn toggle_bigmap_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("bigmap") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
        return;
    }
    // made off the main thread: building a webview window from a keybind or command handler can stall Windows' message loop
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let _ = WebviewWindowBuilder::new(&app, "bigmap", WebviewUrl::App("bigmap.html".into()))
            .title("Raider Toolkit · Map")
            .inner_size(1160.0, 720.0)
            .min_inner_size(520.0, 380.0)
            .center()
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .always_on_top(true)
            .resizable(true)
            .build();
    });
}

#[derive(serde::Serialize)]
struct UpdateInfo {
    version: String,
    notes: Option<String>,
}

/// Asks GitHub whether a newer signed release exists. Only published releases count, never drafts.
#[tauri::command]
async fn check_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    use tauri_plugin_updater::UpdaterExt;
    let update = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;
    Ok(update.map(|u| UpdateInfo {
        version: u.version.clone(),
        notes: u.body.clone(),
    }))
}

/// Downloads the update, checks its signature against the key built into the app, installs it and restarts.
#[tauri::command]
async fn install_update(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;
    let Some(update) = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?
    else {
        return Err("No update available".into());
    };
    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| e.to_string())?;
    app.restart();
}

#[tauri::command]
fn toggle_panel(app: AppHandle) {
    toggle_panel_window(&app);
}

/// Opens the panel (used on first start, for the agreement screen).
#[tauri::command]
fn open_panel(app: AppHandle) {
    if let Some(w) = app.get_webview_window("panel") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// Quits the app (Decline on the agreement screen, or Quit).
#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn show_overlay(app: AppHandle, show: bool) {
    overlay_visible(&app, Some(show));
}

/// "Only with the game": the overlay hides while another program is in front.
#[tauri::command]
fn set_game_only(app: AppHandle, on: bool) {
    shared(&app).game_only = on;
    apply_visibility(&app);
}

#[tauri::command]
fn toggle_bigmap(app: AppHandle) {
    toggle_bigmap_window(&app);
}

/// Whether the game or this app is in front right now (for the panel's settings page).
#[tauri::command]
fn focus_state(app: AppHandle) -> (bool, bool) {
    let v = shared(&app);
    (v.game, v.own)
}

/// Registers one keybind. "panel" and "overlay" are handled here; the others (route, next stop, …) are sent to the
/// overlay as a "hotkey" event.
fn register(app: &AppHandle, action: &str, accel: &str) -> bool {
    let a = action.to_string();
    app.global_shortcut()
        .on_shortcut(accel, move |app, _s, e| {
            if e.state() != ShortcutState::Pressed {
                return;
            }
            match a.as_str() {
                "panel" => toggle_panel_window(app),
                "overlay" => overlay_visible(app, None),
                "bigmap" => toggle_bigmap_window(app),
                other => {
                    let _ = app.emit("hotkey", other.to_string());
                }
            }
        })
        .is_ok()
}

/// The route and map keybinds work only while the game or this app is in front, so they never take keys away
/// from other programs (a browser's Ctrl+Shift+N, say).
fn sync_action_keys(app: &AppHandle) {
    let (want, on, binds) = {
        let v = shared(app);
        (v.game || v.own, v.actions_on, v.binds.clone())
    };
    if want == on {
        return;
    }
    let gs = app.global_shortcut();
    for (action, accel) in binds.iter() {
        if action == "panel" || action == "overlay" || accel.trim().is_empty() {
            continue;
        }
        if want {
            register(app, action, accel);
        } else {
            let _ = gs.unregister(accel.as_str());
        }
    }
    shared(app).actions_on = want;
}

/// Sets all keybinds ({"panel": "Ctrl+Shift+Space", "overlay": …, "route": …}). An empty string turns one off.
/// Uses the standard Windows hotkey registration (the same feature Discord and Steam use), not a keyboard hook.
/// Returns the keybinds that could not be registered (for example because another program already uses them).
#[tauri::command]
fn set_hotkeys(app: AppHandle, binds: HashMap<String, String>) -> Vec<String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    let mut failed = Vec::new();
    let mut seen: Vec<String> = Vec::new();
    for (action, accel) in binds.iter() {
        let accel = accel.trim();
        if accel.is_empty() || seen.iter().any(|x| x.eq_ignore_ascii_case(accel)) {
            continue;
        }
        seen.push(accel.to_string());
        if !register(&app, action, accel) {
            failed.push(accel.to_string());
        }
    }
    {
        let mut v = shared(&app);
        v.binds = binds;
        v.actions_on = true;
    }
    sync_action_keys(&app);
    failed
}

/// Which window is in front: the game's, one of ours, or something else. This asks Windows for the title and class
/// name of the foreground window (what Alt-Tab and the taskbar show). It never opens, reads or touches the game's process.
#[cfg(windows)]
fn front_window() -> (bool, bool) {
    use windows_sys::Win32::System::Threading::GetCurrentProcessId;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
    };
    unsafe {
        let h = GetForegroundWindow();
        if h.is_null() {
            return (false, false);
        }
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(h, &mut pid);
        if pid == GetCurrentProcessId() {
            return (false, true);
        }
        let mut t = [0u16; 256];
        let n = GetWindowTextW(h, t.as_mut_ptr(), t.len() as i32).max(0) as usize;
        let title = String::from_utf16_lossy(&t[..n]).to_lowercase();
        let mut c = [0u16; 128];
        let m = GetClassNameW(h, c.as_mut_ptr(), c.len() as i32).max(0) as usize;
        let class = String::from_utf16_lossy(&c[..m]);
        let game = title.contains("arc raiders")
            && (class == "UnrealWindow" || title.trim() == "arc raiders");
        (game, false)
    }
}
#[cfg(not(windows))]
fn front_window() -> (bool, bool) {
    (true, false)
}

/// Checks twice a second which window is in front, and shows or hides the overlay when that changes.
fn watch_focus(app: AppHandle) {
    std::thread::spawn(move || loop {
        let (game, own) = front_window();
        let changed = {
            let mut v = shared(&app);
            let c = v.game != game || v.own != own;
            v.game = game;
            v.own = own;
            c
        };
        if changed {
            apply_visibility(&app);
            sync_action_keys(&app);
            let _ = app.emit("focus", (game, own));
        }
        std::thread::sleep(Duration::from_millis(500));
    });
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                // the panel's size and place are remembered; the overlay places itself relative to the screen edges instead
                .with_denylist(&[
                    "overlay", "w-map", "w-items", "w-cond", "w-prog", "w-maps", "w-quests",
                    "w-keys",
                ])
                .with_state_flags(StateFlags::all() & !StateFlags::VISIBLE)
                .build(),
        )
        .manage(Shared(Mutex::new(View {
            user_show: false,
            game_only: true,
            game: false,
            own: false,
            binds: HashMap::new(),
            actions_on: false,
        })))
        .invoke_handler(tauri::generate_handler![
            toggle_panel,
            open_panel,
            quit_app,
            show_overlay,
            set_game_only,
            toggle_bigmap,
            focus_state,
            set_hotkeys,
            check_update,
            install_update
        ])
        .setup(|app| {
            watch_focus(app.handle().clone());
            let panel = MenuItem::with_id(app, "panel", "Open panel", true, None::<&str>)?;
            let overlay = MenuItem::with_id(
                app,
                "overlay",
                "Show or hide the overlay",
                true,
                None::<&str>,
            )?;
            let updates =
                MenuItem::with_id(app, "updates", "Check for updates", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&panel, &overlay, &updates, &quit])?;
            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().cloned().expect("app icon"))
                .tooltip("Raider Toolkit Companion")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "panel" => toggle_panel_window(app),
                    "overlay" => overlay_visible(app, None),
                    "updates" => {
                        // open the panel on Settings → Updates and check straight away
                        if let Some(w) = app.get_webview_window("panel") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                            let _ = app.emit("panel-open", true);
                        }
                        let _ = app.emit("check-updates", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, e| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = e
                    {
                        toggle_panel_window(tray.app_handle());
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|w, e| {
            // closing the panel or the big map only hides it; Quit is in the tray menu
            if let WindowEvent::CloseRequested { api, .. } = e {
                if w.label() == "panel" {
                    api.prevent_close();
                    let _ = w.hide();
                    let _ = w.app_handle().emit("panel-open", false);
                } else if w.label() == "bigmap" {
                    api.prevent_close();
                    let _ = w.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Raider Toolkit Companion");
}
