"""Build /book/, /team-login/ and /adu-calculator/ from the shared chrome of resources/index.html (nav, footer, scripts).
Run from the repo root: python3 tools/pages/make_pages.py
Name one or more pages to build only those: python3 tools/pages/make_pages.py adu-calculator"""
import re, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[2]
src = (ROOT / 'resources/index.html').read_text(encoding='utf-8')
head_end = src.index('<link rel="stylesheet" href="/css/pages.css">') + len('<link rel="stylesheet" href="/css/pages.css">')
body_start = src.index('<main id="main" tabindex="-1">')
main_end = src.index('</main>') + len('</main>')
head, chrome_top, tail = src[:head_end], src[head_end:body_start], src[main_end:]
# the Resources page marks itself current in the nav/footer: clear that
chrome_top = chrome_top.replace(' aria-current="true"', '')
tail = tail.replace(' aria-current="page"', '')

def page(path, title, desc, extra_head, main, index=True, team_api=True, circles=True, footer_current=False):
    """team_api=False leaves /js/team-api.js off a page that never talks to the team backend.
    circles=False leaves /js/circles.js off, so the closing card's shapes sit still (a page where nothing moves on scroll).
    footer_current=True marks the page's own link in the footer as the current page."""
    h = head
    h = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', h)
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', h)
    h = re.sub(r'(og:title|twitter:title)" content="[^"]*"', rf'\1" content="{title}"', h)
    h = re.sub(r'(og:description|twitter:description)" content="[^"]*"', rf'\1" content="{desc}"', h)
    h = h.replace('https://sidesuites.com/resources/', f'https://sidesuites.com/{path}/')
    if not index: h = h.replace('<link rel="canonical"', '<meta name="robots" content="noindex, nofollow">\n<link rel="canonical"')
    if not circles: h = h.replace('<script src="/js/circles.js" defer></script>\n', '')
    h += ('\n<script src="/js/team-api.js"></script>' if team_api else '') + '\n' + extra_head
    t = tail.replace(f'<a href="/{path}/">', f'<a href="/{path}/" aria-current="page">') if footer_current else tail
    out = ROOT / path / 'index.html'; out.parent.mkdir(exist_ok=True)
    out.write_text(h + '\n</head>' + chrome_top.split('</head>', 1)[1] + main + t, encoding='utf-8')
    print('wrote', out)

# name of the .head.html / .main.html pair, folder, title, description, then the options of page()
PAGES = [
    ('book', 'book', 'Book a Free Consultation | Sidesuites', 'Book a free 30-minute call with the Sidesuites team. Pick a time that works for you and it goes straight into our calendar.', {}),
    ('team', 'team-login', 'Team Login | Sidesuites', 'Sidesuites team area.', {'index': False}),
    # Run My Numbers. Its figures come from js/money-model.js: after a change there, first run
    # node tools/pages/tests/money-page.test.js --write
    ('money', 'adu-calculator', 'ADU Calculator: Cost, Savings and Rental Income, Miami-Dade and Broward | Sidesuites',
     'What a $99,999 Sidesuites ADU costs up front, what it saves and what it leaves each month, for a lot in Miami-Dade or Broward.',
     {'team_api': False, 'circles': False, 'footer_current': True}),
]
only = set(sys.argv[1:])
unknown = only - {p[1] for p in PAGES}
if unknown: sys.exit('no such page: ' + ', '.join(sorted(unknown)))
for name, path, title, desc, opts in PAGES:
    if only and path not in only: continue
    d = pathlib.Path(__file__).parent
    page(path, title, desc, (d / f'{name}.head.html').read_text(encoding='utf-8'), (d / f'{name}.main.html').read_text(encoding='utf-8'), **opts)
