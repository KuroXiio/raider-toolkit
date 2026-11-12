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

**Install:** download the latest `Raider.Toolkit.Companion_…_x64-setup.exe` from Releases and run it.

**Uninstall:** Windows Settings → Apps → Installed apps → Raider Toolkit Companion → Uninstall. Tick "Delete the application data"
there to also remove your saved list and settings.

## Code signing policy

Windows installers and app files are signed from the first release after the project is accepted by SignPath Foundation; earlier
releases are unsigned.

Free code signing provided by [SignPath.io](https://about.signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

Only files built by this repository's GitHub Actions workflow from the `main` branch are signed, and every release is approved by hand.

Team roles:

- Committers and reviewers: [Kuro (KuroXiio)](https://github.com/KuroXiio)
- Approvers: [Kuro (KuroXiio)](https://github.com/KuroXiio)

Privacy: the app has no account, analytics, tracking or ads. It downloads Raider Toolkit's public data from raidkits.com and checks
GitHub for updates. It sends your own data only when you ask it to: your list and route if you turn on sync, and a report if you
send one with "Report a problem". The full policy is in [`companion/ui/legal/PRIVACY.txt`](companion/ui/legal/PRIVACY.txt) and is
shown in the app before first use.

## Licence

MIT, see [LICENSE](LICENSE). What that does and does not cover: [NOTICE.md](NOTICE.md).
