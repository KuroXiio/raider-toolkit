// Raider Toolkit Companion
//
// Two windows:
//  - the overlay: a small panel on top of the game, with adjustable opacity. Parts of it can be unpinned into
//    their own small windows ("w-…"), moved and resized; they show and hide together with the overlay. (map condition, timers, list progress). Clicks always go
//    through it to whatever is behind, except while the panel is open, when it can be dragged to a new spot.
//  - the main window ("panel"): the program itself, a normal window with your list, the map, quests, keys and settings.
//  - the in-game menu ("menu"): a see-through layer opened with a keybind while you play, with the big map, your list
//    and your quests. While it is open the overlay's cards can be moved.
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
use tauri::{AppHandle, Emitter, Manager, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_window_state::StateFlags;

/// Shows the main window (the program itself: list, map, settings) and brings it to the front.
fn show_main_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("panel") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// What decides whether the overlay is on screen: the user's own show/hide, and (if "only with the game" is on)
/// whether ARC Raiders is the window in front. While the in-game menu is open, or the layout is being arranged
/// from the main window, the overlay shows too and its cards can be moved.
struct View {
    user_show: bool,
    game_only: bool,
    game: bool,
    own: bool,
    menu: bool,
    edit: bool,
    away: u8,
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
        v.user_show && (!v.game_only || v.game || v.menu || v.edit)
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

/// Tells the overlay whether its cards can be moved and clicked right now (the in-game menu is open, or the layout
/// is being arranged from the main window), and shows or hides it to match.
fn sync_edit(app: &AppHandle) {
    let on = {
        let v = shared(app);
        v.menu || v.edit
    };
    apply_visibility(app);
    let _ = app.emit("panel-open", on);
}

/// Opens or closes the in-game menu: a window in the middle of the screen with the big map, the list and the quests,
/// over a dimmed backdrop. `None` flips it.
///
/// Three kinds of window are involved, stacked in this order: the backdrop ("dim", which lets every click through),
/// the overlay's cards (so they can be dragged while the menu is open), and the menu itself.
fn set_menu(app: &AppHandle, open: Option<bool>) {
    let Some(w) = app.get_webview_window("menu") else {
        return;
    };
    let open = open.unwrap_or(!w.is_visible().unwrap_or(false));
    let dim = app.get_webview_window("dim");
    if open {
        if let Some(d) = &dim {
            let _ = d.set_ignore_cursor_events(true);
            let _ = d.maximize();
            let _ = d.show();
        }
        // about two thirds of the screen, so the overlay's cards along the edges stay reachable
        if let Ok(Some(m)) = w.current_monitor() {
            let f = m.scale_factor();
            let (sw, sh) = (m.size().width as f64 / f, m.size().height as f64 / f);
            let _ = w.set_size(tauri::LogicalSize::new(
                (sw * 0.64).clamp(720.0, 1400.0),
                (sh * 0.76).clamp(480.0, 900.0),
            ));
            let _ = w.center();
        }
        {
            let mut v = shared(app);
            v.menu = true;
            v.away = 0;
        }
        sync_edit(app);
        // put the cards above the backdrop
        for (label, c) in app.webview_windows() {
            if label == "overlay" || label.starts_with("w-") {
                let _ = c.set_always_on_top(false);
                let _ = c.set_always_on_top(true);
            }
        }
        let _ = w.show();
        let _ = w.set_focus();
    } else {
        let _ = w.hide();
        if let Some(d) = &dim {
            let _ = d.hide();
        }
        {
            let mut v = shared(app);
            v.menu = false;
            v.away = 0;
        }
        sync_edit(app);
    }
    let _ = app.emit("menu-open", open);
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

/// Opens the main window (also used on first start, for the agreement screen).
#[tauri::command]
fn open_panel(app: AppHandle) {
    show_main_window(&app);
}

/// Opens or closes the in-game menu.
#[tauri::command]
fn toggle_menu(app: AppHandle, open: Option<bool>) {
    set_menu(&app, open);
}

/// "Arrange the overlay" in the main window: shows the overlay and lets its cards be moved until it is turned off.
#[tauri::command]
fn set_edit(app: AppHandle, on: bool) {
    shared(&app).edit = on;
    sync_edit(&app);
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
                "panel" | "bigmap" => set_menu(app, None),
                "overlay" => overlay_visible(app, None),
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
        // The game or another program came to the front (a click outside the menu, or Alt-Tab): close the in-game menu
        // and stop arranging.
        // Two checks in a row, because Windows reports no window at all for a moment while focus moves.
        let leave = {
            let mut v = shared(&app);
            if !own && (v.menu || v.edit) {
                v.away = v.away.saturating_add(1);
            } else {
                v.away = 0;
            }
            v.away >= 2
        };
        if leave {
            shared(&app).edit = false;
            set_menu(&app, Some(false));
            let _ = app.emit("edit-off", ());
        }
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
            menu: false,
            edit: false,
            away: 0,
            binds: HashMap::new(),
            actions_on: false,
        })))
        .invoke_handler(tauri::generate_handler![
            open_panel,
            toggle_menu,
            set_edit,
            quit_app,
            show_overlay,
            set_game_only,
            focus_state,
            set_hotkeys,
            check_update,
            install_update
        ])
        .setup(|app| {
            watch_focus(app.handle().clone());
            let panel = MenuItem::with_id(app, "panel", "Open Raider Toolkit", true, None::<&str>)?;
            let ingame = MenuItem::with_id(app, "menu", "In-game menu", true, None::<&str>)?;
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
            let menu = Menu::with_items(app, &[&panel, &ingame, &overlay, &updates, &quit])?;
            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().cloned().expect("app icon"))
                .tooltip("Raider Toolkit Companion")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "panel" => show_main_window(app),
                    "menu" => set_menu(app, None),
                    "overlay" => overlay_visible(app, None),
                    "updates" => {
                        // open the main window on Settings → Updates and check straight away
                        show_main_window(app);
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
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|w, e| {
            // closing the main window only hides it to the tray, so the overlay keeps running; Quit is in the tray menu
            if let WindowEvent::CloseRequested { api, .. } = e {
                if w.label() == "panel" {
                    api.prevent_close();
                    let _ = w.hide();
                    let app = w.app_handle();
                    if shared(app).edit {
                        shared(app).edit = false;
                        sync_edit(app);
                        let _ = app.emit("edit-off", ());
                    }
                } else if w.label() == "menu" {
                    api.prevent_close();
                    set_menu(w.app_handle(), Some(false));
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Raider Toolkit Companion");
}
