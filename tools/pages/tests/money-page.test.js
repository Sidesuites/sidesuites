/* Tests for /adu-calculator/ (tools/pages/money.main.html and js/money.js). Run from the repo root:
     node --test tools/pages/tests/*.test.js

   The page carries the default scenario in its HTML, so it reads true before any script runs. These tests hold
   that HTML to the model. Every figure (data-fig), every sentence and bar the script builds (data-v), every row
   that shows or hides (data-show) and every control's starting value (data-k, data-on, data-rng) must be exactly
   what js/money.js makes of SSMoney.compute({}). Change the model and forget the page, and these fail.

   Do not fix a failure by typing figures into the HTML. Rewrite them from the model, then rebuild the page:
     node tools/pages/tests/money-page.test.js --write
     python3 tools/pages/make_pages.py adu-calculator */
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
const usd = n => '$' + Math.round(n).toLocaleString('en-US');
const attr = (tag, name) => { const m = tag.match(new RegExp('\\s' + name + '="([^"]*)"')); return m ? m[1] : null; };
const setAttr = (tag, name, v) => attr(tag, name) === null ? tag + ' ' + name + '="' + v + '"' : tag.replace(new RegExp('(\\s' + name + '=")[^"]*(")'), (m, a, b) => a + v + b);
const setFlag = (tag, name, on) => { const t = tag.replace(new RegExp('\\s' + name + '(?=\\s|$)'), ''); return on ? t + ' ' + name : t; };
const hasFlag = (tag, name) => new RegExp('\\s' + name + '(?=\\s|$)').test(tag);
const state = o => Object.assign(P.blank(), o);
const ctx = o => P.context(state(o));

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
  console.log('money.main.html: ' + out.diffs.length + ' value' + (out.diffs.length === 1 ? '' : 's') + ' rewritten from the model. Now run: python3 tools/pages/make_pages.py adu-calculator');
  page = out.html;
}
const checked = fill(page, c0);
const list = kind => checked.diffs.filter(d => d.kind === kind);
const show = ds => ds.slice(0, 12).map(d => '\n  ' + d.hook + '\n    page:  ' + JSON.stringify(d.found) + '\n    model: ' + JSON.stringify(d.want)).join('') +
  (ds.length > 12 ? '\n  and ' + (ds.length - 12) + ' more' : '') + '\n  Rewrite them: node tools/pages/tests/money-page.test.js --write';
const PLACES = ['mdc', 'mia', 'mdo', 'bro'], USES = ['rent', 'par', 'fam', 'off'], HOMES = Object.keys(M.DATA.PLANS);
// A spread of scenarios: every place and purpose, as it starts and with everything changed that changes the wording.
function scenarios() {
  const out = [];
  for (const loc of PLACES) for (const use of USES.concat(['down'])) {
    out.push(state({ loc, use }));
    out.push(state({ loc, use, plan: loc === 'mia' ? 'one' : 'eff' }));
    out.push(state({ loc, use, per: 'year', set: { pay: 'cash' }, on: { waiver: true, parfee: false, boost: true, granny: false, dep: true, hoh: true, office: false } }));
    out.push(state({ loc, use, set: { rent: 1000, down: 0, years: 15, filing: 'single', parents: 2, income: 200000, valueMultiple: 6, fees: 12000, exemptAmt: 9000 }, on: { waiver: true, dep: true, hoh: true } }));
    out.push(state({ loc, use, set: { rent: 3200, down: 100000, fees: 0 }, on: { waiver: true } }));
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
  for (const m of page.matchAll(/\sdata-fmt="([^"]+)"/g)) assert.ok(['usd', 'usd-abs', 'usd-per', 'usd-abs-per', 'usd-k', 'usd-h', 'usd-t', 'pct', 'int', 'num', 'text'].includes(m[1]), 'data-fmt="' + m[1] + '"');
  for (const m of page.matchAll(/\sdata-v="([^"]+)"/g)) assert.ok(P.VIEW[m[1]] || /^t-/.test(m[1]) && P.FIELDS[m[1].slice(2)] && P.FIELDS[m[1].slice(2)].tag || /^sws-/.test(m[1]) && P.SWITCHES.includes(m[1].slice(4)), 'data-v="' + m[1] + '" is not a view');
  for (const m of page.matchAll(/\sdata-show="([^"]+)"/g)) assert.ok(P.SHOW[m[1]], 'data-show="' + m[1] + '" is not a rule');
  for (const m of page.matchAll(/\sdata-(?:k|rng|reset)="([^"]+)"/g)) assert.ok(P.FIELDS[m[1]] || P.PICKS.includes(m[1]), 'data-k="' + m[1] + '" is not a control');
  for (const m of page.matchAll(/\sdata-on="([^"]+)"/g)) assert.ok(P.SWITCHES.includes(m[1]), 'data-on="' + m[1] + '" is not a saving');
  // every view and every rule the script knows is on the page, so none is dead wording
  for (const name of Object.keys(P.VIEW)) assert.ok(page.includes('data-v="' + name + '"'), 'view ' + name + ' is not on the page');
  for (const name of Object.keys(P.SHOW)) assert.ok(page.includes('data-show="' + name + '"'), 'rule ' + name + ' is not on the page');
});

test('the hooks can be found again: figures hold text only, a view never holds its own tag', () => {
  for (const m of page.matchAll(/<([a-z0-9]+)\b[^>]*?\sdata-fig="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)) assert.ok(!m[3].includes('<'), 'data-fig="' + m[2] + '" holds markup');
  const tags = {};
  for (const m of page.matchAll(/<([a-z0-9]+)\b[^>]*?\sdata-v="([^"]+)"/g)) (tags[m[2]] = tags[m[2]] || new Set()).add(m[1]);
  for (const S of scenarios()) {
    const c = P.context(S);
    // everything else the script reads for a scenario must hold up too: rules, control values, slider frames
    for (const name of Object.keys(P.SHOW)) assert.equal(typeof P.show(name, c), 'boolean', name);
    for (const k of Object.keys(P.FIELDS).concat(P.PICKS)) { P.cur(c, k); if (P.FIELDS[k] && P.FIELDS[k].t !== 'pick') assert.equal(typeof P.fieldText(c, k), 'string', k); }
    for (const m of page.matchAll(/\sdata-rng="([^"]+)"/g)) assert.match(P.sliderStyle(c, m[1]), /^(--[a-z0-9]+:[\d.]+;?)+$/, 'slider frame ' + m[1] + ' for ' + JSON.stringify(S));
    for (const f of P.SWITCHES) assert.equal(typeof P.counted(c, f), 'boolean', f);
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

test('sliders run over the limits the script enforces, and the places, homes and purposes are the model\'s', () => {
  for (const m of page.matchAll(/<input\b([^>]*?type="range"[^>]*)>/g)) {
    const k = attr(m[1], 'data-k'), f = P.FIELDS[k];
    assert.deepEqual([+attr(m[1], 'min'), +attr(m[1], 'max'), +attr(m[1], 'step')], [f.min, f.max, f.step], 'slider ' + k);
    assert.ok(attr(m[1], 'aria-labelledby'), 'slider ' + k + ' has no visible label');
  }
  const opts = [...page.matchAll(/<option value="([^"]+)"[^>]*>([^<]+)</g)].map(m => [m[1], m[2]]);
  assert.deepEqual(opts, P.PLACES.map(id => [id, M.DATA.LOC[id].name]));
  assert.deepEqual([...page.matchAll(/name="use" value="([^"]+)"/g)].map(m => m[1]), P.USES);
  assert.deepEqual([...page.matchAll(/name="plan" value="([^"]+)"/g)].map(m => m[1]), HOMES);
  assert.deepEqual(P.USES.filter(u => u !== 'down'), M.DATA.USES, 'every purpose the model prices has a tile, and Downsize has none of its numbers');
  assert.deepEqual([P.FIELDS.valueMultiple.min, P.FIELDS.valueMultiple.max], [M.DATA.VALUE.multipleMin, M.DATA.VALUE.multipleMax]);
});

test('no number is typed where the model or the directory has it', () => {
  const js = fs.readFileSync(path.join(ROOT, 'js/money.js'), 'utf8');
  assert.doesNotMatch(js, /\b\d{3}[-.]\d{3}[-.]\d{4}\b/, 'a phone number is typed into js/money.js: it must come from SSMoneyData');
  assert.doesNotMatch(js, /https?:\/\/(?!www\.w3\.org)/, 'a link address is typed into js/money.js: it must come from SSMoneyData');
  for (const p of HOMES) assert.ok(!js.includes(usd(M.DATA.PLANS[p].price).slice(1)), 'the price of a home is typed into js/money.js');
  /* Dollar figures in the script's own sentences (its comments aside). The model and the directory hold every
     figure. The script may type a unit ("every $1,000 in write-offs", "per $100,000") and three published rules that
     neither file holds as a number: the City of Miami's own impact fees (about $8,100), Broward's county road fee
     ($0) and the income test for a dependent parent ($5,500). Anything else, such as a gift limit that moves every
     year, is read from the model or left to its card in the directory. */
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
  const dollars = [...new Set(code.match(/\$\d[\d,]*(?![\d,&])/g) || [])].sort();
  assert.deepEqual(dollars, ['$0', '$1,000', '$100,000', '$5,500', '$8,100'], 'a dollar figure is typed into js/money.js: ' + dollars.join(' '));
  // the parents' step names no gift limit: it sends the reader to the card that holds this year's
  const gift = P.view('steps', ctx({ use: 'par' }));
  assert.ok(!/\$\d/.test(gift.split('</li>')[1]) && gift.includes('A gift over the yearly limit needs a tax form') && gift.includes('<a href="#p-parentmoney">'), gift.split('</li>')[1]);
  assert.match(D.ITEMS.find(it => it.id === 'parentmoney').who, /\$[\d,]+ in \d{4}/, 'the card the step points to holds the gift limit');
  // in the page, phone numbers and dollar figures sit only where a hook put them
  const bare = fill(page, c0).html
    .replace(/<([a-z0-9]+)\b[^>]*?\sdata-v="[^"]+"[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<([a-z0-9]+)\b[^>]*?\sdata-fig="[^"]+"[^>]*>[^<]*<\/\1>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(bare, /\b\d{3}-\d{3}-\d{4}\b/, 'a phone number is typed into the page');
  /* Units and published rules, not results: "every $1,000 in write-offs", "per $100,000", the simple method's
     $5 a square foot, and the fact-check's "$50 to $60 a month" for water and sewer on a shared meter. */
  const typed = (bare.match(/\$\d[\d,]*\d|\$\d/g) || []).filter(x => !['$1,000', '$100,000', '$5', '$50', '$60'].includes(x));
  assert.deepEqual(typed, [], 'dollar figures typed into the page outside data-fig: ' + typed.join(' '));
});

test('a result survives the trip through its link', () => {
  assert.equal(P.writeQuery(P.blank()), '');
  for (const S of scenarios()) {
    const back = P.readQuery(P.writeQuery(P.tidy(S))).S;
    assert.deepEqual(back, P.tidy(S), P.writeQuery(S));
    assert.deepEqual(M.compute(P.context(back).R.input).cost, P.context(S).R.cost);
  }
  const odd = P.readQuery('?loc=nowhere&use=x&plan=big&rent=abc&down=-5&rate=99&years=7&on=bogus,boost&off=granny&times=250&%E0%A4%A=1').S;
  assert.deepEqual([odd.loc, odd.use, odd.plan, odd.set.rent, odd.set.years, odd.set.down], ['mdc', 'rent', null, undefined, undefined, undefined]);
  assert.equal(odd.set.rate, 14, 'a rate past the limit is held at the limit');
  assert.equal(odd.set.valueMultiple, M.DATA.VALUE.multipleMax);
  assert.deepEqual(odd.on, { boost: true, granny: false });
  assert.equal(P.readQuery('?loc=bro').has.use, undefined, 'a link that names only the place leaves the purpose to what the visitor chose before');
  // a switch left where it starts is not in the link, so a link made today keeps the defaults of tomorrow
  assert.equal(P.writeQuery(state({ use: 'par' })), '?loc=mdc&use=par');
  assert.equal(P.writeQuery(state({ use: 'par', on: { parfee: false, dep: true } })), '?loc=mdc&use=par&on=dep&off=parfee');
  assert.deepEqual(P.readQuery('?use=rent&on=waiver,granny').S.on, { waiver: true }, 'a link from the first build still reads');
  // a figure pasted into a link with its cents is that figure, not a hundred times it
  const cents = P.readQuery('?install=31250.00&down=45000.00&rent=1850.50&fees=14700.00&rate=8.125').S.set;
  assert.deepEqual([cents.install, cents.down, cents.rent, cents.fees, cents.rate], [31250, 45000, 1850, 14700, 8.125]);
  assert.equal(P.readQuery('?install=32k').S.set.install, undefined, 'a letter in a link is not read as a number');
  // the link that is copied for someone else names the place and the purpose, even for the starting example,
  // so it opens the same answer in a browser that remembers another place
  assert.equal(P.writeQuery(P.blank(), true), '?loc=mdc&use=rent');
  assert.deepEqual(P.readQuery(P.writeQuery(P.blank(), true)).has, { loc: true, use: true });
  for (const S of scenarios()) if (P.writeQuery(P.tidy(S))) assert.equal(P.writeQuery(S, true), P.writeQuery(S));
  // a figure kept for another kind of home rides in the link under that kind's name, and comes back
  const kept = state({ use: 'par', set: { ins: 90 }, keep: { ins: { rent: 250 }, upkeep: { rent: 300 }, exemptAmt: { rent: 15400 } } });
  assert.equal(P.writeQuery(kept), '?loc=mdc&use=par&ins=90&exempt-rent=15400&ins-rent=250&upkeep-rent=300');
  assert.deepEqual(P.readQuery(P.writeQuery(kept)).S, kept);
  assert.deepEqual(P.readQuery('?use=rent&ins-rent=250').S.set, { ins: 250 }, 'a figure kept for the home on screen is the figure on screen');
  assert.deepEqual(P.readQuery('?use=par&ins-rent=150&exempt-rent=20000').S.keep, {}, 'and one that is our own estimate is not kept at all');
});

test('two homes: the control follows the place until the visitor picks, and the link carries only a pick', () => {
  assert.deepEqual(PLACES.map(loc => P.cur(ctx({ loc }), 'plan')), PLACES.map(loc => M.DATA.LOC[loc].plan));
  assert.equal(P.cur(ctx({ loc: 'mia' }), 'plan'), 'eff', 'the City of Miami opens on the Efficiency');
  assert.equal(P.writeQuery(state({ loc: 'mia' })), '?loc=mia&use=rent', 'the home a place starts on is not in the link');
  assert.equal(P.writeQuery(state({ loc: 'mia', plan: 'eff' })), '?loc=mia&use=rent&plan=eff', 'a home the visitor picked is, even when it is the place\'s own');
  assert.equal(P.readQuery('?loc=mdc&plan=eff').S.plan, 'eff');
  assert.equal(P.cur(ctx({ loc: 'bro', plan: 'eff' }), 'plan'), 'eff', 'a picked home stays when the place changes');
  // the line under the control: nothing when the home fits, a Watch out when it does not, a plain helper where the city decides
  assert.equal(P.view('plan-why', c0), '');
  assert.equal(P.show('plan-why', c0), false);
  const no = P.view('plan-why', ctx({ loc: 'mia', plan: 'one' }));
  assert.ok(no.includes(esc(D.STATUS.warn)) && no.replace(/&nbsp;/g, ' ').includes(esc(M.compute({ loc: 'mia', plan: 'one' }).plan.why)), no);
  assert.ok(no.includes('450&nbsp;sq&nbsp;ft') && no.includes('401&nbsp;sq&nbsp;ft') && !/\d sq ft/.test(no), 'a size never breaks from its unit: ' + no);
  assert.ok(P.view('plan-why', ctx({ plan: 'eff' })).includes('st-warn'), 'the Efficiency in unincorporated Miami-Dade');
  const ask = P.view('plan-why', ctx({ loc: 'bro' }));
  assert.ok(!ask.includes('st-warn') && ask.includes('<a href="/check-my-lot/">Check My Lot</a>'), ask);
  // every figure follows the home: the price, the tiles, the three value views, the rent the page starts from
  for (const loc of PLACES) for (const plan of HOMES) {
    const c = ctx({ loc, plan }), R = M.compute({ loc, plan });
    assert.equal(P.val(c, 'cost.home'), M.DATA.PLANS[plan].price);
    assert.equal(P.val(c, 'tiles.fam.cost.total'), M.compute({ loc, plan, use: 'fam' }).cost.total);
    assert.equal(P.val(c, 'value.cost'), R.value.cost);
    assert.ok(P.view('h-rent', c).includes('>' + usd(M.DATA.LOC[loc].rent[plan]) + '<'), 'the starting rent of ' + plan + ' in ' + loc);
  }
});

test('the purpose tiles and the side-by-side table hold the model\'s figures for every purpose', () => {
  const direct = { rent: M.compute({ use: 'rent' }), rentA: M.compute({ use: 'rent', on: { waiver: true } }), par: M.compute({ use: 'par' }), fam: M.compute({ use: 'fam' }), off: M.compute({ use: 'off' }) };
  assert.deepEqual(P.CASES.map(k => k.id), Object.keys(direct));
  for (const id of Object.keys(direct)) for (const root of ['tiles', 'cases']) {
    for (const [p, v] of [['cost.total', direct[id].cost.total], ['year1.net/12', direct[id].year1.net / 12], ['ten.net', direct[id].ten.net]]) assert.equal(P.val(c0, root + '.' + id + '.' + p), v, root + '.' + id + '.' + p);
  }
  assert.equal(P.val(c0, 'tiles.off.office.value'), direct.off.office.value);
  // the default row values on the page itself
  const rows = P.view('sbs', c0), money = n => usd(Math.abs(n));
  for (const id of Object.keys(direct)) for (const v of [direct[id].cost.total, direct[id].year1.net / 12, direct[id].ten.net]) assert.ok(rows.includes('>' + money(v) + '<'), id + ': ' + money(v));
  assert.equal((rows.match(/tag-as/g) || []).length, 2, 'the affordable rental and the parents\' home are marked Assumed');
  assert.equal((rows.match(/aria-current="true"/g) || []).length, 1);
  assert.equal((rows.match(/data-go="/g) || []).length, 4, 'every other row can be shown');
  assert.ok(page.includes(rows), 'the rows are in the page');
  // a gain and a cost are worded one way wherever they show
  assert.ok(rows.includes('left over') && rows.includes('kept') && rows.includes('you pay') && rows.includes('spent'));
  for (const use of USES) { const c = ctx({ use }), n = c.R.year1.net; assert.ok(P.view('r2', c).endsWith(n >= 0 ? 'left over' : 'you pay')); assert.equal(P.view('r3', c), c.R.ten.net >= 0 ? 'kept' : 'spent'); }
  /* The visitor's own figures reach every purpose; a switch reaches only its own. On the parents' home with the
     lower fees switched off, the row on screen is the answer on screen, the tile keeps the owner's estimate, and
     installation typed here moves every row. The amount assumed exempt stays with the purpose it was typed for,
     and insurance and upkeep with the kind of home (a rental, or a home the family uses). */
  const c = ctx({ loc: 'mia', use: 'par', set: { install: 40000, exemptAmt: 4000, ins: 250 }, on: { parfee: false } });
  assert.equal(P.val(c, 'cases.par.cost.total'), c.R.cost.total);
  assert.equal(P.val(c, 'cases.par.cost.total'), M.compute({ loc: 'mia', use: 'par', install: 40000, exemptAmt: 4000, ins: 250, on: { parfee: false } }).cost.total);
  assert.equal(P.val(c, 'tiles.par.cost.total'), M.compute({ loc: 'mia', use: 'par', install: 40000, exemptAmt: 4000 }).cost.total);
  assert.equal(P.val(c, 'cases.rentA.cost.total'), M.compute({ loc: 'mia', use: 'rent', install: 40000, on: { waiver: true } }).cost.total);
  assert.equal(P.val(c, 'cases.off.year1.net'), M.compute({ loc: 'mia', use: 'off', install: 40000, ins: 250 }).year1.net, 'insurance typed for one home the family uses carries to another');
  assert.equal(P.val(c, 'cases.rent.year1.net'), M.compute({ loc: 'mia', use: 'rent', install: 40000 }).year1.net, 'and not to a rental, which starts on a landlord policy');
  assert.ok(!/tag-as/.test(P.view('sbs', c).split('</tr>')[2]), 'not assumed once it is switched off');
});

test('a row of the side-by-side table is the answer its "Show this one" gives, and showing it moves no other row', () => {
  const three = R => [R.cost.total, R.year1.net, R.ten.net];
  // every place and purpose: as it starts; with switches moved and figures typed; with figures kept for the other kinds of home
  const tries = [];
  for (const loc of PLACES) for (const use of USES.concat(['down'])) {
    tries.push(state({ loc, use }));
    tries.push(state({ loc, use, set: { ins: 250, upkeep: 300, install: 41000, rent: 2400, filing: 'single', income: 120000 }, on: { parfee: false, dep: true, hoh: true, office: false, boost: true, granny: false } }));
    tries.push(state({ loc, use, set: { exemptAmt: 6000, down: 140000, years: 15 }, on: { waiver: true }, keep: { ins: { rent: 260, home: 70 }, upkeep: { rent: 40 }, exemptAmt: { rent: 15400, par: 4000 } } }));
  }
  for (const S0 of tries) {
    const S = P.tidy(S0), before = P.context(S), tag = P.writeQuery(S, true);
    for (const k of P.CASES) {
      const T = P.showCase(P.copyState(S), k.id), after = P.context(T);
      assert.equal(T.use, k.use, tag);
      if (k.on) assert.equal(P.counted(after, 'waiver'), k.on.waiver, tag);
      assert.deepEqual(three(after.R), three(P.caseOf(before, k.id)), tag + ': the row ' + k.id + ' is not the answer it opens');
      assert.deepEqual(three(P.caseOf(after, k.id)), three(after.R), tag + ': the row on screen is not the answer on screen');
      for (const j of P.CASES) assert.deepEqual(three(P.caseOf(after, j.id)), three(P.caseOf(before, j.id)), tag + ': showing ' + k.id + ' moved the row ' + j.id);
      // and the link of what is now on screen opens the same table anywhere
      const again = P.context(P.readQuery(P.writeQuery(T, true)).S);
      for (const j of P.CASES) assert.deepEqual(three(P.caseOf(again, j.id)), three(P.caseOf(after, j.id)), tag + ': the link lost the row ' + j.id);
    }
  }
  // the reviewers' cases. On a rental, insurance $250 and upkeep $300 typed: the parents' row keeps its own estimates
  let S = state({ set: { ins: 250, upkeep: 300 } }), par = M.compute({ use: 'par' });
  assert.deepEqual(three(P.caseOf(P.context(S), 'par')), three(par));
  assert.deepEqual(three(P.context(P.showCase(S, 'par')).R), three(par));
  assert.deepEqual(S.keep, { ins: { rent: 250 }, upkeep: { rent: 300 } }, 'and the rental keeps the figures typed for it');
  assert.deepEqual(three(P.caseOf(P.context(S), 'rent')), three(M.compute({ ins: 250, upkeep: 300 })));
  assert.deepEqual(P.showCase(S, 'rent'), P.tidy(state({ set: { ins: 250, upkeep: 300 } })), 'back on the rental, nothing typed is lost');
  // the parents' home with the lower fees switched off, seen from the guest house: the row is the full price, unmarked
  S = state({ use: 'fam', on: { parfee: false } });
  assert.equal(P.val(P.context(S), 'cases.par.cost.total'), 149999);
  assert.ok(!/tag-as/.test(P.view('sbs', P.context(S)).split('</tr>')[2]));
  assert.equal(P.val(P.context(S), 'tiles.par.cost.total'), 139999, 'the tile keeps the owner\'s estimate');
  // a home office with its deductions switched off, a single owner who claims a parent: both rows follow the switches
  assert.deepEqual(three(P.caseOf(ctx({ use: 'fam', on: { office: false } }), 'off')), three(M.compute({ use: 'off', on: { office: false } })));
  assert.deepEqual(three(P.caseOf(ctx({ set: { filing: 'single' }, on: { dep: true, hoh: true } }), 'par')), three(M.compute({ use: 'par', filing: 'single', on: { dep: true, hoh: true } })));
  // a change of purpose and back again leaves the state as it was, through Downsize too
  for (const S0 of tries) for (const via of USES.concat(['down'])) {
    const S1 = P.tidy(P.copyState(S0)), S2 = P.setUse(P.setUse(P.copyState(S1), via), S1.use);
    assert.deepEqual(S2, S1, P.writeQuery(S1, true) + ' by way of ' + via);
  }
});

test('an exemption that needs a yes is shown as an assumption, with the office to ask', () => {
  const tel = (id, loc) => (D.ITEMS.find(it => it.id === id).tel || []).filter(a => /^[\d\s().+-]{3,}$/.test(a.n) && (!a.loc || [].concat(a.loc).includes(loc) || loc !== 'bro' && [].concat(a.loc).includes('md')))[0].n;
  // the rental: not counted at market rent, assumed as affordable housing
  assert.match(P.view('maybe', c0), /class="maybe"><span><b>Not counted:<\/b> .*\$20,000<\/span> off day one if you rent it as affordable housing and the county exempts its impact fees\./);
  const aff = ctx({ on: { waiver: true } });
  // the assumption is said beside what the published schedule shows can come off in that place
  assert.match(P.view('maybe', aff), /class="maybe is-counted"><span><b>Assumes<\/b> .*\$20,000<\/span> of impact fees are exempt as affordable housing\. The county's schedule shows .*\$13,800<\/span> to .*\$17,000<\/span> it can exempt: ask first, /);
  assert.match(P.view('maybe', ctx({ loc: 'mia', on: { waiver: true } })), /The county's schedule shows .*\$9,500<\/span> to .*\$9,800<\/span> it can exempt: ask first, /);
  assert.ok(P.view('maybe', aff).includes('>' + tel('md-exempt', 'mdc') + '<'));
  // Broward: the School Board's own fee is one figure, and the $20,000 is never tied to that fee alone
  assert.match(P.view('maybe', ctx({ loc: 'bro', on: { waiver: true } })), /waived as affordable housing\. The School Board's own fee is <span data-fig="place\.published\.exemptible\.0" data-fmt="usd">\$8,809<\/span>: ask first, /);
  assert.ok(P.view('maybe', ctx({ loc: 'bro' })).endsWith('and the impact fees are waived.</span> ' + P.view('maybe', ctx({ loc: 'bro' })).split('</span> ').pop()));
  assert.ok(!/School Board waives its fee/.test(P.view('maybe', ctx({ loc: 'bro' }))));
  assert.ok(P.view('maybe', ctx({ loc: 'bro', on: { waiver: true } })).includes('>' + tel('bro-school', 'bro') + '<'));
  assert.ok(P.view('ex-marks', aff).includes('Assumed') && P.view('ex-marks', aff).includes('>' + esc(D.STATUS.call) + '<'));
  assert.ok(!P.view('ex-marks', c0).includes('Assumed') && P.view('ex-marks', c0).includes('>' + esc(D.STATUS.call) + '<'));
  /* One status, one name. The mark on the exemption row and on the office switch is the directory's own word for
     that status, the same word its cards and its filter carry: change it there and it changes everywhere. */
  const word = D.STATUS.call;
  D.STATUS.call = 'Ring them';
  try {
    for (const [name, c] of [['ex-marks', c0], ['ex-marks', ctx({ use: 'par' })], ['st-office', ctx({ use: 'off' })]]) assert.ok(P.view(name, c).includes('>Ring them<'), name + ' does not read the status from the directory');
  } finally { D.STATUS.call = word; }
  assert.equal(word, 'Ask first', 'the brief\'s word for it');
  assert.ok(page.includes(P.view('st-office', c0)), 'the office switch carries the chip as the script draws it');
  assert.ok(P.view('a-exempt', c0).includes('Not counted') && P.view('a-exempt', aff).includes('>$20,000<'));
  assert.ok(P.view('bar1l', aff).endsWith('assumed exempt.') && P.view('bar1l', c0).endsWith('impact fees <span data-fig="cost.fees" data-fmt="usd">$20,000</span>.'));
  // the helper: our estimate, what the schedules print (the model's words), what to budget, the office
  const h = P.view('h-exempt', aff);
  assert.ok(h.startsWith('Our estimate takes ') && h.includes(esc(M.compute({}).place.published.rent)) && h.includes('until you have a yes in writing, budget <span data-fig="cost.list" data-fmt="usd">$149,999</span>.') && h.includes('>' + tel('md-exempt', 'mdc') + '<'), h);
  assert.ok(P.view('h-exempt', c0).startsWith('Our estimate would take '));
  assert.ok(P.view('h-exempt', ctx({ on: { waiver: true }, set: { exemptAmt: 15400 } })).includes('>$15,400<'), 'the sentence follows a changed amount');
  // the parents' home starts assumed
  const par = ctx({ use: 'par' });
  assert.match(P.view('maybe', par), /is-counted"><span><b>Assumes<\/b> .*\$10,000<\/span> less in impact fees for a parents' home\. Ask first, /);
  assert.ok(P.view('h-exempt', par).includes('for a rent-free home for your parents. ') && P.view('h-exempt', par).includes(esc(par.R.place.published.par)));
  assert.ok(P.counted(par, 'exempt') && !P.counted(c0, 'exempt') && P.counted(aff, 'exempt'));
  // a home office: the saving is said under the figures and is never in day one; a guest house has no line
  assert.match(P.view('maybe', ctx({ use: 'off' })), /Not in the day-one figure:<\/b> about .*\$4,400<\/span> of tax saved a year if you are self-employed and use it only for your business\./);
  assert.match(P.view('maybe', ctx({ use: 'off', on: { office: false } })), /class="maybe"><span><b>Not counted:/);
  assert.equal(P.view('maybe', ctx({ use: 'fam' })), '');
  assert.equal(P.view('maybe', ctx({ set: { fees: 0 } })), '', 'nothing to exempt, nothing to say');
  // on its card in the directory each saving shows the amount in the visitor's numbers
  assert.match(P.view('svn-waiver', c0), /\$20,000<\/span> <small>off day one<\/small>/);
  assert.match(P.view('svn-parfee', par), /\$10,000<\/span> <small>off day one<\/small>/);
  assert.match(P.view('svn-office', ctx({ use: 'off' })), /\$366<\/span> <small>a month<\/small>/);
  /* The card is drawn once for a place and purpose and then follows every change, so its amount is a view that
     always has something to say: the figure, or "nothing yet" for a saving that is worth nothing at these figures. */
  assert.match(P.view('svc-waiver', c0), /\$20,000<\/span> <small>off day one<\/small>/);
  assert.equal(P.view('svc-hoh', ctx({ use: 'par', on: { dep: true, hoh: true } })), 'nothing yet', 'head of household is not open to a married owner');
  const single = ctx({ use: 'par', set: { filing: 'single' }, on: { dep: true, hoh: true } });
  assert.ok(single.R.savings.find(s => s.id === 'hoh').counted);
  assert.match(P.view('svc-hoh', single), /\$270<\/span> <small>a month<\/small>/);
  const none = ctx({ loc: 'mia', set: { filing: 'single', income: 200000 }, on: { boost: true } });
  assert.ok(none.R.savings.find(s => s.id === 'boost').counted && !(none.R.tax.boost.savings > 0));
  assert.equal(P.view('svc-boost', none), 'nothing yet');
  for (const S of scenarios()) { const c = P.context(S); for (const s of c.R.savings) assert.ok(P.view('svc-' + s.id, c).length > 0, 'a card with a gap for ' + s.id); }
  const js = fs.readFileSync(path.join(ROOT, 'js/money.js'), 'utf8');
  assert.match(js, /data-v="svc-' \+ s\.id \+ '"/, 'the card writes its amount as a view');
  assert.equal(js.split('\'nothing yet\'').length, 2, 'the words are said in one place, by the view');
});

test('the page holds up when the directory has no card for a saving', () => {
  const gone = ['par-fees', 'par-fees-bro', 'md-exempt', 'bro-school', 'office', 'bonus', 'depr'];
  const kept = D.ITEMS.slice();
  D.ITEMS.splice(0, D.ITEMS.length, ...kept.filter(it => !gone.includes(it.id)));
  try {
    for (const S of scenarios()) {
      const c = P.context(S), all = Object.keys(P.VIEW).map(n => P.view(n, c)).join(' ');
      assert.ok(!/undefined|NaN/.test(all), JSON.stringify(S));
      for (const id of gone) assert.ok(!all.includes('#p-' + id), 'a link to the missing card ' + id);
      assert.ok(!/ \(\)|,\s*\.|ask first, \./.test(all.replace(/<[^>]+>/g, '')), 'a sentence left with a hole where the phone number was');
    }
    assert.ok(P.view('maybe', ctx({ use: 'par' })).includes('Ask first.'), 'the saving still shows, without its link');
  } finally { D.ITEMS.splice(0, D.ITEMS.length, ...kept); }
});

test('the rent helper names the home and checks it against HUD\'s fair market rent from the directory', () => {
  for (const loc of PLACES) for (const plan of HOMES) {
    const c = ctx({ loc, plan }), h = P.view('h-rent', c), L = D.LIM[c.R.place.county];
    assert.ok(h.startsWith(plan === 'eff' ? 'A new efficiency this size' : 'A new one-bedroom this size'), h);
    assert.ok(h.includes('HUD&#39;s fiscal 2027 fair market rent (in effect since October 1, 2026)') || h.includes('HUD\'s fiscal 2027 fair market rent (in effect since October 1, 2026)'), h);
    assert.ok(h.includes('>' + usd(L.fmr[c.R.rent.unit]) + '<'), loc + ' ' + plan + ': ' + usd(L.fmr[c.R.rent.unit]));
  }
  const capped = P.view('h-rent', ctx({ on: { waiver: true }, set: { rent: 3200 } }));
  assert.match(capped, /The exemption caps rent at .*\$3,066<\/span> with utilities\. These numbers use /);
});

test('there are steps for every place and purpose, with nothing left unfilled', () => {
  for (const loc of PLACES) for (const use of USES) for (const waiver of use === 'rent' ? [false, true] : [false]) {
    const s = P.stepsFor(ctx({ loc, use, on: { waiver } }));
    assert.ok(s.steps.length >= 5, loc + ' ' + use);
    for (const [what, why] of s.steps) { assert.ok(what.length > 8 && why.length > 20, loc + ' ' + use + ': ' + what); assert.doesNotMatch(what + why, /[{}]|undefined|\(\)/); }
    assert.match(s.note, /^Order matters\./);
    const all = s.steps.map(x => x.join(' ')).join(' ');
    // asking for the exemption is a step only for a home rented as affordable housing
    if (use === 'rent') assert.equal(/income tier/.test(all) && /fee exemption before the permit/.test(all), waiver, loc + ' rent ' + (waiver ? 'affordable' : 'market'));
  }
  const bro = P.view('steps', ctx({ loc: 'bro', on: { waiver: true } }));
  assert.match(bro, /80% of the area/);
  assert.ok(bro.indexOf('county housing division') < bro.indexOf('School Board') && (bro.match(/href="tel:/g) || []).length === 2, 'Broward: the county housing division first, then the School Board, each with its number');
  assert.match(P.view('steps', ctx({ use: 'par' })), /Ask about the lower fees before the permit\.<\/b> <span>Ask the Impact Fee Section \(<a class="nobr" href="tel:\+1\d{10}">/);
  assert.match(P.view('steps', ctx({ use: 'off' })), /Form 8829/);
});

test('what is typed outside its limits is held at the limit, and the page says so in words', () => {
  assert.equal(P.limitText(c0, 'ins', 150), '');
  assert.equal(P.limitText(c0, 'ins', 900), 'Insurance goes up to $600 a month here.');
  assert.equal(P.limitText(c0, 'rent', 200), 'Rent starts at $1,000 a month here.');
  assert.equal(P.limitText(c0, 'emptyWeeks', 40), 'Empty weeks go up to 12 a year here.');
  assert.equal(P.limitText(c0, 'rate', 2), 'The loan rate starts at 4% here.');
  assert.equal(P.limitText(c0, 'fees', 90000), 'Impact fees go up to $60,000 here.');
  assert.equal(P.limitText(c0, 'valueMultiple', 40), 'The multiple goes up to ' + M.DATA.VALUE.multipleMax + ' here.');
  assert.equal(P.limitText(c0, 'down', 900000), 'Money down goes up to ' + usd(c0.R.cost.total) + ' here, the all-in price.');
  assert.equal(P.limitText(c0, 'exemptAmt', 50000), 'The amount taken off goes up to ' + usd(c0.R.cost.fees) + ' here, the impact fees.');
});

test('a field reads what a person types: cents are cut, never read as more digits, and a letter is never guessed at', () => {
  const typed = [
    // a quote is written with cents: "Your site-plan quote replaces this estimate"
    ['install', '$31,250.00', 31250], ['install', '31250.00', 31250], ['rent', '1850.50', 1850], ['down', '45,000.00', 45000], ['fees', '14,700.00', 14700], ['ins', '175.5', 175],
    ['income', '$90,000', 90000], ['rent', '1,850', 1850], ['rent', '1.850', 1850], ['rent', '1.850,50', 1850], ['install', ' 30000 ', 30000], ['emptyWeeks', '3', 3], ['emptyWeeks', '3.5', 3],
    ['rate', '8.25', 8.25], ['rate', '8.25%', 8.25], ['rate', '8,25', 8.25], ['rate', '8', 8], ['years', '15', 15], ['pay', 'cash', 'cash'],
    // not a number: "32k" must not become 32
    ['install', '32k', undefined], ['install', '32K', undefined], ['down', '30 thousand', undefined], ['install', '1e5', undefined], ['rate', '8 percent', undefined],
    // nor a range a figure of eight digits, nor a minus a plus
    ['rent', '1,600-1,950', undefined], ['rent', '1600 to 1950', undefined], ['install', '-5000', undefined], ['install', '30 000', 30000],
    ['install', '', undefined], ['install', '   ', undefined], ['install', '$', undefined], ['rate', '.', undefined], ['years', '16', undefined], ['pay', 'credit', undefined]
  ];
  for (const [k, text, want] of typed) assert.equal(P.parseField(k, text), want, k + ': ' + JSON.stringify(text));
  // for every dollar field, a figure inside its limits is read the same with cents and without, so it is never held at the top by mistake
  for (const k of Object.keys(P.FIELDS).filter(k => P.FIELDS[k].t === 'usd')) {
    const f = P.FIELDS[k], top = k === 'exemptAmt' ? c0.R.cost.fees : f.max, v = Math.round((f.min + top) / 2 / f.step) * f.step;   // the amount taken off can never pass the fees
    for (const text of [String(v), usd(v), usd(v) + '.00', v + '.5', usd(v) + '.99']) {
      assert.equal(P.parseField(k, text), v, k + ': ' + text);
      assert.equal(P.limitText(c0, k, P.parseField(k, text)), '', k + ': ' + text + ' is inside the limits and says nothing');
    }
  }
  // what cannot be read puts the field back as it was, and the page says how to type it
  assert.equal(P.oddText(c0, 'install'), 'Type a number here, like 30,000.');
  assert.equal(P.oddText(c0, 'rate'), 'Type a number here, like 8.25.');
  assert.equal(P.oddText(c0, 'emptyWeeks'), 'Type a number here, like 3.');
});

test('the sentences carry the sign, the unit and only what is true of these figures', () => {
  const words = h => h.replace(/<[^>]+>/g, '');
  // under the three figures each sentence stands on its own: on most screens it no longer sits under its figure
  for (const use of ['par', 'fam', 'off']) {
    const c = ctx({ use });
    assert.match(words(P.view('s2', c)), /^You pay the loan and the bills[^.]*\. Once the loan is paid off you still pay \$[\d,]+ a month\.$/, use);
    assert.match(words(P.view('s3', c)), /^That is on top of day one\. It may also add to what your property is worth: about \$[\d,]+ to \$[\d,]+, depending on who is looking\.$/, use);
  }
  assert.equal(words(P.view('s2', ctx({ use: 'par' }))), 'You pay the loan and the bills, less the tax breaks counted. Once the loan is paid off you still pay $305 a month.');
  assert.equal(words(P.view('s2', ctx({ use: 'fam', set: { pay: 'cash' } }))), 'You pay the bills. There is no loan payment to make.');
  assert.equal(words(P.view('s2', ctx({ use: 'off', on: { office: false } }))).slice(0, 67), 'You pay the loan and the bills, with no office deductions counted. ');
  // a gain is never worded as a cost: tax breaks that cover a home paid for in cash
  const gain = ctx({ use: 'par', set: { pay: 'cash', ins: 0, upkeep: 0, filing: 'single' }, on: { dep: true, hoh: true } });
  assert.ok(gain.R.year1.net > 0 && gain.R.ten.net > 0);
  assert.equal(words(P.view('s2', gain)), 'The tax breaks counted cover the bills. There is no loan payment to make.');
  assert.match(words(P.view('s3', gain)), /^That does not count day one\. /);
  assert.equal(words(P.view('tensum', gain)), 'Over ten years the tax breaks counted cover what the home costs to own.');
  for (const S of scenarios()) {
    const c = P.context(S), all = ['s1', 's2', 's3', 'tensum', 'h-net'].map(n => words(P.view(n, c))).join(' ');
    assert.ok(!/about \$[\d,]*[1-9]\d?\b(?!,)/.test(words(P.view('tensum', c)) + words(P.view('h-tax', c))), '"about" beside a figure to the dollar: ' + words(P.view('tensum', c)));
    if (c.R.input.use !== 'rent') { assert.equal(/You pay /.test(words(P.view('s2', c))), c.R.year1.net < 0, P.writeQuery(S, true)); assert.equal(/costs \$/.test(words(P.view('tensum', c))), c.R.ten.net < 0); }
    assert.ok(!/−/.test(all), 'a minus sign in a sentence: ' + all);
  }
  // a longer loan is offered only while the page has a longer one to offer
  const short30 = ctx({ set: { rent: 1000 } }), short15 = ctx({ set: { rent: 1000, years: 15 } }), shortCash = ctx({ set: { rent: 1000, pay: 'cash', ins: 600, upkeep: 600 } });
  assert.ok(short30.R.year1.net < 0 && short15.R.year1.net < 0 && shortCash.R.year1.net < 0);
  for (const v of ['s2', 'h-net']) {
    assert.ok(P.view(v, short30).endsWith('More money down or a higher rent changes that.'), v + ': ' + P.view(v, short30));
    assert.ok(P.view(v, short15).endsWith('More money down, a longer loan or a higher rent changes that.'), v);
    assert.ok(P.view(v, shortCash).endsWith('A higher rent changes that.'), v);
  }
  assert.equal(Math.max(...P.FIELDS.years.of), 30);
  // the first-year write-off: worth something, nothing, or a cost, always in words
  assert.match(words(P.view('svm-boost', c0)), /Worth about \$1,700 over ten years, because the write-offs come sooner, not twice\./);
  const dear = ctx({ set: { down: 0, years: 15, rent: 1500, income: 145000 }, on: { boost: true } });
  assert.equal(Math.round(dear.R.tax.boost.tenYear), -550, 'the reviewers\' case: counted, the write-off costs money over ten years');
  assert.match(words(P.view('svm-boost', dear)), /At your income it costs about \$550 over ten years: taking the write-offs sooner leaves less to write off in the years after\./);
  assert.match(words(P.view('svm-boost', ctx({ loc: 'mia', set: { filing: 'single', income: 200000 }, on: { boost: true } }))), /At your income it saves nothing over ten years: the write-offs come sooner, not twice\.|Worth about \$[\d,]+0 over ten years|costs about \$[\d,]+0 over ten years/);
  for (const S of scenarios()) { const h = P.view('svm-boost', P.context(S)); assert.ok(!/−|Worth about \$0 /.test(h), h); }
  // the day-one money is back only from the year it stays back (the model's payback)
  const dip = ctx({ set: { down: 1000, years: 15, income: 60000, filing: 'single' }, on: { boost: true } });
  assert.ok(dip.R.ten.net < 0 && dip.R.payback > 10);
  assert.ok(!/back in year 1\./.test(words(P.view('s3', dip))) && words(P.view('s3', dip)).startsWith('Your $1,000 is back in year ' + dip.R.payback + '.'), words(P.view('s3', dip)));
  assert.ok(!P.view('chart', dip).includes('is-back'), 'no column of the ten is marked Back');
  // the bar's sentence adds up when the rent falls short: what goes out, less the tax that comes back, less the rent
  const loss = words(P.view('bar2l', ctx({ set: { rent: 1000, down: 0, years: 15 } })));
  assert.match(loss, /empty weeks \$58\. The income tax saved gives back \$111\. You pay \$799 on top\.$/);
  const n = loss.match(/\$[\d,]+/g).map(x => +x.replace(/[$,]/g, ''));
  assert.ok(Math.abs(n.slice(1, -2).reduce((a, b) => a + b, 0) - n[n.length - 2] - n[0] - n[n.length - 1]) <= 3, loss);
  assert.ok(!P.view('bar2l', c0).includes('gives back'), 'tax to pay is a piece of the bar, not money back');
  // money down is never shown above the all-in price: typed at market rent, then as affordable housing
  const over = ctx({ set: { down: 140000 }, on: { waiver: true } });
  assert.deepEqual([P.cur(over, 'down'), P.fieldText(over, 'down'), over.R.loan.amount, P.view('s1', over)], [129999, '$129,999', 0, 'You pay it all on day one, with no loan.']);
  assert.equal(P.cur(ctx({ set: { down: 140000 } }), 'down'), 140000, 'back at market rent the figure typed is still there');
  // the panel's heading: the place is a part of its own, which a phone leaves to the control above it
  assert.equal(P.view('for', ctx({ loc: 'mia', use: 'fam' })), 'Estimate for a guest house<span class="rn-for-in"> in the City of Miami</span>');
  // the rent cap is named at its own tick; in the last quarter of the track its name ends there and takes the end label's place
  assert.equal(P.view('sc-rent', c0), '<span>$1,000</span><span>$3,200</span>');
  assert.match(P.view('sc-rent', ctx({ on: { waiver: true } })), /^<span>\$1,000<\/span><b class="is-end">Rent cap <span[^>]*>\$3,066<\/span><\/b>$/);
  assert.match(P.view('sc-rent', ctx({ loc: 'bro', on: { waiver: true } })), /^<span>\$1,000<\/span><b>Rent cap <span[^>]*>\$1,901<\/span><\/b><span>\$3,200<\/span>$/);
  assert.match(page, /<p class="rng-sc"[^>]*\sdata-rng="rent"/, 'the line under the rent slider carries the tick\'s place');
  // rent typed above the cap: the panel says which rent the figures use, beside the field that still shows what was typed
  const capped = ctx({ loc: 'bro', on: { waiver: true }, set: { rent: 2400 } });
  assert.equal(words(P.view('capnote', capped)), 'These numbers use $1,901.');
  assert.equal(P.fieldText(capped, 'rent'), '$2,400');
  assert.equal(P.view('capnote', ctx({ loc: 'bro', on: { waiver: true } })), '');
  assert.equal(P.view('capnote', ctx({ loc: 'bro', set: { rent: 2400 } })), '', 'at market rent there is no cap');
  assert.ok(P.show('cap', capped) && !P.show('cap', c0));
  // the method line for the office says what the model does, in the model's own figures
  const method = words(P.view('m-office', c0));
  assert.match(method, /That tax is charged on 92\.35% of profit, and its Social Security part stops at the wage base \(\$192,300 in 2027\), so past about \$208,000 of profit a deducted dollar saves only Medicare's 2\.9% of it\./);
  assert.ok(!/rate falls/.test(method) && /your tax without them less your tax with them/.test(method));
  assert.equal(M.DATA.OFFICE.wageBase[2027] / M.DATA.OFFICE.net > 208000 && M.DATA.OFFICE.wageBase[2027] / M.DATA.OFFICE.net < 208500, true);
});

test('the stylesheet keeps the two fixes a browser cannot be asked about from here', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css/money.css'), 'utf8');
  /* A radio stretched invisibly over its words must stay on top of them. A pressed span is scaled into a layer of
     its own; if that layer covered the radio, the click would land on the label, and Chrome drops such a click while
     a field's text is selected, which this page does to every field it focuses. (The browser check that clicks a
     field and then every segmented control is build/fix2/seg.js in the scratchpad.) */
  for (const sel of ['.seg input', '.opt input']) assert.match(css, new RegExp(sel.replace('.', '\\.') + '\\{[^}]*position:absolute;inset:0;z-index:1;'), sel + ' is not kept above its label');
  // a limit message in the walnut panel takes the light-on-dark error ink in every appearance
  assert.match(css, /\.rn-answer\{[^}]*--err-ink:#F8BFAE\}/);
  const js = fs.readFileSync(path.join(ROOT, 'js/money.js'), 'utf8');
  assert.match(js, /p\.id = el\.id \+ '-err'[\s\S]{0,200}aria-describedby/, 'the message under a field is tied to the field');
  // every field a message can sit under has an id to tie it to
  for (const m of page.matchAll(/<input\b([^>]*class="fld[^"]*"[^>]*\sdata-k="[^"]+"[^>]*)>/g)) assert.ok(attr(m[1], 'id'), 'a field without an id: ' + m[1].slice(0, 80));
});

test('every estimate is marked and can be changed: each has a field, and a tag that turns to Yours', () => {
  const keys = Object.keys(P.FIELDS).filter(k => P.FIELDS[k].tag);
  for (const k of keys) assert.ok(page.includes('data-v="t-' + k + '"') && page.includes('data-k="' + k + '"'), 'estimate ' + k + ' has no field or no tag on the page');
  assert.match(P.view('t-rent', c0), /Estimate/);
  assert.match(P.view('t-income', c0), /Example/);
  const mine = ctx({ set: { rent: 2000, income: 120000 } });
  assert.match(P.view('t-rent', mine), /Yours.*Use our estimate/);
  assert.match(P.view('t-income', mine), /Yours.*Use the example/);
  assert.match(page.replace(/<[^>]+>/g, ''), /Estimates, never a quote\. Every estimate is marked, and you can change each one\. Not tax, legal or lending advice\./);
  // with no script there are no fields: the sentence that promises them goes with the controls, and the rest still reads
  assert.match(page, /Estimates, never a quote\. <span data-needs-js>Every estimate is marked, and you can change each one\. <\/span>Not tax, legal or lending advice\./);
  assert.match(fs.readFileSync(path.join(ROOT, 'css/money.css'), 'utf8'), /html:not\(\.js\) :is\([^)]*\[data-needs-js\][^)]*\)\{display:none\}/);
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
  // one radio group for the home and one for the purpose, each named by the words above it
  assert.match(page, /role="radiogroup" aria-labelledby="qPlanL"/);
  assert.match(page, /role="radiogroup" aria-labelledby="qUseL"/);
});

test('the built page is this page, and its title and description name no single price', { skip: !fs.existsSync(BUILT) && 'adu-calculator/index.html is not built yet' }, () => {
  const built = fs.readFileSync(BUILT, 'utf8');
  assert.ok(built.includes(page.trim()), 'adu-calculator/index.html is stale. Rebuild it: python3 tools/pages/make_pages.py adu-calculator');
  for (const f of ['/css/money.css', '/js/money-model.js', '/js/money-data.js', '/js/money.js']) assert.ok(built.includes(f) && fs.existsSync(path.join(ROOT, f)), f);
  assert.ok(!built.includes('team-api.js'), 'the calculator does not need the team script');
  assert.match(built, /<title>ADU Calculator: Cost, Savings and Rental Income, Miami-Dade and Broward \| Sidesuites<\/title>/);
  // two homes, two prices: the head says "from" the lower one, taken from the model
  const low = usd(Math.min(...HOMES.map(p => M.DATA.PLANS[p].price)));
  const head = built.slice(0, built.indexOf('</head>'));
  const descs = [...head.matchAll(/(?:name="description"|og:description"|twitter:description") content="([^"]*)"/g)].map(m => m[1]).concat([...head.matchAll(/"description": "([^"]*)"/g)].map(m => m[1]));
  assert.equal(descs.length, 4, 'the description, its two share copies and the structured data');
  for (const d of descs) {
    assert.ok(d.includes('from ' + low), 'a description without "from ' + low + '": ' + d);
    assert.deepEqual(d.match(/\$\d[\d,]*\d/g), [low], 'a description names a price other than the lowest: ' + d);
  }
  assert.doesNotMatch(page.slice(0, page.indexOf('<form')), /\$\d/, 'the title block names no price');  // a link that is not the starting example holds the numbers back until the script has drawn the right ones, and the script lets go
  assert.match(head, /classList\.add\('rn-wait'\)[\s\S]*setTimeout\(function\(\)\{d\.classList\.remove\('rn-wait'\)\},\d+\)/, 'the head\'s guard, with its own time limit');
  assert.ok(head.indexOf('rn-wait') < head.indexOf('/js/money-model.js'), 'the guard runs before the scripts load');
  assert.match(fs.readFileSync(path.join(ROOT, 'js/money.js'), 'utf8'), /classList\.remove\('rn-wait'\)/);
  assert.match(fs.readFileSync(path.join(ROOT, 'css/money.css'), 'utf8'), /html\.rn-wait [^{]*\{visibility:hidden\}/);
});
