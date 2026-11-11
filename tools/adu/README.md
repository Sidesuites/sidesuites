# Sidesuites ADU targeting map and Check My Lot

Two pages built from one template (`app_template.html`) by `build_map.py`:

* **Staff map** (internal tool): heat map of ADU rules for every Miami-Dade and
  Broward jurisdiction, plus an address checker that rates a lot **Highly likely /
  Likely / Unlikely** for a backyard ADU. File `internal/adu-map/index.html`, live at
  https://sidesuites.com/internal/adu-map/ (unlisted, `noindex`, not in the
  sitemap). This repo is public, so the committed spreadsheet leaves out the
  internal "TOO TOUGH reasons" tab. To see those notes, import the full workbook
  in the page (Data & updates); it stays in your browser only.
* **Check My Lot** (public): `check-my-lot/index.html`, live at
  https://sidesuites.com/check-my-lot/ (indexable, in the sitemap; canonical,
  description and share tags are written by the build). Same checker, but it
  only shows the answer - the likelihood in one line and a rating chip per size - and,
  unless the result is Unlikely, a picture of the lot with the unit placed inside the
  setbacks, then the two next steps (*Join the waitlist*, *Schedule a call*). There is no
  list of checks and no per-size reasons (a call covers the details). It rates every model
  (401 and 352 sf) and draws the best one. The build leaves the research narrative,
  sources, notes and cap reasons out of this page entirely; only the numbers the checker
  needs (district lists, minimums, setbacks) are embedded, because the check runs in the
  visitor's browser. It loads no map libraries (no Leaflet, no SheetJS).
  * No staff wording ships in it. Staff-only markup in the template sits between
    `<!--STAFF-->` and `<!--/STAFF-->` and is cut out of Check My Lot by the build (the
    staff header, the tabs, Batch check, Map explorer, Data & updates). The code-review
    verdicts the checker still needs (GO / CONDITIONAL / TOO TOUGH) are embedded as neutral
    codes (A / B / C): the build rewrites the template's `const V = /*__VERDICTS__*/{...}`
    line and the "13." column to match. The build stops with an error if any of those words
    would still end up in the page. The page's `class="cust"` / `class="customer"` are
    written into the HTML, so it is the branded page even without JavaScript (it then says
    the check needs JavaScript).
  * It is a page of the public site, built on the site's shared chrome: the build inlines
    `css/site.css` (tokens, Fraunces + DM Sans, links, buttons, nav, footer, the stripe, focus,
    dark mode) at the template's `/*@SITE_CSS@*/` placeholder, so the page stays one
    self-contained file. **After any change to `css/site.css`, run the build again** so Check My
    Lot picks it up. Customer-only markup and styles sit between `<!--CUSTOMER-->` and
    `<!--/CUSTOMER-->` in the template and are cut out of the staff map, which renders exactly as
    before (none of the site chrome or site.css reaches it).
  * Look (v4, the logo-sheet colourway, mid-century modern): the shared site nav ("Check my
    lot" marked as the current page) and the ink footer; an intro (eyebrow, the Fraunces title,
    the lede, *What we check* with three flat swatch circles, the five-swatch stripe) and the
    form card. From 1024 px the intro and the form sit side by side; below that the intro is a
    paper band above the form. The result goes under them and, from 900 px, uses the page width:
    a result with a lot picture is one wide card in two columns - on the leading side the
    address (Fraunces), the answer ("Likely to rent out or for family", or the better of the two:
    "Likely for family & guests"), one plain sentence, the two answers as a short grouped list
    (*To rent out* and *For family & guests*, word + fill: green "Highly likely" and "Likely",
    red "Unlikely", all 4.7:1 or better; a line under an answer names the size when the sizes
    differ - "The 352 sq ft studio" - and the form a guest-house city allows - "As a guest house
    or for household staff, without a kitchen", from the sheet's *Family/guest wording* column), the notes, the fine
    print and the two buttons (their form opens in that column); on the trailing side (about 58%
    from 1200 px, half between 900 and 1199 px) the site plan with its key and caption. The plan
    stays in view (sticky) beside an open waitlist / call form. Below 900 px it stacks: the
    answer, the picture, the buttons. An Unlikely result (no picture), "Did you mean",
    out-of-area and not-found are one centred column.
  * The site plan is shaped to its space, not to the lot (`drawCustFig`, `drawLot` `opts.aspect`):
    square on a phone, 4:3 when stacked on a tablet, and in two columns as tall as the answer
    column beside it (between 3:4 and 4:3), so the card is about one screen tall (727 px at
    1440 x 900, 720 at 1280 x 800, 697 at 1024 x 768 on the mock lot). It is drawn again when its
    column's width changes. The view only ever grows around the lot (the lot is never cropped);
    `loadImagery` fetches a square photo wide enough for any shape in `LOT_ASPECT`. The canvas
    is at least as wide as the screen's pixels (devicePixelRatio, 1100-1600 px), so lines and
    labels stay crisp on 2x screens.
  * The unit on the plan is the Sidesuites ADU seen from above, to scale (the 11 x 37 ft footprint the
    fit uses; `drawRoof`): a terracotta (#C26A4A) roof with standing seams down the slope, a darker
    eave along the bottom edge, a 1.5 px ink outline and a soft shadow. Its label is always a cream
    tag beside it (ink on cream, about 14:1 on any photo), the lot line is a white dash over a
    dark band, 2 px wide at every screen size, and the key's swatch is a small copy of the roof.
    Without the aerial photo the plan is drawn on paper: the lot in #F6EEDC with an ink dashed
    line, the buildings on record in grey, and the alt text says "Plan" instead of "Satellite
    view". The staff map keeps its plain orange footprint and its own lot line (its analysis
    view needs the open area and outlines under the unit readable).
  * Three notes are kept because without them the rating could mislead: which lot was checked
    when the address matched loosely; a city whose one-bedroom minimum the 401 sq ft one-bedroom misses
    while the 352 sq ft studio qualifies (City of Miami: 450 sf vs 275 sf for an efficiency); and, in
    unincorporated Miami-Dade when a size can be built, who may
    live in it (`custOwnerNote`: family, guests or a long-term tenant; an owner who lives on the
    property lives in the main house - the County's ADU page, checked 2026-11-07). The fine print
    names the county, not the city, as the reviewer there. The "this address is in X, not Y"
    jurisdiction note stays on the staff map only. Nothing is underlined in any state; words lift 2px and change colour, buttons press
    like Apple's (site.css). Light and dark appearance follow the system setting.
  * The nav's *Check my lot* button and the footer's *Check My Lot* link point at this page
    (`aria-current="page"`). A plain click doesn't reload it (that would wipe the typed address,
    the result and an open waitlist form): with a new address in the box it runs the check,
    otherwise it brings the street box into view and focuses it (`initSamePageLinks`). A check
    already running is just scrolled to; a click with Ctrl/Cmd/Shift (new tab or window) is left
    to the browser.
  * English only for now: a visitor who picked Spanish on the home page (`sidesuite-lang`
    in local storage) or comes with `?lang=es` sees a short note in Spanish with the
    contact email.
  * Out of the area: a Florida ZIP outside Miami-Dade and Broward (Orlando 32801, Tampa,
    West Palm Beach 33401…) gets "Check My Lot covers Miami-Dade and Broward today… Orlando
    is next, then Jacksonville and Tampa" plus the waitlist / call buttons, without a
    county lookup. An address neither county knows gets the same buttons. The lead carries
    the address as typed.
  * `?address=` (or `?a=`): the home page's address field sends visitors to
    `/check-my-lot/?address=<whole address>`. The page puts it in the street box, splits it
    into street / city / zip and runs the check at once. The parameter is then removed from
    the address bar (so no script on the page, such as the lead form's anti-spam check, can
    read it there), and the referrer policy (`strict-origin-when-cross-origin`) means other
    sites (county servers, fonts) only ever get the site's origin as the referrer, never the
    page URL.
  * While a lookup runs it shows a loading screen: the red house mark, solid red inside, with a
    bold money-green "$" bouncing inside it, the sun and moon circling it, a palette-blue sky
    deepening to a starry navy night and back (the staff map keeps its original yellow house,
    cream window and orange coin on the red field). It stays up at least 1.2 s (`MIN_LOADER_MS`) so the animation is seen; with *reduce
    motion* on it is a still picture and the result shows as soon as it is ready. The progress
    text (`#steps`) sits in a `role="status"` region, and the button reads "Checking…"
    (`aria-busy`, `aria-disabled`, with a small activity indicator; it keeps keyboard focus).
  * Under every result there are two buttons: *Join the waitlist* and *Schedule a call*.
    Both open a short form (name, email, phone; the call form also asks for the best days and
    times) that sends the lead, with the address and the result attached, to the same Web3Forms
    inbox as the website's reserve form (`LEADS` at the top of the checker code; subject
    "Sidesuites call request" / "New Sidesuites waitlist sign-up"). Put a Calendly / Google Calendar
    booking link in `BOOKING_URL` and *Schedule a call* opens it instead. The waitlist does not hold a place in line: on a passing
    result the text links to the $999 refundable reservation on the home page (`/#reserve`).
    Once a form is open, the two buttons above it act as a choice: both take the quiet fill and
    the chosen one shows as selected (an ink ring), so the form's own send button is the one red
    button. The form's heading reads "Your details — …" with what happens next.
* The old customer URL `internal/adu-check/` is now a small `noindex` page that forwards
  to `/check-my-lot/`, keeping any `?address=`.
* Source of truth: `source/Sidesuites_ADU_Municipality_Table.xlsx`
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
   "Miami" for an unincorporated lot, for example) the staff map says so.
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
   aerial photo) are laid on a 1 ft grid. The unit (401 sf, tested and drawn with the earlier
   11 × 37 ft footprint until its final outside dimensions are confirmed - Check My Lot never
   prints those dimensions; 352 sf = 11 × 32 ft; the models and the
   brand name are set at the top of the checker code in `MODEL_LIST` / `BRAND`) must fit inside the city's rear /
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
   rates both models side by side - the 401 sf one-bedroom and the 352 sf studio (an
   efficiency in code terms; a city's *Min 1-bedroom ADU sf* applies only to the one-bedroom) -
   e.g. "Likely for both sizes" or "Unlikely for the 401 sf · Likely for the 352 sf" - so there
   is nothing to pick.
7. **Two answers** — every lot is scored twice: **to rent it out** (the steps above: the code
   review asked whether a unit can be rented, so the *Rating cap* and homestead-to-rent apply; a
   row's *Rental only in historic districts* limits renting to those districts - Miami Beach,
   Palm View, rated Likely when the historic-district map can't be read; a lot in one of the row's
   *Staff/servant-quarters-only districts* can't be rented out, and when the district is unknown a
   city whose every ADU district is staff-only can't either - Bal Harbour; *Rental wording on Check
   My Lot* replaces the "it can't be rented out" line where renting depends on the owner - Hialeah,
   owners 55+) and **for family & guests** (the owner's family, guests or household staff live in
   it; it is never rented). The second answer follows the row's *Family/guest use* column:
   * **Same** - the ADU rules of the row apply (districts, lot, size, setbacks) without the rental
     limits. In a *Staff/servant-quarters-only district* the family answer is worded "Only as
     quarters for household staff, such as a live-in nanny or caregiver" and the headline says
     "as quarters for household staff". Every GO city; Miami Beach, North Miami and Fort Lauderdale
     with a family rating cap of Likely (Fort Lauderdale's RS-8, RS-8A and RD-15 are staff-only).
   * **Y / Limited** - a guest house or accessory living quarters with its own rules: *Family/guest
     zoning districts* (blank = any single-family lot), *min lot sf* / *by district*, *min / max
     unit sf*, *max unit % of house*, *kitchen allowed? (Y/N)* (N adds a warning: the unit would go
     in without its kitchen), *min house sf* (Coral Gables' Residential Estate), *rating cap*
     (Limited defaults to Likely) and *wording on Check My Lot* (the short line under the answer).
     Limited (Likely at most) where the code names a detached living-quarters use - a guest house,
     guest cottage, servants' or maid's quarters, accessory apartment or mother-in-law quarters -
     that a one-story unit can meet by right or by a staff permit: Pinecrest, Coral Gables, Bal
     Harbour, Palmetto Bay, Hialeah Gardens, Virginia Gardens, Indian Creek, Hialeah (owners 55+),
     Davie, Parkland, Southwest Ranches, Coral Springs, Cooper City, Weston and unincorporated
     Broward. A lot minimum here is the guest-house rule's own, or a net figure; where the rule
     follows the district alone and the city has no zoning layer, a lower floor stands in (Davie
     20,000 sf).
   * **N** - not allowed for any occupancy (the default for a TOO TOUGH city with the column blank),
     including codes where at most a kitchen-less room might pass on a staff reading, or where a
     board or council decides case by case with no standards (Bay Harbor Islands, Key Biscayne,
     Lauderdale-by-the-Sea, Lazy Lake, North Lauderdale, Sunny Isles Beach, Sunrise, Florida City,
     Pembroke Park, Sea Ranch Lakes). The *Family/guest cap reason* says why, city by city.
   The family/guest answers of the 55 cities that are not GO were researched from each city's code
   and re-checked by a second reader on 2026-11-11; the citations are on the *Sources* sheet.
   *Family/guest cap reason*, *code section*, *notes* and *last verified* are for staff only and
   never reach Check My Lot. An older workbook without these columns still works: family use then
   follows the ADU rules where an ADU is allowed and is not allowed where it is not.

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
     writes the staff map, Check My Lot (with `css/site.css` inlined) and the old-URL
     redirect. Never edit the generated pages by hand. Add `--artifact <file>` to also
     write the staff map without its `<html>/<head>/<body>` wrapper, for a claude.ai Artifact.

Adding a city zoning layer: put its `.../FeatureServer/0` URL and zoning field
name on the *Scoring rules* row. Adding a council feed: put the Legistar client
name (the `xxx` in `xxx.legistar.com`).

## Testing without a scraping service

* `.github/workflows/adu-map-live-test.yml` opens the deployed page in a real
  browser after every GitHub Pages deploy (and on demand) and checks the
  addresses in `tests/addresses.json` against their expected ratings, using the
  live county servers. A second step checks Check My Lot against
  `tests/customer_cases.json` (no internal wording, no list of checks, lot picture unless Unlikely;
  a case can also name `expectText` / `rejectText`, text that must / must not be in the result,
  e.g. the unincorporated Miami-Dade owner note)
  and opens it once with `?address=` to make sure the check starts by itself
  (`AUTORUN`). The run summary shows a pass/fail table and the run's
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
