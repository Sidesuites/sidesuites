"""Build /book/ and /team-login/ from the shared chrome of resources/index.html (nav, footer, scripts).
Run from the repo root: python3 tools/pages/make_pages.py"""
import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
src = (ROOT / 'resources/index.html').read_text(encoding='utf-8')
head_end = src.index('<link rel="stylesheet" href="/css/pages.css">') + len('<link rel="stylesheet" href="/css/pages.css">')
body_start = src.index('<main id="main" tabindex="-1">')
main_end = src.index('</main>') + len('</main>')
head, chrome_top, tail = src[:head_end], src[head_end:body_start], src[main_end:]
# the Resources page marks itself current in the nav/footer: clear that
chrome_top = chrome_top.replace(' aria-current="true"', '')
tail = tail.replace(' aria-current="page"', '')

def page(path, title, desc, extra_head, main, index=True):
    h = head
    h = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', h)
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', h)
    h = re.sub(r'(og:title|twitter:title)" content="[^"]*"', rf'\1" content="{title}"', h)
    h = re.sub(r'(og:description|twitter:description)" content="[^"]*"', rf'\1" content="{desc}"', h)
    h = h.replace('https://sidesuites.com/resources/', f'https://sidesuites.com/{path}/')
    if not index: h = h.replace('<link rel="canonical"', '<meta name="robots" content="noindex, nofollow">\n<link rel="canonical"')
    h += '\n<script src="/js/team-api.js"></script>\n' + extra_head
    out = ROOT / path / 'index.html'; out.parent.mkdir(exist_ok=True)
    out.write_text(h + '\n</head>' + chrome_top.split('</head>', 1)[1] + main + tail, encoding='utf-8')
    print('wrote', out)

for name, path, title, desc, index in [
    ('book', 'book', 'Book a Free Consultation | Sidesuites', 'Book a free 30-minute call with the Sidesuites team. Pick a time that works for you and it goes straight into our calendar.', True),
    ('team', 'team-login', 'Team Login | Sidesuites', 'Sidesuites team area.', False),
]:
    d = pathlib.Path(__file__).parent
    page(path, title, desc, (d / f'{name}.head.html').read_text(encoding='utf-8'), (d / f'{name}.main.html').read_text(encoding='utf-8'), index)
