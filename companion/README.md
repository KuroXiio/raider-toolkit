# Raider Toolkit Companion

For ARC Raiders players: an in-game bar on a keybind (map with item and key search, route, shopping list, quests and keys, map conditions), whose widgets can be pinned so they stay on screen while you play, with adjustable opacity. Clicks always pass through pinned widgets. Routes can be planned in the app (pick your spawn) or sent from raidkits.com. The main window is a normal program window with your list, the map and route, quests, keys, map conditions, search, the overlay's settings and the app's settings. In game, a keybind (Ctrl+Shift+Space) opens the in-game menu over a dimmed backdrop: the big map with zoom and layers, your list and your quests; while it is open the overlay's cards can be dragged. Another keybind (Ctrl+Shift+H) hides the overlay completely, and Ctrl+Shift+R/N/P/J show the route, go to the next or previous stop and minimize the map. The overlay is anchored to a corner or edge of the screen and scales with the screen height, so it stays in place at any resolution or aspect ratio.

By default pinned widgets show only while ARC Raiders is the window in front, and hide when you Alt-Tab away. Sync (optional, Settings → Sync) keeps the shopping list, the route and followed quests and keys the same as on raidkits.com, through the sync Worker in `worker/sync.js`.

On first start the app shows its licence agreement, privacy policy and safety notes, and does nothing (no overlay, no keybinds) until the user accepts them. Which widgets are pinned, their size and their opacity are set in the bar or on the main window's In game page.

## What it does not do

It is an ordinary Windows window, drawn by Windows like Discord or a browser. It never reads, changes or connects to the game:

- no reading of game memory, game files or logs
- no screen capture or OCR
- no injected code, overlay hooks or drivers
- no simulated keypresses or mouse input
- it never runs as administrator

Everything it shows comes from `https://raidkits.com/bot.json` and the site's map pictures and marker files (the same public data as the website and the Discord bot) and from what you type in. The keybinds use the standard Windows hotkey registration (`RegisterHotKey`, the same feature Discord and Steam use), not a keyboard hook, and can be turned off; the map and route ones are only registered while the game or the app is in front.

To know whether the game is in front, the app asks Windows for the title and class name of the foreground window (`GetForegroundWindow`, `GetWindowText`, `GetClassName`) twice a second: the same name the taskbar shows. It never opens or reads the game's process.

Unofficial fan app, not affiliated with or endorsed by Embark Studios. Embark decides which programs are allowed with their game; use it at your own risk.

## How it is built

- `src-tauri/`: the app shell (Tauri 2, Rust): the windows, the tray icon, the keybinds and the "is the game in front" check. `capabilities/default.json` lists everything the windows are allowed to do.
- `ui/`: the background page that owns keybinds, sync and update checks (`overlay.html`; its old card overlay is no longer shown, pinned widgets are drawn by `hub.html` with the bar closed), the main window (`panel.html`), the in-game bar (`hub.html`: map, route, list, quests and conditions as widgets over the game), the same page docked in the main window's Map and route page (`hub.html?embed=1`), in-app route planning (`route.js`), plain HTML/CSS/JS, sharing `data.js` (data and settings), `mapview.js` (draws the map, pins and route) and `sync.js` (sync with raidkits.com).
- `ui/legal/`: licence agreement (shown by the installer), privacy policy, safety notes, third-party notices and the MIT licence. They are installed in the app's `legal` folder and readable in Settings. `scripts/notices.py` rebuilds the third-party notices when the dependencies change.

The Windows installer is built by GitHub Actions (`.github/workflows/companion.yml`): run it from the Actions tab or push a tag like `companion-v0.1.0`. It creates a draft release; check it, then publish.

To run it on your own PC: install Rust and Node, then in this folder run `npx @tauri-apps/cli@2 dev`.

## Releasing an update

1. Raise the version in `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` (for example 0.2.0 → 0.2.1).
2. Push. GitHub Actions builds the installer and the signed update files into a draft release `companion-v<version>`.
3. Install the draft's installer yourself and check it. Then press **Publish**: every installed copy offers the update (it checks at start and every 6 hours).

Required updates: after publishing a release that every player must have (a game patch broke something, an important fix), raise `companionMinVersion` in the repository's `site.json` to that version and push. On their next start, older copies show only an "Update required" screen until they install it. Nobody gets locked out by mistake: if that version isn't published yet, or the player is offline, the app starts as usual.

Signing: the private key lives only in the repository secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`; the public key is in `tauri.conf.json` (`plugins.updater.pubkey`). Keep a backup of the private key: without it, installed copies can't be updated.

## When something changes what the app sends, stores or does

Update the documents in `ui/legal/` in the same change as the app, then decide what users must see (both versions are in `ui/data.js`):

- **Licence agreement changes that affect what users agree to** (new obligations, liability, governing law, giving up a right): raise `TERMS_VERSION`. Every user must accept again before the app starts.
- **Privacy policy changes** (the app sends, stores or shares something new, or uses a new service): raise `PRIVACY_VERSION`. Users get a one-time notice; they don't have to accept anything. (The one feature that relies on consent, sync, asks for it when the user turns it on.)
- **Everything else** (new features that work as SAFETY.txt describes, wording, corrections, the safety notes): just update the text and its date. The licence agreement already covers the app as it's updated over time (section 3).

Run `python3 scripts/notices.py` if dependencies changed. The installer shows `ui/legal/EULA.txt` and installs the whole `legal` folder.
