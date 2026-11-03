#!/usr/bin/env python3
"""Build the Tooly ADU targeting map (internal/adu-map/index.html).

The page is one self-contained HTML file: the app template, the map geometry
(tools/adu/data/geo.json) and the raw rows of the ADU spreadsheet
(tools/adu/source/Tooly_ADU_Municipality_Table.xlsx) are embedded at build time.
The page parses those rows itself, exactly as it parses a spreadsheet you
import in the browser, so both update paths behave the same.

Usage:
    pip install openpyxl
    python3 tools/adu/build_map.py            # writes internal/adu-map/index.html
    python3 tools/adu/build_map.py --out /tmp/map.html --xlsx other.xlsx
"""
import argparse
import datetime as dt
import json
import pathlib
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


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--xlsx', default=HERE / 'source' / 'Tooly_ADU_Municipality_Table.xlsx')
    ap.add_argument('--geo', default=HERE / 'data' / 'geo.json')
    ap.add_argument('--template', default=HERE / 'app_template.html')
    ap.add_argument('--out', default=ROOT / 'internal' / 'adu-map' / 'index.html')
    ap.add_argument('--artifact', default=None, help='also write a copy without the <html>/<head>/<body> wrapper, for publishing as a claude.ai Artifact')
    args = ap.parse_args()

    xlsx = pathlib.Path(args.xlsx)
    sheets = read_sheets(xlsx)
    geo = json.loads(pathlib.Path(args.geo).read_text())
    problems = validate(sheets, geo)
    for p in problems:
        print('warning:', p, file=sys.stderr)

    data = {'built': dt.date.today().isoformat(), 'source_name': xlsx.name, 'geo': geo, 'sheets': sheets}
    payload = json.dumps(data, separators=(',', ':'), ensure_ascii=False, default=str).replace('<', '\\u003c')
    tpl = pathlib.Path(args.template).read_text()
    if '/*__DATA__*/' not in tpl:
        sys.exit('error: template is missing the /*__DATA__*/ placeholder')
    css = (HERE / 'vendor' / 'leaflet-1.9.4.css').read_text()
    page = tpl.replace('/*__LEAFLET_CSS__*/', css).replace('/*__DATA__*/', payload)
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
