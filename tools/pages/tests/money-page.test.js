/* Tests for /adu-calculator/ (tools/pages/money.main.html and js/money.js). Run from the repo root:
     node --test tools/pages/tests/*.test.js

   The page carries the default scenario in its HTML, so it reads true before any script runs. These tests hold
   that HTML to the model. Every figure (data-fig), every sentence and bar the script builds (data-v), every row
   that shows or hides (data-show) and every control's starting value (data-k, data-on, data-rng) must be exactly
   what js/money.js makes of SSMoney.compute({}). Change the model and forget the page, and these fail.

   Do not fix a failure by typing figures into the HTML. Rewrite them from the model, then rebuild the page:
     node tools/pages/tests/money-page.test.js --write
     python3 tools/pages/make_pages.py */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../../..');
const M = require(path.join(ROOT, 'js/money-model.js'));
const D = require(path.join(ROOT, 'js/money-data.js'));
const P = require(path.join(ROOT, 'js/money.js'));
const FILE = path.join(ROOT, 'tools/pages/money.main.html');
const BUILT = path.join(ROOT, 'adu-calculator/index.html');

const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[ch]);
const attr = (tag, name) => { const m = tag.match(new RegExp('\\s' + name + '="([^"]*)"')); return m ? m[1] : null; };
const setAttr = (tag, name, v) => attr(tag, name) === null ? tag + ' ' + name + '="' + v + '"' : tag.replace(new RegExp('(\\s' + name + '=")[^"]*(")'), (m, a, b) => a + v + b);
const setFlag = (tag, name, on) => { const t = tag.replace(new RegExp('\\s' + name + '(?=\\s|$)'), ''); return on ? t + ' ' + name : t; };
const hasFlag = (tag, name) => new RegExp('\\s' + name + '(?=\\s|$)').test(tag);

/* What the page must hold for a scenario. Returns the corrected HTML and a list of every hook that differed.
   Hooks are found with patterns, not a parser, so two rules keep them findable (both tested below):
   a data-fig element holds text only, and a data-v element never holds an element of its own tag. */
function fill(html, c) {
  const diffs = [];
  const note = (kind, hook, found, want) => { if (found !== want) diffs.push({ kind, hook, found, want }); };
  // sentences, bars and lists
  html = html.replace(/<([a-z0-9]+)\b([^>]*?\sdata-v="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g, (m, tag, rest, name, inner) => {
    const want = P.view(name, c);
    note('view', 'data-v="' + name + '"', inner, want);
    return '<' + tag + rest + '>' + want + '</' + tag + '>';
  });
  // figures
  html = html.replace(/<([a-z0-9]+)\b([^>]*?\sdata-fig="([^"]+)"[^>]*)>([^<]*)<\/\1>/g, (m, tag, rest, expr, text) => {
    const v = P.val(c, expr), want = v === undefined ? '' : esc(P.fmt(v, attr(rest, 'data-fmt') || 'usd', c));
    note('fig', 'data-fig="' + expr + '"', text, want);
    return '<' + tag + rest + '>' + want + '</' + tag + '>';
  });
  // rows and blocks that apply or do not
  html = html.replace(/<([a-z0-9]+)\b([^>]*?\sdata-show="([^"]+)"[^>]*)>/g, (m, tag, rest, name) => {
    const on = P.show(name, c);
    note('show', 'data-show="' + name + '"', hasFlag(rest, 'hidden') ? 'hidden' : 'shown', on ? 'shown' : 'hidden');
    return '<' + tag + setFlag(rest, 'hidden', !on) + '>';
  });
  // controls
  html = html.replace(/<input\b([^>]*?\sdata-k="([^"]+)"[^>]*)>/g, (m, rest, k) => {
    const type = attr(rest, 'type'), v = P.cur(c, k);
    if (type === 'radio') {
      const on = String(v) === attr(rest, 'value');
      note('control', k + ' radio ' + attr(rest, 'value'), hasFlag(rest, 'checked'), on);
      return '<input' + setFlag(rest, 'checked', on) + '>';
    }
    const want = type === 'range' ? String(v) : P.fieldText(c, k);
    note('control', k + ' ' + type, attr(rest, 'value'), want);
    return '<input' + setAttr(rest, 'value', want) + '>';
  });
  html = html.replace(/<input\b([^>]*?\sdata-on="([^"]+)"[^>]*)>/g, (m, rest, flag) => {
    const on = P.counted(c, flag);
    note('control', 'switch ' + flag, hasFlag(rest, 'checked'), on);
    return '<input' + setFlag(rest, 'checked', on) + '>';
  });
  html = html.replace(/(<select\b[^>]*?\sdata-k="([^"]+)"[^>]*>)([\s\S]*?)(<\/select>)/g, (m, open, k, inner, close) => {
    return open + inner.replace(/<option\b([^>]*)>/g, (o, rest) => {
      const on = attr(rest, 'value') === String(P.cur(c, k));
      note('control', k + ' option ' + attr(rest, 'value'), hasFlag(rest, 'selected'), on);
      return '<option' + setFlag(rest, 'selected', on) + '>';
    }) + close;
  });
  html = html.replace(/<([a-z0-9]+)\b([^>]*?\sdata-rng="([^"]+)"[^>]*)>/g, (m, tag, rest, k) => {
    const want = P.sliderStyle(c, k);
    note('control', 'slider frame ' + k, attr(rest, 'style'), want);
    return '<' + tag + setAttr(rest, 'style', want) + '>';
  });
  html = html.replace(/(<a\b[^>]*?\sdata-u="([^"]+)"[^>]*>)/g, (m, open, key) => {
    note('link', 'data-u="' + key + '"', attr(open.slice(2, -1), 'href'), D.U[key] || '');
    return '<a' + setAttr(open.slice(2, -1), 'href', D.U[key] || '') + '>';
  });
  return { html, diffs };
}

const c0 = P.context(P.blank());
let page = fs.readFileSync(FILE, 'utf8');
if (process.argv.includes('--write')) {
  const out = fill(page, c0);
  fs.writeFileSync(FILE, out.html);
  console.log('money.main.html: ' + out.diffs.length + ' value' + (out.diffs.length === 1 ? '' : 's') + ' rewritten from the model. Now run: python3 tools/pages/make_pages.py');
  page = out.html;
}
const checked = fill(page, c0);
const list = kind => checked.diffs.filter(d => d.kind === kind);
const show = ds => ds.slice(0, 12).map(d => '\n  ' + d.hook + '\n    page:  ' + JSON.stringify(d.found) + '\n    model: ' + JSON.stringify(d.want)).join('') +
  (ds.length > 12 ? '\n  and ' + (ds.length - 12) + ' more' : '') + '\n  Rewrite them: node tools/pages/tests/money-page.test.js --write';
const PLACES = ['mdc', 'mia', 'mdo', 'bro'], USES = ['rent', 'par', 'fam'];
// A spread of scenarios: every place and purpose, as it starts and with everything changed that changes the wording.
function scenarios() {
  const out = [];
  for (const loc of PLACES) for (const use of USES.concat(['down'])) {
    const S = Object.assign(P.blank(), { loc, use });
    out.push(S);
    out.push(Object.assign(P.blank(), { loc, use, per: 'year', set: { pay: 'cash' }, on: { waiver: true, boost: true, school: true, granny: false, dep: true, hoh: true, office: true } }));
    out.push(Object.assign(P.blank(), { loc, use, set: { rent: 1000, down: 0, years: 15, filing: 'single', parents: 2, income: 200000, valuePct: 0 }, on: { waiver: true, dep: true, hoh: true } }));
  }
  return out;
}

test('every figure on the page is the model\'s figure for the default scenario', () => {
  assert.ok((page.match(/data-fig="/g) || []).length > 60, 'the page has lost its figures');
  assert.equal(list('fig').length, 0, 'figures that differ from SSMoney.compute({}):' + show(list('fig')));
});

test('every sentence, bar and list is in the page exactly as js/money.js builds it', () => {
  assert.equal(list('view').length, 0, 'views that differ:' + show(list('view')));
});

test('rows and blocks start shown or hidden as the default scenario needs', () => {
  assert.equal(list('show').length, 0, 'visibility that differs:' + show(list('show')));
});

test('controls start at the model\'s defaults, and links to the data file\'s addresses match it', () => {
  assert.equal(list('control').length, 0, 'controls that differ:' + show(list('control')));
  assert.equal(list('link').length, 0, 'links that differ from SSMoneyData.U:' + show(list('link')));
  for (const m of page.matchAll(/<a\b[^>]*\sdata-u="([^"]+)"/g)) assert.match(D.U[m[1]] || '', /^https:\/\//, 'SSMoneyData.U.' + m[1]);
});

test('the hooks name things that exist', () => {
  const cs = scenarios().map(S => P.context(S));
  for (const m of page.matchAll(/\sdata-fig="([^"]+)"/g)) {
    assert.ok(cs.some(c => P.val(c, m[1]) !== undefined), 'data-fig="' + m[1] + '" names nothing the model returns, in any place or purpose');
  }
  for (const m of page.matchAll(/\sdata-fmt="([^"]+)"/g)) assert.ok(['usd', 'usd-abs', 'usd-per', 'usd-abs-per', 'pct', 'int', 'num', 'text'].includes(m[1]), 'data-fmt="' + m[1] + '"');
  for (const m of page.matchAll(/\sdata-v="([^"]+)"/g)) assert.ok(P.VIEW[m[1]] || /^t-/.test(m[1]) && P.FIELDS[m[1].slice(2)] && P.FIELDS[m[1].slice(2)].tag || /^sws-/.test(m[1]) && P.FLAGS.includes(m[1].slice(4)), 'data-v="' + m[1] + '" is not a view');
  for (const m of page.matchAll(/\sdata-show="([^"]+)"/g)) assert.ok(P.SHOW[m[1]], 'data-show="' + m[1] + '" is not a rule');
  for (const m of page.matchAll(/\sdata-(?:k|rng|reset)="([^"]+)"/g)) assert.ok(P.FIELDS[m[1]] || ['loc', 'use', 'per'].includes(m[1]), 'data-k="' + m[1] + '" is not a control');
  for (const m of page.matchAll(/\sdata-on="([^"]+)"/g)) assert.ok(P.FLAGS.includes(m[1]), 'data-on="' + m[1] + '" is not a saving');
  // every view the script knows is on the page, so none is dead wording
  for (const name of Object.keys(P.VIEW)) assert.ok(page.includes('data-v="' + name + '"'), 'view ' + name + ' is not on the page');
  for (const name of Object.keys(P.SHOW)) assert.ok(page.includes('data-show="' + name + '"') || name === 'cap', 'rule ' + name + ' is not on the page');
});

test('the hooks can be found again: figures hold text only, a view never holds its own tag', () => {
  for (const m of page.matchAll(/<([a-z0-9]+)\b[^>]*?\sdata-fig="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)) assert.ok(!m[3].includes('<'), 'data-fig="' + m[2] + '" holds markup');
  const tags = {};
  for (const m of page.matchAll(/<([a-z0-9]+)\b[^>]*?\sdata-v="([^"]+)"/g)) (tags[m[2]] = tags[m[2]] || new Set()).add(m[1]);
  for (const S of scenarios()) {
    const c = P.context(S);
    // everything else the script reads for a scenario must hold up too: rules, control values, slider frames
    for (const name of Object.keys(P.SHOW)) assert.equal(typeof P.show(name, c), 'boolean', name);
    for (const k of Object.keys(P.FIELDS).concat(['loc', 'use', 'per'])) { P.cur(c, k); if (P.FIELDS[k] && P.FIELDS[k].t !== 'pick') assert.equal(typeof P.fieldText(c, k), 'string', k); }
    for (const m of page.matchAll(/\sdata-rng="([^"]+)"/g)) assert.match(P.sliderStyle(c, m[1]), /^(--[a-z0-9]+:[\d.]+;?)+$/, 'slider frame ' + m[1] + ' for ' + JSON.stringify(S));
    for (const f of P.FLAGS) assert.equal(typeof P.counted(c, f), 'boolean', f);
    for (const name of Object.keys(tags)) {
      const h = P.view(name, c);
      assert.equal(typeof h, 'string', name);
      assert.ok(!/undefined|NaN|\[object/.test(h), 'view ' + name + ' for ' + JSON.stringify(S) + ': ' + h);
      assert.ok(!/data-v=|data-show=/.test(h), 'view ' + name + ' holds another hook');
      for (const tag of tags[name]) assert.ok(!new RegExp('<' + tag + '[\\s>]').test(h), 'view ' + name + ' sits in a <' + tag + '> and holds one: ' + h.slice(0, 120));
      // a figure inside a sentence is the model's figure too
      for (const f of h.matchAll(/data-fig="([^"]+)" data-fmt="([^"]+)">([^<]*)</g)) {
        const v = P.val(c, f[1]);
        assert.notEqual(v, undefined, 'view ' + name + ': ' + f[1] + ' is missing for ' + JSON.stringify(S));
        assert.equal(f[3], esc(P.fmt(v, f[2], c)), 'view ' + name + ': ' + f[1]);
      }
    }
  }
});

test('sliders run over the limits the script enforces, and the places are the model\'s places', () => {
  for (const m of page.matchAll(/<input\b([^>]*?type="range"[^>]*)>/g)) {
    const k = attr(m[1], 'data-k'), f = P.FIELDS[k];
    assert.deepEqual([+attr(m[1], 'min'), +attr(m[1], 'max'), +attr(m[1], 'step')], [f.min, f.max, f.step], 'slider ' + k);
    assert.ok(attr(m[1], 'aria-labelledby'), 'slider ' + k + ' has no visible label');
  }
  const opts = [...page.matchAll(/<option value="([^"]+)"[^>]*>([^<]+)</g)].map(m => [m[1], m[2]]);
  assert.deepEqual(opts, P.PLACES.map(id => [id, M.DATA.LOC[id].name]));
  assert.deepEqual([...page.matchAll(/name="use" value="([^"]+)"/g)].map(m => m[1]), P.USES);
});

test('no number is typed where the model or the directory has it', () => {
  const js = fs.readFileSync(path.join(ROOT, 'js/money.js'), 'utf8');
  assert.doesNotMatch(js, /\b\d{3}[-.]\d{3}[-.]\d{4}\b/, 'a phone number is typed into js/money.js: it must come from SSMoneyData');
  assert.doesNotMatch(js, /https?:\/\/(?!www\.w3\.org)/, 'a link address is typed into js/money.js: it must come from SSMoneyData');
  // in the page, phone numbers and dollar figures sit only where a hook put them
  const bare = fill(page, c0).html
    .replace(/<([a-z0-9]+)\b[^>]*?\sdata-v="[^"]+"[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<([a-z0-9]+)\b[^>]*?\sdata-fig="[^"]+"[^>]*>[^<]*<\/\1>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(bare, /\b\d{3}-\d{3}-\d{4}\b/, 'a phone number is typed into the page');
  const typed = (bare.match(/\$[\d,]+/g) || []).filter(x => !['$1,000', '$100,000'].includes(x));   // "every $1,000 in write-offs", "per $100,000": units, not results
  assert.deepEqual(typed, [], 'dollar figures typed into the page outside data-fig: ' + typed.join(' '));
});

test('a result survives the trip through its link', () => {
  assert.equal(P.writeQuery(P.blank()), '');
  for (const S of scenarios()) {
    const back = P.readQuery(P.writeQuery(P.tidy(S))).S;
    assert.deepEqual(back, P.tidy(S), P.writeQuery(S));
    assert.deepEqual(M.compute(P.context(back).R.input).cost, P.context(S).R.cost);
  }
  const odd = P.readQuery('?loc=nowhere&use=x&rent=abc&down=-5&rate=99&years=7&on=bogus,boost&value=250&%E0%A4%A=1').S;
  assert.deepEqual([odd.loc, odd.use, odd.set.rent, odd.set.years, odd.set.down], ['mdc', 'rent', undefined, undefined, undefined]);
  assert.equal(odd.set.rate, 14, 'a rate past the limit is held at the limit');
  assert.equal(odd.set.valuePct, 100);
  assert.deepEqual(odd.on, { boost: true, granny: false });
  assert.equal(P.readQuery('?loc=bro').has.use, undefined, 'a link that names only the place leaves the purpose to what the visitor chose before');
});

test('there are steps for every place and purpose, with nothing left unfilled', () => {
  for (const loc of PLACES) for (const use of USES) {
    const s = P.stepsFor(P.context(Object.assign(P.blank(), { loc, use })));
    assert.ok(s.steps.length >= 6, loc + ' ' + use);
    for (const [what, why] of s.steps) { assert.ok(what.length > 8 && why.length > 20, loc + ' ' + use + ': ' + what); assert.doesNotMatch(what + why, /[{}]|undefined/); }
    assert.match(s.note, /^Order matters\./);
  }
  assert.match(P.view('steps', P.context(Object.assign(P.blank(), { loc: 'bro', use: 'rent' }))), /80% of the area/);
});

test('what is typed outside its limits is held at the limit, and the page says so in words', () => {
  assert.equal(P.limitText(c0, 'ins', 150), '');
  assert.equal(P.limitText(c0, 'ins', 900), 'Insurance goes up to $600 a month here.');
  assert.equal(P.limitText(c0, 'rent', 200), 'Rent starts at $1,000 a month here.');
  assert.equal(P.limitText(c0, 'emptyWeeks', 40), 'Empty weeks go up to 12 a year here.');
  assert.equal(P.limitText(c0, 'rate', 2), 'The loan rate starts at 4% here.');
  assert.match(P.limitText(c0, 'down', 900000), /^Money down goes up to \$166,379 here, the all-in price\.$/);
});

test('the note counts the estimates that are still ours, and each one has a field', () => {
  const keys = P.estimates(c0);
  for (const k of keys) assert.ok(page.includes('data-v="t-' + k + '"') && page.includes('data-k="' + k + '"'), 'estimate ' + k + ' has no field on the page');
  const mine = P.context(Object.assign(P.blank(), { set: { rent: 2000, ins: 200 } }));
  assert.equal(P.estimates(mine).length, keys.length - 2);
  assert.match(P.view('t-rent', mine), /Yours/);
  assert.match(P.view('note', P.context(Object.assign(P.blank(), { set: Object.fromEntries(keys.map(k => [k, k === 'rate' ? 9 : k === 'emptyWeeks' ? 5 : k === 'valuePct' ? 50 : 12345])) }))), /You have set every number yourself/);
});

test('the page keeps the house rules: no inline styling, no dead links, the brand spelled right', () => {
  const all = page + scenarios().map(S => { const c = P.context(S); return Object.keys(P.VIEW).map(n => P.view(n, c)).join(' '); }).join(' ');
  for (const m of all.matchAll(/\sstyle="([^"]*)"/g)) assert.match(m[1], /^(--[a-z0-9-]+:-?[\d.]+;?)+$/, 'an inline style that is not a number in a custom property: ' + m[1]);
  const ids = new Set([...all.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  for (const m of page.matchAll(/\sid="([^"]+)"/g)) assert.equal(page.split(' id="' + m[1] + '"').length, 2, 'id ' + m[1] + ' is used twice');
  for (const m of all.matchAll(/\shref="([^"]*)"/g)) {
    const h = m[1];
    if (/^#p-[a-z0-9-]+$/.test(h)) assert.ok(D.ITEMS.some(it => 'p-' + it.id === h.slice(1)), h + ' points at a card that is not in the directory');
    else if (h[0] === '#') assert.ok(ids.has(h.slice(1)), 'link to ' + h + ' has no target');
    else if (h[0] === '/') assert.ok(fs.existsSync(path.join(ROOT, h, 'index.html')), 'link to ' + h + ' has no page');
    else assert.match(h, /^(https:\/\/|tel:\+?\d+$|mailto:)/, 'link ' + h);
  }
  for (const m of all.matchAll(/\s(?:for|aria-labelledby|aria-describedby)="([^"]+)"/g)) for (const id of m[1].split(' ')) assert.ok(ids.has(id), 'a label points at #' + id + ', which is not on the page');
  const text = all.replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(text, /\bSidesuite\b(?!s)/, 'the name is Sidesuites');
  assert.doesNotMatch(text, /Learn more|Read more|Click here|utility lines|—|!/i);
  assert.doesNotMatch(page, /target="_blank"(?![^>]*rel="noopener")/, 'a new-tab link without rel="noopener"');
  for (const m of page.matchAll(/<a\b[^>]*target="_blank"[^>]*>([\s\S]*?)<\/a>/g)) assert.match(m[1], /opens in a new tab/, 'a new-tab link that does not say so: ' + m[1]);
});

test('the built page is this page', { skip: !fs.existsSync(BUILT) && 'adu-calculator/index.html is not built yet' }, () => {
  const built = fs.readFileSync(BUILT, 'utf8');
  assert.ok(built.includes(page.trim()), 'adu-calculator/index.html is stale. Rebuild it: python3 tools/pages/make_pages.py');
  for (const f of ['/css/money.css', '/js/money-model.js', '/js/money-data.js', '/js/money.js']) assert.ok(built.includes(f) && fs.existsSync(path.join(ROOT, f)), f);
  assert.ok(!built.includes('team-api.js'), 'the calculator does not need the team script');
  assert.match(built, /<title>ADU Calculator: Cost, Savings and Rental Income, Miami-Dade and Broward \| Sidesuites<\/title>/);
});
