# Tooly ADU targeting map

Internal tool: heat map of ADU rules for every Miami-Dade and Broward
jurisdiction, plus an address checker that rates a lot **Highly likely /
Likely / Unlikely** for a backyard ADU.

* App: `internal/adu-map/index.html`, live at
  https://toolystructures.com/internal/adu-map/ (unlisted, `noindex`, not in the
  sitemap). This repo is public, so the committed spreadsheet leaves out the
  internal "TOO TOUGH reasons" tab. To see those notes, import the full workbook
  in the page (Data & updates); it stays in your browser only.
* Source of truth: `source/Tooly_ADU_Municipality_Table.xlsx`
* Map boundaries + parcel counts: `data/geo.json` (official county boundary
  layers, pulled 2026-11-03; zip counts from the county property appraisers)

## How the address check works

1. **Find the lot** — address → ArcGIS World geocoder → nearest parcel from the
   Miami-Dade (PaGISView) or Broward (BCPA parcel polygons) property appraiser
   layers, preferring the parcel with the same house number. A 12/13-digit folio
   or a click on the map also works.
2. **Jurisdiction** — from the folio prefix (Miami-Dade) or situs city code
   (Broward), falling back to the boundary map.
3. **Zoning** — live from Miami-Dade's municipal and unincorporated zoning
   layers, and from any city layer listed on the *Scoring rules* sheet (Fort
   Lauderdale, Miramar, Lauderhill, Dania Beach, Pompano Beach, Pembroke Pines). Plantation
   (Cloudflare bot check), Tamarac (server refuses browser requests - no CORS) and
   Hallandale Beach (server did not answer) have layers the page cannot use; there the
   user can pick the district, and all three allow ADUs on any single-family lot.
4. **Score** — each check is pass / warn / fail:
   city verdict, single-family use, zoning district, lot size vs. the city (or
   district) minimum, max ADU size vs. the house/lot, open yard space, existing
   granny flat, homestead/owner-occupancy rules.
   Any fail → **Unlikely**; any warning → **Likely**; otherwise **Highly likely**.
   The row's *Rating cap* then limits the result (CONDITIONAL cities are capped
   at Likely; Homestead at Unlikely until its ordinance is adopted).

It is a screening tool, not a zoning determination: HOA covenants, easements,
flood zone, septic and exact setbacks are not checked.

## Updating when an ordinance changes

1. Edit the city's row on **Municipality table** (verdict + narrative) and on
   **Scoring rules** (districts, minimums, caps). Set *Last verified*.
2. Either
   * **No code:** open the map → *Data & updates* → *Import updated
     spreadsheet*. Changes apply instantly in that browser; *Download updated
     map* saves a new HTML to share. Or
   * **Repo:** commit the spreadsheet and run
     `pip install openpyxl && python3 tools/adu/build_map.py`.
     The build warns about bad verdicts, missing rule rows or unknown slugs.

Adding a city zoning layer: put its `.../FeatureServer/0` URL and zoning field
name on the *Scoring rules* row. Adding a council feed: put the Legistar client
name (the `xxx` in `xxx.legistar.com`).

## Testing without a scraping service

* `.github/workflows/adu-map-live-test.yml` opens the deployed page in a real
  browser after every GitHub Pages deploy (and on demand) and checks the
  addresses in `tests/addresses.json` against their expected ratings, using the
  live county servers. The run summary shows a pass/fail table.
* `.github/workflows/gis-probe.yml` fetches any public map-service URL (GET
  only) and prints the response, for checking new city zoning layers.

Inside a claude.ai Artifact the page cannot reach other sites, so there it
routes lookups through the viewer's Firecrawl connector; the hosted page never
needs Firecrawl.

## Change watch

`.github/workflows/adu-ordinance-watch.yml` runs
`watch_ordinances.py` every Monday (and on demand from the Actions tab). It
opens an issue listing new ADU-related council items (Legistar API), watched
pages whose ADU sentences changed, and rows past the 120-day review date.
State is kept in `data/watch_state.json`. Scheduled workflows only run from the
default branch.
