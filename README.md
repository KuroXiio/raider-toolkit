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

## Set it up (about 5 minutes)

1. Create a free account on github.com and make a new **public** repository, for example `raider-toolkit`.
2. Upload everything in this folder to it (drag the files into "Add file → Upload files"; keep the `.github` folder).
3. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Go to **Actions → Update data and deploy → Run workflow**. After a few minutes the site is live at
   `https://<your-name>.github.io/raider-toolkit/`.

To use your own domain, add it under Settings → Pages → Custom domain.

## Updating by hand

- Run it now: Actions → Update data and deploy → Run workflow.
- After a new game patch: change `patch` and `patchDate` in `site.json` (this is the badge on the site).
- Fixes collected in the site's Data check ("Copy my fixes") go into `scripts/build_data.py`.

## Build on your own computer

Needs Python 3 with Pillow (`pip install pillow`), Node.js and Git.

```
./build.sh
```

The finished site is in `build/site/` (open `index.html`, or serve the folder with any web server).

## Files

- `template/` – the page (HTML, CSS, scripts)
- `scripts/build_data.py` – turns the data set into site data and adds the guide facts
- `scripts/images.py` – icons, weapon art, map overviews and map tiles
- `scripts/assemble.py` – puts the page together
- `.github/workflows/update.yml` – the daily update and deploy
