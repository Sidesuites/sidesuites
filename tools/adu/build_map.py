#!/usr/bin/env python3
"""Build the Sidesuite ADU pages from tools/adu/app_template.html.

* internal/adu-map/index.html - the staff targeting map (noindex). One self-contained
  HTML file: the app template, the map geometry (tools/adu/data/geo.json) and the raw
  rows of the ADU spreadsheet (tools/adu/source/Sidesuites_ADU_Municipality_Table.xlsx) are
  embedded at build time. The page parses those rows itself, exactly as it parses a
  spreadsheet you import in the browser, so both update paths behave the same.
* check-my-lot/index.html - Check My Lot, the public address checker (indexable). Same
  template in customer mode, with only what the checker needs: no research narrative,
  sources, notes or cap reasons, no heat-map statistics and no map libraries. The staff-only markup
  (between <!--STAFF--> and <!--/STAFF--> in the template) is left out, and the spreadsheet's code-review
  verdicts (GO / CONDITIONAL / TOO TOUGH) are replaced by neutral codes, so none of the staff wording ships.
  It is a page of the public site: css/site.css (the shared tokens, type, links, buttons, nav, footer and dark
  mode) is inlined into it at the template's /*@SITE_CSS@*/ placeholder, so the page stays one self-contained file.
  Customer-only markup and styles (between <!--CUSTOMER--> and <!--/CUSTOMER-->: the site chrome, the intro, the
  page's own CSS) are left out of the staff map, which therefore looks and works exactly as before.
* internal/adu-check/index.html - a small noindex page that forwards the old customer
  URL (and its query string) to /check-my-lot/.

Usage:
    pip install openpyxl
    python3 tools/adu/build_map.py            # writes all three pages
    python3 tools/adu/build_map.py --out /tmp/map.html --xlsx other.xlsx
"""
import argparse
import datetime as dt
import json
import pathlib
import re
import sys

import openpyxl

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SHEETS = ['Municipality table', 'Scoring rules', 'TOO TOUGH reasons (internal)', 'Neighborhood lookup', 'Sources']
VERDICTS = {'GO', 'CONDITIONAL', 'TOO TOUGH'}
CAPS = {'Highly likely', 'Likely', 'Unlikely'}


def cell(v):
    if isinstance(v, (dt.datetime, dt.date)):
        return v.strftime('%Y-%m-%d')
    return v


def read_sheets(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    out = {}
    for name in SHEETS:
        if name not in wb.sheetnames:
            if name in ('Municipality table', 'Scoring rules'):
                sys.exit(f'error: sheet "{name}" is missing from {path}')
            continue
        rows = [[cell(v) for v in r] for r in wb[name].iter_rows(values_only=True)]
        while rows and not any(v not in (None, '') for v in rows[-1]):
            rows.pop()
        out[name] = rows
    return out


def validate(sheets, geo):
    """Catch the mistakes that would silently break the map."""
    problems = []
    mt = sheets['Municipality table']
    hdr = [str(h or '').lower() for h in mt[0]]
    vcol = next(i for i, h in enumerate(hdr) if h.startswith('13.'))
    names = [r[0] for r in mt[1:] if r and r[0]]
    for r in mt[1:]:
        if r and r[0] and str(r[vcol] or '').strip().upper() not in VERDICTS:
            problems.append(f'{r[0]}: verdict "{r[vcol]}" must be GO, CONDITIONAL or TOO TOUGH')
    rules = sheets['Scoring rules']
    rh = [str(h or '').lower() for h in rules[0]]
    ci, si, ki = rh.index('municipality'), next(i for i, h in enumerate(rh) if h.startswith('slug')), next(i for i, h in enumerate(rh) if h.startswith('rating cap'))
    rnames = {r[ci] for r in rules[1:] if r and r[ci]}
    for n in names:
        if n not in rnames:
            problems.append(f'{n}: no row on "Scoring rules"')
    geo_slugs = {f['properties']['slug'] for f in geo['munis']['features']}
    for r in rules[1:]:
        if not r or not r[ci]:
            continue
        if r[ki] not in CAPS:
            problems.append(f'{r[ci]}: rating cap "{r[ki]}" must be one of {sorted(CAPS)}')
        if r[si] not in geo_slugs:
            problems.append(f'{r[ci]}: slug "{r[si]}" has no boundary on the map (tools/adu/data/geo.json)')
    return problems


# Columns the customer page keeps. Everything else (narrative, sources, notes, cap reasons,
# review dates) stays out of the public page.
CUSTOMER_MT_COLS = ('1. municipality', 'county', '13.')
CUSTOMER_RULE_DROP = ('cap reason', 'scoring notes', 'setback notes', 'legistar', 'extra watch', 'last verified',
                      'family/guest cap reason', 'family/guest code', 'family/guest notes', 'family/guest last verified')
# The customer checker still needs each city's verdict (it gates the rating), but under neutral codes. The template's
# `const V = /*__VERDICTS__*/{...}` line is rewritten to the same codes in the customer page.
CUSTOMER_VERDICT_CODES = {'GO': 'A', 'CONDITIONAL': 'B', 'TOO TOUGH': 'C'}
VERDICTS_JS = re.compile(r"/\*__VERDICTS__\*/\{[^}]*\}")
CUSTOMER_VERDICTS_JS = "{ GO: '%(GO)s', COND: '%(CONDITIONAL)s', TOUGH: '%(TOO TOUGH)s' }" % CUSTOMER_VERDICT_CODES
STAFF_BLOCK = re.compile(r'<!--STAFF-->.*?<!--/STAFF-->', re.S)
CUSTOMER_BLOCK = re.compile(r'<!--CUSTOMER-->.*?<!--/CUSTOMER-->', re.S)
SITE_CSS_MARK = '/*@SITE_CSS@*/'
SITE_CSS = ROOT / 'css' / 'site.css'
# Words that must never appear in Check My Lot (checked after the build; the build fails if one does).
CUSTOMER_FORBIDDEN = re.compile(r"too tough|internal tool|map explorer|batch check|data &(?:amp;)? ?updates|\bCONDITIONAL\b|'GO'", re.I)


def customer_data(data):
    sheets = data['sheets']
    mt = sheets['Municipality table']
    keep = [i for i, h in enumerate(mt[0]) if str(h or '').strip().lower().startswith(CUSTOMER_MT_COLS)]
    vcol = next(i for i, h in enumerate(mt[0]) if str(h or '').strip().lower().startswith('13.'))
    def row(r, header=False):
        out = [r[i] if i < len(r) else None for i in keep]
        if not header and r and r[0]:  # a city row: its verdict under a neutral code (unknown values count as TOO TOUGH, as on the staff map)
            v = str((r[vcol] if vcol < len(r) else '') or '').strip().upper()
            out[keep.index(vcol)] = CUSTOMER_VERDICT_CODES.get(v, CUSTOMER_VERDICT_CODES['TOO TOUGH'])
        return out
    out_sheets = {'Municipality table': [row(mt[0], header=True)] + [row(r) for r in mt[1:]]}
    rules = sheets['Scoring rules']
    rkeep = [i for i, h in enumerate(rules[0]) if not str(h or '').strip().lower().startswith(CUSTOMER_RULE_DROP)]
    out_sheets['Scoring rules'] = [[r[i] if i < len(r) else None for i in rkeep] for r in rules]
    if 'Neighborhood lookup' in sheets:
        out_sheets['Neighborhood lookup'] = [r[:2] for r in sheets['Neighborhood lookup']]
    geo = data['geo']
    munis = {'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'geometry': f['geometry'], 'properties': {k: f['properties'].get(k) for k in ('slug', 'county', 'code', 'municipality')}} for f in geo['munis']['features']]}
    zips = {'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'geometry': None, 'properties': {'zip': f['properties']['zip'], 'county': f['properties']['county']}} for f in geo['zips']['features']]}
    return {'mode': 'customer', 'built': data['built'], 'source_name': '', 'geo': {'munis': munis, 'zips': zips, 'config': geo['config'], 'city_zips': geo['city_zips']}, 'sheets': out_sheets}


HEAD_MARK = '<!--__HEAD__-->'
SITE = 'https://sidesuites.com'
CANONICAL = SITE + '/check-my-lot/'

# Staff map: unlisted, plus the map and spreadsheet libraries.
STAFF_HEAD = """<meta name="robots" content="noindex, nofollow">
<title>Sidesuite ADU Targeting Map</title>
<style>/*__LEAFLET_CSS__*/</style>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>"""

# Check My Lot: public and indexable. No map libraries (the customer view never draws the map).
_TITLE = 'Check My Lot · Sidesuite'
_DESC = ('Free and instant: see if a Sidesuite backyard home fits your lot. Any address in Miami-Dade or Broward. '
         "We check zoning, the lot and the city's rules.")
_LD = json.dumps({'@context': 'https://schema.org', '@type': 'WebApplication', 'name': 'Check My Lot', 'url': CANONICAL,
                  'description': _DESC, 'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any',
                  'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'},
                  'provider': {'@type': 'Organization', 'name': 'Sidesuite', 'url': SITE + '/'}}, ensure_ascii=False)
CUSTOMER_HEAD = f"""<meta name="robots" content="index, follow">
<title>{_TITLE}</title>
<meta name="description" content="{_DESC}">
<link rel="canonical" href="{CANONICAL}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#2B2019" media="(prefers-contrast: more) and (prefers-color-scheme: dark)">
<meta name="theme-color" content="#211912" media="(prefers-contrast: more)">
<meta name="theme-color" content="#2B2019" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#36291F" media="(prefers-color-scheme: dark)">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="icon" type="image/png" sizes="64x64" href="/img/favicon.png">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sidesuite">
<meta property="og:url" content="{CANONICAL}">
<meta property="og:title" content="{_TITLE}">
<meta property="og:description" content="{_DESC}">
<meta property="og:image" content="{SITE}/img/sidesuite-og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="The Sidesuites logo, the lines Neighbors with benefits and Mid-century modern homes, and five color swatches on a walnut panel, beside a Sidesuite in a Florida backyard: wood siding, a terracotta roof and a butter-yellow door, with stepping stones across the lawn and palms all around.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{_TITLE}">
<meta name="twitter:description" content="{_DESC}">
<meta name="twitter:image" content="{SITE}/img/sidesuite-og.jpg">
<meta name="twitter:image:alt" content="The Sidesuites logo, the lines Neighbors with benefits and Mid-century modern homes, and five color swatches on a walnut panel, beside a Sidesuite in a Florida backyard: wood siding, a terracotta roof and a butter-yellow door, with stepping stones across the lawn and palms all around.">
<script type="application/ld+json">{_LD}</script>"""

# The old customer URL (/internal/adu-check/) forwards to /check-my-lot/, keeping ?address=... and #hash.
REDIRECT_PAGE = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>{_TITLE}</title>
<link rel="canonical" href="{CANONICAL}">
<script>location.replace('/check-my-lot/' + location.search + location.hash);</script>
<meta http-equiv="refresh" content="0; url=/check-my-lot/">
<meta name="color-scheme" content="light dark">
<style>body{{margin:0;padding:48px 16px;font:17px/1.55 "DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif;background:#F6EEDC;color:#2B2118;text-align:center}}a{{color:#A8321F;font-weight:700;display:inline-block;min-height:44px;line-height:44px}}@media (prefers-color-scheme:dark){{body{{background:#2B2118;color:#F6EEDC}}a{{color:#F08A6E}}}}</style>
</head>
<body>
<p>Check My Lot has moved. <a href="/check-my-lot/">Go to Check My Lot</a></p>
</body>
</html>
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--xlsx', default=HERE / 'source' / 'Sidesuites_ADU_Municipality_Table.xlsx')
    ap.add_argument('--geo', default=HERE / 'data' / 'geo.json')
    ap.add_argument('--template', default=HERE / 'app_template.html')
    ap.add_argument('--out', default=ROOT / 'internal' / 'adu-map' / 'index.html')
    ap.add_argument('--artifact', default=None, help='also write a copy without the <html>/<head>/<body> wrapper, for publishing as a claude.ai Artifact')
    ap.add_argument('--customer', default=ROOT / 'check-my-lot' / 'index.html', help='Check My Lot, the customer page (rating and lot picture only)')
    ap.add_argument('--redirect', default=ROOT / 'internal' / 'adu-check' / 'index.html', help='old customer URL: a noindex page that forwards to /check-my-lot/')
    args = ap.parse_args()

    xlsx = pathlib.Path(args.xlsx)
    sheets = read_sheets(xlsx)
    geo = json.loads(pathlib.Path(args.geo).read_text())
    problems = validate(sheets, geo)
    for p in problems:
        print('warning:', p, file=sys.stderr)

    data = {'built': dt.date.today().isoformat(), 'source_name': xlsx.name, 'geo': geo, 'sheets': sheets}
    tpl = pathlib.Path(args.template).read_text()
    if '/*__DATA__*/' not in tpl:
        sys.exit('error: template is missing the /*__DATA__*/ placeholder')
    if HEAD_MARK not in tpl:
        sys.exit(f'error: template is missing the {HEAD_MARK} placeholder')
    if tpl.count(SITE_CSS_MARK) != 1 or SITE_CSS_MARK not in ''.join(CUSTOMER_BLOCK.findall(tpl)):
        sys.exit(f'error: template needs exactly one {SITE_CSS_MARK} placeholder, inside a <!--CUSTOMER--> block')
    css = (HERE / 'vendor' / 'leaflet-1.9.4.css').read_text()
    site_css = SITE_CSS.read_text().strip()
    if '</style' in site_css.lower():
        sys.exit(f'error: {SITE_CSS} contains "</style", which would end the inlined <style> early')
    def render(d, head):
        payload = json.dumps(d, separators=(',', ':'), ensure_ascii=False, default=str).replace('<', '\\u003c')
        return tpl.replace(HEAD_MARK, head.replace('/*__LEAFLET_CSS__*/', css), 1).replace('/*__DATA__*/', payload, 1)
    # Staff map: no customer blocks (so no site chrome and no site.css): it renders exactly as before.
    page = CUSTOMER_BLOCK.sub('', render(data, STAFF_HEAD))
    if args.customer:
        cust = pathlib.Path(args.customer); cust.parent.mkdir(parents=True, exist_ok=True)
        c = STAFF_BLOCK.sub('', render(customer_data(data), CUSTOMER_HEAD))
        c = c.replace('<!--CUSTOMER-->', '').replace('<!--/CUSTOMER-->', '')
        c, n = VERDICTS_JS.subn(CUSTOMER_VERDICTS_JS, c, count=1)
        if n != 1:
            sys.exit('error: template is missing the /*__VERDICTS__*/{...} line')
        # The customer look must not depend on JavaScript: write its classes into the page (the tags on their own lines,
        # so text that merely mentions <body>, like a CSS comment, is never touched).
        for tag, cls in (('<html lang="en">', '<html lang="en" class="cust">'), ('<body>', '<body class="customer">')):
            if f'\n{tag}\n' not in c:
                sys.exit(f'error: template is missing the {tag} line')
            c = c.replace(f'\n{tag}\n', f'\n{cls}\n', 1)
        # Like every other site page, Check My Lot draws under the notch and lets site.css's safe-area gutters keep the
        # content clear (the staff map keeps the plain viewport; the artifact build expects the plain one too).
        vp = '\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        if c.count(vp) != 1:
            sys.exit('error: template is missing its viewport meta line')
        c = c.replace(vp, '\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n', 1)
        # Last: the site's shared CSS. The payload is escaped (no '<'), so the only placeholder left is the template's.
        c = c.replace(SITE_CSS_MARK, '\n' + site_css + '\n', 1)
        bad = sorted({m.group(0) for m in CUSTOMER_FORBIDDEN.finditer(c)})
        if bad:
            sys.exit(f'error: staff wording would ship in Check My Lot: {bad} (mark the block <!--STAFF--> ... <!--/STAFF--> in the template)')
        cust.write_text(c)
        print(f'wrote {cust} ({cust.stat().st_size / 1e6:.2f} MB, Check My Lot)')
    if args.redirect:
        red = pathlib.Path(args.redirect); red.parent.mkdir(parents=True, exist_ok=True)
        red.write_text(REDIRECT_PAGE)
        print(f'wrote {red} (redirect to {CANONICAL})')
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page)
    if args.artifact:
        # The Artifact host wraps the file in its own doctype/head/body.
        body = page
        for tag in ('<!doctype html>\n', '<html lang="en">\n', '<head>\n', '<meta charset="utf-8">\n',
                    '<meta name="viewport" content="width=device-width, initial-scale=1">\n', '</head>\n', '<body>\n', '</body>\n', '</html>\n'):
            assert tag in body, tag
            body = body.replace(tag, '', 1)
        pathlib.Path(args.artifact).parent.mkdir(parents=True, exist_ok=True)
        pathlib.Path(args.artifact).write_text(body)
        print(f'wrote {args.artifact}')
    n = len([r for r in sheets['Municipality table'][1:] if r and r[0]])
    print(f'wrote {out} ({out.stat().st_size / 1e6:.2f} MB, {n} jurisdictions, {len(problems)} warnings)')


if __name__ == '__main__':
    main()
