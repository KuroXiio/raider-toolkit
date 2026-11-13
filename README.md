# Raider Toolkit

Unofficial ARC Raiders fan tools: Workshop planner, weapon calculator, item finder, maps, keys and a shopping list.
Not affiliated with Embark Studios.

Made by Kuro. Come say hi: https://discord.gg/NE3ughZTxn

## Maintaining this site

`site.json` holds the patch badge shown on the site and the site's address (`siteUrl`, used for link previews). Edit it, commit, and the site rebuilds and redeploys on its own.

The admin password for the Data check panel is kept as a repository secret named `ADMIN_PASSWORD`
(Settings → Secrets and variables → Actions), not in the code.

Day-to-day fixes (an item's value, a key location, a correction) go into `scripts/build_data.py`.

## Raider Toolkit Companion (Windows app)

The source is in `companion/`. Installers are built by GitHub Actions (`.github/workflows/companion.yml`) from this repository and
published under [Releases](https://github.com/KuroXiio/raider-toolkit/releases).

**Install:** two versions, with the same app inside:

- **[Microsoft Store](https://apps.microsoft.com/detail/9NVWVPNN94NF)**: signed by Microsoft, so Windows installs it without
  warnings, and the Store keeps it updated.
- **GitHub:** download the latest `Raider.Toolkit.Companion_…_x64-setup.exe` from Releases and run it. This installer isn't
  code-signed, so Windows may show "Windows protected your PC": choose More info, then Run anyway. On PCs with Smart App Control
  turned on, Windows blocks unsigned apps, so use the Store version there. This version updates itself from GitHub.

**Uninstall:** Windows Settings → Apps → Installed apps → Raider Toolkit Companion → Uninstall. Tick "Delete the application data"
there (GitHub version) to also remove your saved list and settings; the Store version removes its data on its own.

## Builds and signing

Both versions are built by this repository's GitHub Actions workflow (`.github/workflows/companion.yml`) from the `main` branch,
and nothing is released until it has been checked and published by hand.

- The Store package (`…_Store.msix`) is uploaded to Partner Center and signed by Microsoft after its review.
- The GitHub installer is not code-signed. Its updates are signed with Raider Toolkit's own update key, and installed copies
  refuse any update not signed with it.

Privacy: the app has no account, analytics, tracking or ads. It downloads Raider Toolkit's public data from raidkits.com and checks
GitHub for updates (the GitHub version only). It sends your own data only when you ask it to: your list and route if you turn on
sync, and a report if you send one with "Report a problem". The full policy is in
[`companion/ui/legal/PRIVACY.txt`](companion/ui/legal/PRIVACY.txt) and is shown in the app before first use.

## Licence

MIT, see [LICENSE](LICENSE). What that does and does not cover: [NOTICE.md](NOTICE.md).
