// Raider Toolkit Companion
//
// Two windows:
//  - the overlay: a small panel on top of the game, with adjustable opacity (map condition, timers, list progress). Clicks always go
//    through it to whatever is behind, except while the panel is open, when it can be dragged to a new spot.
//  - the panel ("opened mode"): your list, map conditions, search and settings, opened with a keybind or the tray icon.
//
// Both are ordinary Windows windows. The app never reads, changes or connects to the game: no memory reading,
// no game files, no screen capture, no injected code and no simulated input. Everything it shows comes from
// raidkits.com's public data and what the user types in.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WindowEvent};
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

/// Shows or hides the overlay. `None` flips it.
fn overlay_visible(app: &AppHandle, show: Option<bool>) {
    if let Some(w) = app.get_webview_window("overlay") {
        let show = show.unwrap_or(!w.is_visible().unwrap_or(false));
        let _ = if show { w.show() } else { w.hide() };
        let _ = app.emit("overlay-shown", show);
    }
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

/// Sets the two keybinds: one opens and closes the panel, one shows and hides the overlay. An empty string turns one off.
/// Uses the standard Windows hotkey registration (the same feature Discord and Steam use), not a keyboard hook.
/// Returns the keybinds that could not be registered (for example because another program already uses them).
#[tauri::command]
fn set_hotkeys(app: AppHandle, panel: String, overlay: String) -> Vec<String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    let mut failed = Vec::new();
    if !panel.trim().is_empty() {
        let r = gs.on_shortcut(panel.as_str(), |app, _s, e| {
            if e.state() == ShortcutState::Pressed {
                toggle_panel_window(app);
            }
        });
        if r.is_err() {
            failed.push(panel.clone());
        }
    }
    if !overlay.trim().is_empty() && overlay != panel {
        let r = gs.on_shortcut(overlay.as_str(), |app, _s, e| {
            if e.state() == ShortcutState::Pressed {
                overlay_visible(app, None);
            }
        });
        if r.is_err() {
            failed.push(overlay.clone());
        }
    }
    failed
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                // the panel's size and place are remembered; the overlay places itself relative to the screen edges instead
                .with_denylist(&["overlay"])
                .with_state_flags(StateFlags::all() & !StateFlags::VISIBLE)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![toggle_panel, open_panel, quit_app, show_overlay, set_hotkeys])
        .setup(|app| {
            let panel = MenuItem::with_id(app, "panel", "Open panel", true, None::<&str>)?;
            let overlay = MenuItem::with_id(app, "overlay", "Show or hide the overlay", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&panel, &overlay, &quit])?;
            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().cloned().expect("app icon"))
                .tooltip("Raider Toolkit Companion")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "panel" => toggle_panel_window(app),
                    "overlay" => overlay_visible(app, None),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, e| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                        toggle_panel_window(tray.app_handle());
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|w, e| {
            // closing the panel only hides it; Quit is in the tray menu
            if let WindowEvent::CloseRequested { api, .. } = e {
                if w.label() == "panel" {
                    api.prevent_close();
                    let _ = w.hide();
                    let _ = w.app_handle().emit("panel-open", false);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Raider Toolkit Companion");
}
