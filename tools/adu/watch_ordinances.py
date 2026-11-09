#!/usr/bin/env python3
"""Weekly watch for ADU ordinance changes in Miami-Dade and Broward.

Three signals, all driven by tools/adu/source/Tooly_ADU_Municipality_Table.xlsx:

1. Council agendas - for each city with a "Legistar client" on the Scoring rules
   sheet, asks the public Legistar Web API for matters whose title mentions
   accessory dwellings / ADUs / guest houses that were created or modified since
   the last run.
2. Watched pages - every URL on the Sources sheet, each city's code link and any
   "Extra watch URLs" are fetched; the sentences that mention ADU keywords are
   fingerprinted. A change in those sentences (or in a PDF's bytes) is reported.
   JavaScript-only code viewers (Municode, Gridics, American Legal) can't be read
   this way and are skipped - Legistar and the review-date check cover them.
3. Review dates - rows whose "Last verified" date is older than --review-days.

Results go to a Markdown report (and, in GitHub Actions, an issue). State lives
in tools/adu/data/watch_state.json so each run only reports what is new.

Usage:  python3 tools/adu/watch_ordinances.py [--report report.md] [--max-urls N]
"""
import argparse
import datetime as dt
import hashlib
import html
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import openpyxl

HERE = pathlib.Path(__file__).resolve().parent
UA = 'SidesuitesADUWatch/1.0 (+https://sidesuites.com; ordinance change monitor)'
KEYWORDS = re.compile(r'accessory\s+dwelling|\bADUs?\b|granny\s+flat|guest\s*house|garage\s+apartment|ancillary\s+(unit|dwelling)|accessory\s+(unit|apartment|quarters)|second(ary)?\s+(dwelling\s+)?unit', re.I)
SKIP_HOSTS = {'library.municode.com', 'codehub.gridics.com', 'codelibrary.amlegal.com', 'webapi.legistar.com', 'api.municode.com'}
LEGISTAR_TERMS = ['ccessory dwelling', 'ccessory Dwelling', 'ADU', 'uest house', 'uesthouse', 'ranny', 'ncillary']


def fetch(url, timeout=25, max_bytes=4_000_000):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.headers.get('Content-Type', ''), r.read(max_bytes)


def keyword_sentences(raw, ctype):
    """Return the sorted, de-duplicated sentences that mention ADU keywords."""
    text = raw.decode('utf-8', 'ignore')
    if 'html' in ctype or text.lstrip()[:1] == '<':
        text = re.sub(r'(?is)<(script|style|noscript|svg)\b.*?</\1>', ' ', text)
        text = re.sub(r'(?s)<[^>]+>', ' ', text)
        text = html.unescape(text)
    text = re.sub(r'\s+', ' ', text)
    sents = re.split(r'(?<=[.;:])\s+(?=[A-Z(])', text)
    return sorted({s.strip()[:400] for s in sents if KEYWORDS.search(s) and len(s) > 25})


def load_workbook(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    mt = list(wb['Municipality table'].iter_rows(values_only=True))
    hdr = [str(h or '').lower() for h in mt[0]]
    c_url = next(i for i, h in enumerate(hdr) if h.startswith('3a.'))
    c_verdict = next(i for i, h in enumerate(hdr) if h.startswith('13.'))
    munis = {r[0]: {'verdict': r[c_verdict], 'urls': [r[c_url]] if r[c_url] else []} for r in mt[1:] if r[0]}
    rs = list(wb['Scoring rules'].iter_rows(values_only=True))
    rh = [str(h or '').lower() for h in rs[0]]
    col = lambda p: next(i for i, h in enumerate(rh) if h.startswith(p))
    c_leg, c_watch, c_ver = col('legistar'), col('extra watch'), col('last verified')
    for r in rs[1:]:
        if not r[0] or r[0] not in munis:
            continue
        m = munis[r[0]]
        m['legistar'] = (r[c_leg] or '').strip()
        m['urls'] += [u.strip() for u in re.split(r'[,\s]+', r[c_watch] or '') if u.strip().startswith('http')]
        v = r[c_ver]
        m['verified'] = v.date() if isinstance(v, dt.datetime) else v if isinstance(v, dt.date) else None
    if 'Sources' in wb.sheetnames:
        for r in list(wb['Sources'].iter_rows(values_only=True))[1:]:
            if r[0] in munis and r[2] and str(r[2]).startswith('http'):
                munis[r[0]]['urls'].append(r[2].strip())
    for m in munis.values():
        m['urls'] = list(dict.fromkeys(m['urls']))
    return munis


def legistar_new(client, since):
    terms = ' or '.join(f"substringof('{t}',MatterTitle)" for t in LEGISTAR_TERMS)
    q = urllib.parse.urlencode({'$filter': f"MatterLastModifiedUtc ge datetime'{since}' and ({terms})", '$orderby': 'MatterLastModifiedUtc desc', '$top': '50'})
    req = urllib.request.Request(f'https://webapi.legistar.com/v1/{client}/matters?{q}', headers={'User-Agent': UA, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode('utf-8'))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--xlsx', default=HERE / 'source' / 'Tooly_ADU_Municipality_Table.xlsx')
    ap.add_argument('--state', default=HERE / 'data' / 'watch_state.json')
    ap.add_argument('--report', default=None, help='write the Markdown report here (always printed too)')
    ap.add_argument('--review-days', type=int, default=120)
    ap.add_argument('--max-urls', type=int, default=0, help='limit pages fetched (0 = all); for quick tests')
    ap.add_argument('--delay', type=float, default=1.0, help='seconds between page fetches')
    args = ap.parse_args()

    today = dt.date.today()
    munis = load_workbook(args.xlsx)
    state_path = pathlib.Path(args.state)
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    pages, leg_state = state.setdefault('pages', {}), state.setdefault('legistar', {})
    first_run = not pages
    out = {'legistar': [], 'pages': [], 'stale': [], 'errors': []}

    # 1. Legistar
    for name, m in munis.items():
        client = m.get('legistar')
        if not client:
            continue
        since = leg_state.get(client, {}).get('last') or (m.get('verified') or today - dt.timedelta(days=365)).isoformat()
        try:
            seen = set(leg_state.get(client, {}).get('seen', []))
            for it in legistar_new(client, since):
                key = f"{it.get('MatterId')}:{it.get('MatterLastModifiedUtc')}"
                if key in seen:
                    continue
                seen.add(key)
                out['legistar'].append({'city': name, 'file': it.get('MatterFile'), 'status': it.get('MatterStatusName'), 'title': (it.get('MatterTitle') or '')[:400],
                                        'modified': (it.get('MatterLastModifiedUtc') or '')[:10], 'url': f'https://{client}.legistar.com/LegislationDetail.aspx?ID={it.get("MatterId")}&GUID={it.get("MatterGuid")}'})
            leg_state[client] = {'last': today.isoformat(), 'seen': sorted(seen)[-300:]}
        except Exception as e:  # noqa: BLE001 - report and keep going
            out['errors'].append(f'Legistar {client} ({name}): {e}')

    # 2. Watched pages
    todo = [(name, u) for name, m in munis.items() for u in m['urls'] if urllib.parse.urlparse(u).netloc not in SKIP_HOSTS]
    if args.max_urls:
        todo = todo[:args.max_urls]
    for i, (name, url) in enumerate(todo):
        prev = pages.get(url)
        try:
            ctype, raw = fetch(url)
            if 'pdf' in ctype or raw[:5] == b'%PDF-' or 'officedocument' in ctype:
                fp, sents = hashlib.sha256(raw).hexdigest(), None
            else:
                sents = keyword_sentences(raw, ctype)
                fp = hashlib.sha256('\n'.join(sents).encode()).hexdigest()
            if prev and prev.get('hash') and prev['hash'] != fp:
                old = set(prev.get('sents') or [])
                added = [s for s in (sents or []) if s not in old][:5]
                removed = [s for s in old if s not in set(sents or [])][:5]
                out['pages'].append({'city': name, 'url': url, 'added': added, 'removed': removed, 'binary': sents is None})
            pages[url] = {'city': name, 'hash': fp, 'checked': today.isoformat(), 'sents': (sents or [])[:60], 'status': 'ok'}
        except (urllib.error.URLError, TimeoutError, ConnectionError, ValueError) as e:
            pages.setdefault(url, {'city': name})['status'] = f'error: {getattr(e, "code", "") or e}'[:120]
            pages[url]['checked'] = today.isoformat()
        if args.delay and i < len(todo) - 1:
            time.sleep(args.delay)

    # 3. Review dates
    for name, m in munis.items():
        v = m.get('verified')
        if not v or (today - v).days > args.review_days:
            out['stale'].append((name, m['verdict'], v.isoformat() if v else 'never'))

    state['last_run'] = today.isoformat()
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps(state, indent=1, sort_keys=True))

    # Report
    n_err = sum(1 for p in pages.values() if str(p.get('status', '')).startswith('error'))
    lines = [f'# ADU ordinance watch - {today.isoformat()}', '']
    if first_run:
        lines += [f'First run: recorded a baseline for {len(pages)} pages. Page changes are reported from the next run on.', '']
    if out['legistar']:
        lines += ['## New or updated council items', '']
        lines += [f"- **{x['city']}** - {x['file'] or ''} ({x['status']}, modified {x['modified']}): {x['title']} [open]({x['url']})" for x in out['legistar']] + ['']
    if out['pages']:
        lines += ['## Watched pages whose ADU text changed', '']
        for x in out['pages']:
            lines.append(f"- **{x['city']}** - <{x['url']}>" + (' (file changed)' if x['binary'] else ''))
            lines += [f'  - added: "{s[:220]}"' for s in x['added']] + [f'  - removed: "{s[:220]}"' for s in x['removed']]
        lines.append('')
    if out['stale']:
        lines += [f'## Rows past the {args.review_days}-day review date', ''] + [f'- {n} ({v}) - last verified {d}' for n, v, d in out['stale']] + ['']
    if out['errors']:
        lines += ['## Errors', ''] + [f'- {e}' for e in out['errors']] + ['']
    lines += ['---', f'{len(todo)} pages checked ({n_err} unreachable or blocked; see tools/adu/data/watch_state.json). '
              'To act on a change: re-read the code, update the row on "Municipality table" and "Scoring rules", set "Last verified", '
              'commit the spreadsheet and run tools/adu/build_map.py (or import it in the map).']
    report = '\n'.join(lines)
    print(report)
    if args.report:
        pathlib.Path(args.report).write_text(report)
    findings = len(out['legistar']) + len(out['pages']) + len(out['stale'])
    print(f'\nfindings={findings}', file=sys.stderr)
    gh_out = __import__('os').environ.get('GITHUB_OUTPUT')
    if gh_out:
        with open(gh_out, 'a') as f:
            f.write(f'findings={findings}\nlegistar={len(out["legistar"])}\npages={len(out["pages"])}\nstale={len(out["stale"])}\n')


if __name__ == '__main__':
    main()
