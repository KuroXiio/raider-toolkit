# Raider Toolkit

Unofficial ARC Raiders fan tools: Workshop planner, weapon calculator, item finder, maps, keys and a shopping list.
Not affiliated with Embark Studios.

Made by Kuro. Come say hi: https://discord.gg/NE3ughZTxn

## Maintaining this site

`site.json` holds the patch badge shown on the site and the site's address (`siteUrl`, used for link previews). Edit it, commit, and the site rebuilds and redeploys on its own.

The admin password for the Data check panel is kept as a repository secret named `ADMIN_PASSWORD`
(Settings → Secrets and variables → Actions), not in the code.

Day-to-day fixes (an item's value, a key location, a correction) go into `scripts/build_data.py`.
