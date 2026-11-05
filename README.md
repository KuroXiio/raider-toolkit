# Raider Toolkit

Unofficial ARC Raiders fan tools: Workshop planner, weapon calculator, item finder, maps, keys and a shopping list.
Not affiliated with Embark Studios.

## How it stays up to date

Every day at 04:17 UTC, and on every push to `main`, GitHub Actions:

1. downloads the latest community data set ([RaidTheory/arcraiders-data](https://github.com/RaidTheory/arcraiders-data), MIT),
2. rebuilds all data, item icons, weapon art, map overviews and full-resolution map tiles,
3. checks the page for script errors (a broken build is never published),
4. publishes the result to GitHub Pages.

New items, values, recipes, icons and maps arrive automatically as soon as the data set has them.
Facts that only exist in guides and patch notes (key locations, Pendola Pass, patch corrections, amplification)
live in `scripts/build_data.py` and are kept on top of the new data.
