# Tooly ADU targeting map

Internal tool: heat map of ADU rules for every Miami-Dade and Broward
jurisdiction, plus an address checker that rates a lot **Highly likely /
Likely / Unlikely** for a backyard ADU.

* App: `internal/adu-map/index.html`, live at
  https://toolystructures.com/internal/adu-map/ (unlisted, `noindex`, not in the
  sitemap). This repo is public, so the committed spreadsheet leaves out the
  internal "TOO TOUGH reasons" tab. To see those notes, import the full workbook
  in the page (Data & updates); it stays in your browser only.
* Customer page: `internal/adu-check/index.html`, live at
  https://toolystructures.com/internal/adu-check/ (also unlisted). Same checker, but it
  only shows the rating, a plain-language reason and - unless the result is Unlikely -
  a picture of the lot with the unit placed inside the setbacks. It rates every model
  (407 and 352 sf) and shows the best one. The build leaves the research narrative,
  sources, notes and cap reasons out of this page entirely; only the numbers the checker
  needs (district lists, minimums, setbacks) are embedded, because the check runs in the
  visitor's browser.
* Source of truth: `source/Tooly_ADU_Municipality_Table.xlsx`
* Map boundaries + parcel counts: `data/geo.json` (official county boundary
  layers, pulled 2026-11-03; zip counts from the county property appraisers)

## How the address check works

1. **Find the lot** — the form has Street, City, State (FL) and Zip boxes; city
   and zip are dropdowns. While you type, the page lists matching addresses
   straight from the property appraisers' parcel records (same house number in
   the chosen city / zip, ranked by how close the street name is), so a
   misspelling still finds the right lot. If there is no exact match, the check
   stops and asks "did you mean…" instead of guessing. A whole address pasted
   into the street box is split into the boxes. Folio search and clicking a lot
   on the map also work. The ArcGIS geocoder is only a last resort, and a lot
   found that way is flagged.
2. **Jurisdiction** — from the folio prefix (Miami-Dade) or situs city code
   (Broward). If it differs from the city picked in the form (mailing city
   "Miami" for an unincorporated lot, for example) the result says so.
3. **Zoning** — live from Miami-Dade's municipal and unincorporated zoning
   layers, and from any city layer listed on the *Scoring rules* sheet (Fort
   Lauderdale, Miramar, Lauderhill, Dania Beach, Pompano Beach, Pembroke Pines). Plantation
   (Cloudflare bot check), Tamarac (server refuses browser requests - no CORS) and
   Hallandale Beach (server did not answer) have layers the page cannot use; there the
   user can pick the district, and all three allow ADUs on any single-family lot.
4. **Does the unit fit?** — the parcel outline (county), building outlines
   (Miami-Dade 2015 + 2019-20 imagery outlines for both counties + the Global
   Building Atlas layer Broward publishes), the street
   side of the lot (geocoder street point), corner / waterfront edges (edges
   with no neighbouring parcel), and probable pools (turquoise water on the Esri
   aerial photo) are laid on a 1 ft grid. The unit (407 sf = 14 × 29 ft,
   352 sf = 11 × 32 ft, 264 sf = 12 × 22 ft, or a custom size; the models and the
   brand name are set at the top of the checker code in `MODELS` / `BRAND`) must fit inside the city's rear /
   side / street-side setbacks, its distance from the house, and not in front of
   the house (behind it where the code says so). If it does not fit, the check
   tries the smallest relaxation that works (5 ft from the house where the code
   sets no distance, removing a shed, 5 ft setbacks where the city's numbers are
   not on file) and says which. The result shows a drawing of the lot on the
   aerial photo with the allowed area and the placed unit. Lot coverage is
   checked where the sheet has a limit.
5. **Other records** — FEMA flood zone, Miami-Dade historic districts / sites,
   Health Department septic records (Miami-Dade), and the HOA answer.
6. **Score** — each check is pass / warn / fail. Any fail → **Unlikely**; any
   warning → **Likely**; otherwise **Highly likely**, but only when the zoning
   came from a GIS layer and the fit was verified with the city's own setbacks.
   The row's *Rating cap* then limits the result (CONDITIONAL cities are capped
   at Likely; Homestead at Unlikely until its ordinance is adopted). The result
   rates both models (407 and 352 sf) side by side - e.g. "Likely for both sizes" or
   "Unlikely for the 407 sf · Likely for the 352 sf" - so there is nothing to pick.

It is a screening tool, not a zoning determination: easements, utilities, tree
permits, HOA covenants and an actual survey are not checked. Building outlines
can miss recent houses or additions: the check warns when the appraiser's
building area is much larger than the outlines, and skips the fit (no lot
placement drawn) when the outlines clearly miss the house and the pool detector can miss covered pools,
so look at the lot drawing before quoting.

### Setback columns (Scoring rules)

*ADU rear / side / street-side setback (ft)*, *ADU separation from house (ft)*,
*ADU must be behind house? (Y/N)*, *Max lot coverage %*, *Setbacks by district*
(`ZONE=side/rear; ...`, used when the lot's zoning matches) and *Setback notes*.
Blank means "not on file": the fit check then uses 10 ft rear / 7.5 ft side /
10 ft from the house and will not rate the lot Highly likely.

## Updating when an ordinance changes

1. Edit the city's row on **Municipality table** (verdict + narrative) and on
   **Scoring rules** (districts, minimums, caps). Set *Last verified*.
2. Either
   * **No code:** open the map → *Data & updates* → *Import updated
     spreadsheet*. Changes apply instantly in that browser; *Download updated
     map* saves a new HTML to share. Or
   * **Repo:** commit the spreadsheet and run
     `pip install openpyxl && python3 tools/adu/build_map.py`.
     The build warns about bad verdicts, missing rule rows or unknown slugs, and
     writes both the staff map and the customer page.

Adding a city zoning layer: put its `.../FeatureServer/0` URL and zoning field
name on the *Scoring rules* row. Adding a council feed: put the Legistar client
name (the `xxx` in `xxx.legistar.com`).

## Testing without a scraping service

* `.github/workflows/adu-map-live-test.yml` opens the deployed page in a real
  browser after every GitHub Pages deploy (and on demand) and checks the
  addresses in `tests/addresses.json` against their expected ratings, using the
  live county servers. The run summary shows a pass/fail table and the run's
  artifact has a screenshot of every result. Run it on a branch with
  *serve_local = true* to test that branch before merging.
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
