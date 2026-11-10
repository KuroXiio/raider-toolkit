# Raider Toolkit Companion

For ARC Raiders players: an overlay (with adjustable opacity) showing the map condition on your map and its countdown, the next condition, and your shopping list progress. Clicks always pass through it. A keybind (Ctrl+Shift+Space) opens the panel with your list, all map conditions, item/key/quest search and settings; another (Ctrl+Shift+H) hides the overlay completely. The overlay is anchored to a corner or edge of the screen and scales with the screen height, so it stays in place at any resolution or aspect ratio.

On first start the app shows its licence agreement, privacy policy and safety notes, and does nothing (no overlay, no keybinds) until the user accepts them. The overlay's parts can be switched on or off and dragged into any order in Settings, and both windows have an opacity slider.

## What it does not do

It is an ordinary Windows window, drawn by Windows like Discord or a browser. It never reads, changes or connects to the game:

- no reading of game memory, game files or logs
- no screen capture or OCR
- no injected code, overlay hooks or drivers
- no simulated keypresses or mouse input
- it never runs as administrator

Everything it shows comes from `https://raidkits.com/bot.json` (the same public data as the website and the Discord bot) and from what you type in. The keybind uses the standard Windows hotkey registration (`RegisterHotKey`, the same feature Discord and Steam use), not a keyboard hook, and can be turned off.

Unofficial fan app, not affiliated with or endorsed by Embark Studios. Embark decides which programs are allowed with their game; use it at your own risk.

## How it is built

- `src-tauri/`: the app shell (Tauri 2, Rust): two windows, the tray icon and the keybind. `capabilities/default.json` lists everything the windows are allowed to do.
- `ui/`: the overlay (`overlay.html`) and the panel (`panel.html`), plain HTML/CSS/JS, sharing `data.js`.
- `ui/legal/`: licence agreement (shown by the installer), privacy policy, safety notes, third-party notices and the MIT licence. They are installed in the app's `legal` folder and readable in Settings. `scripts/notices.py` rebuilds the third-party notices when the dependencies change.

The Windows installer is built by GitHub Actions (`.github/workflows/companion.yml`): run it from the Actions tab or push a tag like `companion-v0.1.0`. It creates a draft release; check it, then publish.

To run it on your own PC: install Rust and Node, then in this folder run `npx @tauri-apps/cli@2 dev`.
