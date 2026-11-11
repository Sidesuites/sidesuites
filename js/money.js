/* Sidesuites: Run My Numbers (/adu-calculator/). The page's behaviour.
   It reads the controls, asks js/money-model.js (SSMoney.compute) for every dollar figure and draws the answer.
   js/money-data.js (SSMoneyData) supplies every phone number, link and card text at run time.
   This file words, formats and arranges. It never works out a dollar figure of its own.

   Four hooks tie the page to the model. tools/pages/tests/money-page.test.js checks every one of them:
     data-fig="path" data-fmt="usd"   a figure. The path names a value in what SSMoney.compute() returns
                                      (cost.total, year1.net/12, cost.fees.county.amount, DATA.LIFE).
     data-v="name"                    a sentence, a bar or a list this file builds (VIEW below).
     data-show="name"                 a row or a block that shows only when it applies (SHOW below).
     data-k="key" / data-on="flag"    a control bound to one input of the model (FIELDS below).
   tools/pages/money.main.html carries the default scenario in all four, so the first paint is right before
   this script runs. After a change to the model or to the wording here, rewrite it and rebuild the page:
     node tools/pages/tests/money-page.test.js --write && python3 tools/pages/make_pages.py

   The top of the file is content: the steps, the field limits, the wording. The drawing starts at "THE PAGE". */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var M = node ? require('./money-model.js') : root.SSMoney, D = node ? require('./money-data.js') : root.SSMoneyData;
  if (!M || !D) return;                 // the model or the directory did not load: the page stays as written
  var api = factory(M, D, root);
  if (node) module.exports = api; else api.boot();
})(typeof self !== 'undefined' ? self : this, function (M, D, root) {
'use strict';

/* ------------------------------------------------------------------ DO IT IN THIS ORDER
   One list per purpose. A step is [what to do, why or how]. Text that differs by place is an object keyed like
   the cards in money-data.js: a place id, md for any Miami-Dade place, all for everywhere.
   {tier} is the income tier the fee exemption uses there (from the model). {tel:card} is the first phone
   number on that card for the place (from the directory), or nothing when the card is gone. */
var LOT = {
  mdc: 'Unincorporated Miami-Dade: a lot of 7,500 sq ft or more inside the Urban Development Boundary, and a unit of 400 to 800 sq ft. On septic? Sewer usually comes first.',
  mia: 'City of Miami: a single-family lot in T3-L, T3-O, T4, T5 or T6 (not T3-R). A detached unit can be up to 10% of the lot, 800 sq ft at most.',
  mdo: 'Call your city\'s zoning desk first. ADU rules are different in every Miami-Dade city.',
  bro: 'Call your city\'s zoning desk first. Six Broward cities have a rentable ADU ordinance. Many do not.'
};
var LOT_FAMILY = { mdc: LOT.mdc + ' Ask about the guesthouse permit for a family-only unit.', mia: LOT.mia, mdo: LOT.mdo, bro: LOT.bro };
var FEES_FAMILY = {
  mdc: 'Ask the Impact Fee Section whether a family guesthouse is charged as a new unit. Ask for the school fee exemption on the permit application.',
  mia: 'Ask for the county school fee exemption on the permit application. Ask City zoning which rules apply to a rent-free family unit.',
  mdo: 'Ask for the county school fee exemption on the permit application. Ask your city what it charges.',
  bro: 'County road fees are already $0. Ask the School Board which school fee row applies to a family unit.'
};
var STEPS = {
  rent: {
    steps: [
      ['Confirm the lot can take the home.', LOT],
      ['Pick your tenant\'s income tier.', {
        md: 'The county exemption is for a tenant household at or under {tier}% of the area\'s median income. The fee exemption card below has the income and rent limits. The rent cap at that tier sits above market rent.',
        bro: 'The school fee waiver is for a tenant household at or under {tier}% of the area\'s median income. The school fee waiver card below has the income and rent limits.' }],
      ['Ask about the fee exemption before the permit.', {
        mdc: 'Email the Impact Fee Section and ask for the affordable housing exemption on one backyard home. It can exempt the county fees if it approves. Get the answer in writing.',
        mia: 'County: ask the Impact Fee Section for the road fee exemption, in writing. City: its own impact fees, about $8,100 plus a 3% charge, can be postponed for a certified affordable unit. They are not waived.',
        mdo: 'Email the county Impact Fee Section and ask for the affordable housing exemption on the county fees. Then ask your city what it charges.',
        bro: 'Ask the county housing division for an Affordable Housing Certification Letter. Take it to the School Board and ask it to waive the school impact fee.' }],
      ['Call the Property Appraiser before the tenant moves in.', 'The rented unit comes off your homestead. Hiding it costs back taxes, a 50% penalty and 15% interest.'],
      ['Sign a written lease longer than six months, at the full permitted rent.', 'Save three comparable listings that day. They protect your deductions.'],
      ['Hand your CPA an itemized invoice.', 'Structure, appliances and site work on separate lines. The first-year write-off needs that split.'],
      ['Mark two dates.', 'April 1: tangible property return (Form DR-405). April 15: Schedule E with your federal return.']
    ],
    note: {
      mia: 'Order matters. Ask before the building permit. The school exemption and the City of Miami deferral are lost if you miss that point. The county exemption can still be claimed as a refund within one year of the certificate of occupancy.',
      md: 'Order matters. Ask before the building permit. The school exemption is lost if you miss that point. The county exemption can still be claimed as a refund within one year of the certificate of occupancy.',
      bro: 'Order matters. Ask before the building permit.' }
  },
  par: {
    steps: [
      ['Confirm the lot can take the home.', LOT_FAMILY],
      ['Decide who pays.', 'If your parents put money in, see an elder-law attorney first. A gift over $19,000 needs a tax form, and Medicaid looks back five years.'],
      ['Ask about fees before the permit.', { mdc: FEES_FAMILY.mdc, mia: FEES_FAMILY.mia, mdo: FEES_FAMILY.mdo, bro: 'County road fees are already $0. Ask the School Board which school fee row applies to a parents\' unit.' }],
      ['Finish and move in before January 1.', 'The home must be complete and your parent living there on January 1 to count for that tax year.'],
      ['File Form DR-501PGP by March 1.', { md: 'With the Miami-Dade Property Appraiser. File once and it renews on its own.', bro: 'With the Broward County Property Appraiser. File it again every year.' }],
      ['Call the Elder Helpline.', '{tel:ltc} One phone screening opens Medicaid long-term care and the state programs.'],
      ['At tax time, give your CPA the list.', 'Dependent credit, head of household if you are unmarried, medical deduction, care credit.']
    ],
    note: 'Order matters. The January 1 and March 1 dates decide which tax year the savings start.'
  },
  fam: {
    steps: [
      ['Confirm the lot can take the home.', LOT_FAMILY],
      ['Decide what it is for.', 'A guest room and a home office follow different rules. The home office deduction is for the self-employed, and only when the space is used for the business and nothing else.'],
      ['Ask about fees before the permit.', FEES_FAMILY],
      ['Finish before January 1.', 'The county adds the home to your assessment on the January 1 after it is finished. That date sets the first tax year it counts.'],
      ['Tell your insurer.', 'Add the home to your homeowner\'s policy before anyone uses it. Ask what a wind mitigation inspection takes off the premium.'],
      ['At tax time, hand your CPA the list.', 'The mortgage interest on the loan that built the home, and the home office if you run a business from it.']
    ],
    note: 'Order matters. Ask about fees before the permit. January 1 sets the first tax year.'
  }
};

/* ------------------------------------------------------------------ THE CONTROLS
   One row per input of the model the visitor can change.
   q     its name in the link (?rent=1900)
   t     usd, int, rate (percent with decimals), pct (whole percent) or pick (one of a set)
   tag   est = starts as our estimate, ex = starts as an example about the visitor; either turns to "Yours"
   name  how the page names it in "Rent goes up to $3,200 here."  per = the unit said after the limit */
var FIELDS = {
  install:      { q: 'install',     t: 'usd',  min: 0,     max: 80000,   step: 500,   tag: 'est', name: 'Installation' },
  lot:          { q: 'lot',         t: 'usd',  min: 0,     max: 80000,   step: 500,   tag: 'est', name: 'Lot work and permits', many: 1 },
  feeCounty:    { q: 'fee-county',  t: 'usd',  min: 0,     max: 30000,   step: 100,   tag: 'est', name: 'The county fee', fee: 'county' },
  feeCity:      { q: 'fee-city',    t: 'usd',  min: 0,     max: 30000,   step: 100,   tag: 'est', name: 'The city fee', fee: 'city' },
  feeSchool:    { q: 'fee-school',  t: 'usd',  min: 0,     max: 30000,   step: 100,   tag: 'est', name: 'The school fee', fee: 'school' },
  pay:          { q: 'pay',         t: 'pick', of: ['loan', 'cash'] },
  down:         { q: 'down',        t: 'usd',  min: 0,     max: 100000,  step: 1000,  name: 'Money down' },
  rate:         { q: 'rate',        t: 'rate', min: 4,     max: 14,      step: 0.125, tag: 'est', name: 'The loan rate' },
  years:        { q: 'years',       t: 'pick', of: [15, 20, 30] },
  rent:         { q: 'rent',        t: 'usd',  min: 1000,  max: 3200,    step: 25,    tag: 'est', name: 'Rent', per: ' a month' },
  emptyWeeks:   { q: 'weeks',       t: 'int',  min: 0,     max: 12,      step: 1,     tag: 'est', name: 'Empty weeks', many: 1, per: ' a year' },
  ins:          { q: 'ins',         t: 'usd',  min: 0,     max: 600,     step: 10,    tag: 'est', name: 'Insurance', per: ' a month' },
  upkeep:       { q: 'upkeep',      t: 'usd',  min: 0,     max: 600,     step: 10,    tag: 'est', name: 'Upkeep', per: ' a month' },
  assessedAdd:  { q: 'assessed',    t: 'usd',  min: 0,     max: 250000,  step: 1000,  tag: 'est', name: 'The added value' },
  income:       { q: 'income',      t: 'usd',  min: 20000, max: 400000,  step: 5000,  tag: 'ex',  name: 'Household income' },
  filing:       { q: 'filing',      t: 'pick', of: ['single', 'married', 'hoh'] },
  parents:      { q: 'parents',     t: 'pick', of: [1, 2] },
  homeAssessed: { q: 'home',        t: 'usd',  min: 50000, max: 3000000, step: 10000, tag: 'ex',  name: 'Your home\'s assessed value' },
  valuePct:     { q: 'value',       t: 'pct',  min: 0,     max: 100,     step: 5,     tag: 'est', name: 'The value share' }
};
var KEYS = Object.keys(FIELDS);
var PLACES = ['mdc', 'mia', 'mdo', 'bro'], USES = ['rent', 'par', 'fam', 'down'];
var FLAGS = ['waiver', 'boost', 'school', 'granny', 'dep', 'hoh', 'office'];
var ON0 = M.DATA.DEFAULTS.on;                              // which savings start counted
var STORE = 'sidesuite-numbers', HOME_USE = 'sidesuite-use';
var HOME_MAP = { renter: 'rent', parents: 'par', downsize: 'down' };   // every other home-page pick is family use
var WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen'];
var MINUS = '\u2212', NEG = '<i class="sgn">' + MINUS + '</i>', POS = '<i class="sgn">+</i>';   // signs set in the text face, so they read at a glance

/* ------------------------------------------------------------------ small tools */
var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return ESC[ch]; }); }
function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function copyState(S) {
  var T = { loc: S.loc, use: S.use, per: S.per, set: {}, on: {} }, k;
  for (k in S.set) T.set[k] = S.set[k];
  for (k in S.on) T.on[k] = S.on[k];
  return T;
}
// The directory's own lookups (see the top of js/money-data.js).
function pick(v, loc) { return v == null ? '' : typeof v === 'string' ? v : v[loc] != null ? v[loc] : loc !== 'bro' && v.md != null ? v.md : v.all || ''; }
function inLoc(x, loc) { return !x || [].concat(x).indexOf(loc) > -1 || (loc !== 'bro' && [].concat(x).indexOf('md') > -1); }
function card(id) { return find(D.ITEMS, id); }
function isPhone(n) { return /^[\d\s().+-]{3,}$/.test(n); }
function isEmail(n) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(n); }
function telHref(n) { var d = String(n).replace(/\D/g, ''); return 'tel:' + (d.length === 10 ? '+1' + d : d.length === 11 && d.charAt(0) === '1' ? '+' + d : d); }
// The first phone number on a card for this place: the office to call about that saving.
function firstTel(id, loc) {
  var it = card(id), t = it && (it.tel || []).filter(function (a) { return inLoc(a.loc, loc) && isPhone(a.n); })[0];
  return t ? t.n : '';
}
function telLink(n) { return '<a class="nobr" href="' + telHref(n) + '">' + esc(n) + '</a>'; }

/* ------------------------------------------------------------------ figures: look one up, format it */
function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function trim(n) { return String(+(+n).toFixed(3)); }
function usd(v) { var r = Math.round(Math.abs(v)); return (v < 0 && r > 0 ? MINUS : '') + '$' + group(r); }
// "cost.fees.county.amount": a list is searched by id, a number picks a row. DATA.x reads the model's constants.
function lookup(c, path) {
  var p = path.split('.'), o = c.R, i = 0, j;
  if (p[0] === 'DATA') { o = M.DATA; i = 1; }
  for (; i < p.length; i++) {
    if (o == null) return undefined;
    if (Array.isArray(o) && !/^\d+$/.test(p[i])) { for (j = 0; j < o.length && o[j].id !== p[i]; j++); o = o[j]; }
    else o = o[p[i]];
  }
  return o == null ? undefined : o;
}
// A path, or a small sum of products of paths and numbers: year1.net/12, place.mills*100. Unknown = undefined.
function val(c, expr) {
  var t = String(expr).split(/([+\-*\/])/), sum = 0, prod = null, sign = 1, op = '', i, x;
  for (i = 0; i < t.length; i++) {
    if (t[i] === '') continue;
    if (t[i] === '+' || t[i] === '-') { if (prod !== null) { sum += sign * prod; prod = null; } sign = t[i] === '-' ? -1 : 1; op = ''; continue; }
    if (t[i] === '*' || t[i] === '/') { op = t[i]; continue; }
    x = /^[\d.]+$/.test(t[i]) ? +t[i] : lookup(c, t[i]);
    if (x === undefined) return undefined;
    if (typeof x !== 'number') return x;            // a label from the model, shown as it is
    prod = prod === null ? x : op === '/' ? prod / x : prod * x;
  }
  return sum + (prod === null ? 0 : sign * prod);
}
// usd: whole dollars. usd-abs: without the sign. -per: by the month or the year, as the visitor chose.
function fmt(v, kind, c) {
  if (typeof v !== 'number') return String(v);
  var per = c && c.S.per === 'year' ? 1 : 12;
  switch (kind) {
    case 'usd-abs': return usd(Math.abs(v));
    case 'usd-per': return usd(v / per);
    case 'usd-abs-per': return usd(Math.abs(v / per));
    case 'pct': return trim(v * 100) + '%';
    case 'int': return group(Math.round(v));
    case 'num': return trim(v);
    default: return usd(v);
  }
}
function fig(c, expr, kind) {
  var v = val(c, expr); kind = kind || 'usd';
  return '<span data-fig="' + expr + '" data-fmt="' + kind + '">' + (v === undefined ? '' : esc(fmt(v, kind, c))) + '</span>';
}

/* ------------------------------------------------------------------ state: the two picks and what was changed */
function blank() { return { loc: 'mdc', use: 'rent', per: 'month', set: {}, on: {} }; }
function isOn(S, flag) { return S.on[flag] != null ? !!S.on[flag] : !!ON0[flag]; }
// What SSMoney.compute() is asked. Anything the visitor has not set is left out, so the model's own defaults apply.
function inputOf(S) {
  var s = S.set, inp = { loc: S.loc, use: S.use === 'down' ? 'rent' : S.use, fee: {}, on: {} }, k, i;
  for (i = 0; i < KEYS.length; i++) {
    k = KEYS[i]; if (s[k] == null) continue;
    if (FIELDS[k].fee) inp.fee[FIELDS[k].fee] = s[k];
    else if (k === 'valuePct') inp.valuePct = s[k] / 100;
    else inp[k] = s[k];
  }
  for (i = 0; i < FLAGS.length; i++) inp.on[FLAGS[i]] = isOn(S, FLAGS[i]);
  return inp;
}
function context(S) { return { S: S, R: M.compute(inputOf(S)) }; }
// The value a control shows: what the model used, whether the visitor set it or not.
function cur(c, k) {
  var R = c.R, f = FIELDS[k], fee;
  if (k === 'loc' || k === 'use' || k === 'per') return c.S[k];
  if (f.fee) { fee = find(R.cost.fees, f.fee); return fee ? fee.amount : undefined; }
  if (k === 'assessedAdd') return R.assessedAdd;
  if (k === 'valuePct') return Math.round(R.value.pct * 100);
  return R.input[k];
}
function defaultOf(S, k) { var T = copyState(S); delete T.set[k]; return cur(context(T), k); }
// Forget anything set to exactly what we would have used anyway: it is our estimate again.
function tidy(S) {
  var k;
  for (k in S.set) if (S.set[k] === defaultOf(S, k)) delete S.set[k];
  for (k in S.on) if (!!S.on[k] === !!ON0[k]) delete S.on[k];
  return S;
}
function changed(S) { return S.per !== 'month' || Object.keys(S.set).length > 0 || Object.keys(S.on).length > 0; }
function parseField(k, raw) {
  var f = FIELDS[k], s = String(raw), n, i;
  if (f.t === 'pick') { for (i = 0; i < f.of.length; i++) if (String(f.of[i]) === s) return f.of[i]; return undefined; }
  s = s.replace(f.t === 'rate' ? /[^\d.]/g : /[^\d]/g, '');
  if (s === '' || s === '.') return undefined;
  n = f.t === 'rate' ? Math.round(parseFloat(s) * 1000) / 1000 : parseInt(s, 10);
  return isFinite(n) ? n : undefined;
}
function limits(c, k) { var f = FIELDS[k]; return [f.min, k === 'down' && c ? Math.max(f.max, Math.round(c.R.cost.total)) : f.max]; }
function fieldText(c, k) {
  var v = cur(c, k), t = FIELDS[k].t;
  return v === undefined ? '' : t === 'usd' ? usd(v) : t === 'int' || t === 'pct' ? group(Math.round(v)) : trim(v);
}
// "Insurance goes up to $600 a month here." Said under a field when what was typed is outside what the page takes.
function limitText(c, k, n) {
  var f = FIELDS[k], lim = limits(c, k), low = n < lim[0], v = low ? lim[0] : lim[1];
  if (n >= lim[0] && n <= lim[1]) return '';
  var shown = f.t === 'usd' ? usd(v) : f.t === 'rate' || f.t === 'pct' ? trim(v) + '%' : group(v);
  return f.name + (low ? (f.many ? ' start at ' : ' starts at ') : (f.many ? ' go up to ' : ' goes up to ')) + shown + (f.per || '') +
    (k === 'down' && !low ? ' here, the all-in price.' : ' here.');
}
/* The link. Only what differs from the defaults is written; the two picks ride along whenever anything is, so a
   copied link gives the same answer on any device. */
function writeQuery(S) {
  var q = [], k, i, on = [], differs = false;
  for (i = 0; i < KEYS.length; i++) { k = KEYS[i]; if (S.set[k] != null) q.push(FIELDS[k].q + '=' + encodeURIComponent(S.set[k])); }
  for (i = 0; i < FLAGS.length; i++) { if (isOn(S, FLAGS[i])) on.push(FLAGS[i]); if (isOn(S, FLAGS[i]) !== !!ON0[FLAGS[i]]) differs = true; }
  if (differs) q.push('on=' + (on.join(',') || '0'));
  if (S.per === 'year') q.push('per=year');
  if (!q.length && S.loc === 'mdc' && S.use === 'rent') return '';
  return '?loc=' + S.loc + '&use=' + S.use + (q.length ? '&' + q.join('&') : '');
}
function readQuery(search) {
  var S = blank(), got = {}, has = {}, pairs = String(search || '').replace(/^\?/, '').split('&'), i, kv, k, n, f, list;
  for (i = 0; i < pairs.length; i++) {
    kv = pairs[i].split('=');
    try { got[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); } catch (e) { /* a broken link part is skipped */ }
  }
  if (PLACES.indexOf(got.loc) > -1) { S.loc = got.loc; has.loc = true; }
  if (USES.indexOf(got.use) > -1) { S.use = got.use; has.use = true; }
  if (got.per === 'year') S.per = 'year';
  for (i = 0; i < KEYS.length; i++) {
    k = KEYS[i]; f = FIELDS[k];
    if (got[f.q] == null || (f.t !== 'pick' && !/^\d+(\.\d+)?$/.test(got[f.q]))) continue;
    n = parseField(k, got[f.q]);
    if (n !== undefined) S.set[k] = f.t === 'pick' ? n : clamp(n, f.min, k === 'down' ? 1000000 : f.max);
  }
  if (got.on != null) {
    list = got.on.split(',');
    for (i = 0; i < FLAGS.length; i++) S.on[FLAGS[i]] = list.indexOf(FLAGS[i]) > -1;
  }
  return { S: tidy(S), has: has };
}

/* ------------------------------------------------------------------ what the page says: helpers for the wording */
function kind(c) { return c.R.input.use; }                 // rent, par or fam (Downsize shows no numbers)
function isRent(c) { return kind(c) === 'rent'; }
function bro(c) { return c.R.place.county === 'bro'; }
function sav(c, id) { return find(c.R.savings, id); }
function fee(c, id) { return find(c.R.cost.fees, id); }
function perWord(c) { return c.S.per === 'year' ? 'a year' : 'a month'; }
function chip(s) { return '<span class="st st-' + s + '"><svg class="st-ic" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><use href="#st-' + s + '"/></svg>' + esc(D.STATUS[s]) + '</span>'; }
function how(s, what) {
  return card(s.card) ? '<a class="sv-a" href="#p-' + s.card + '">' + (s.status === 'call' ? 'See how to ask' : 'See how to file') + '<span class="sr-only">: ' + what + '</span></a>' : '';
}
function seg(cls, n) { n = Math.round(n); return n > 0 ? '<i class="sg ' + cls + '" style="--s:' + n + '"></i>' : ''; }
function r4(n) { return String(Math.round(clamp(n, 0, 1) * 10000) / 10000); }
// The fields that still hold our estimate in this scenario: the note under the answer counts them.
function estimates(c) {
  var R = c.R, list = ['install', 'lot'];
  R.cost.fees.forEach(function (f) { list.push(f.id === 'county' ? 'feeCounty' : f.id === 'city' ? 'feeCity' : 'feeSchool'); });
  if (R.input.pay === 'loan') list.push('rate');
  if (isRent(c)) list.push('rent');
  list.push('ins', 'upkeep');
  if (isRent(c)) list.push('emptyWeeks');
  list.push('assessedAdd', 'valuePct');
  return list.filter(function (k) { return c.S.set[k] == null; });
}
// The name a saving goes by on this page, and the sentences beside its switch.
function savingText(c, s) {
  var R = c.R, per = perWord(c), t;
  switch (s.id) {
    case 'waiver':
      t = ' for a home rented to a household at or under ' + fig(c, 'rent.tier', 'num') + '% of the area\'s median income, at a rent of ' + fig(c, 'rent.cap') + ' or less with utilities';
      return bro(c) ? { name: 'School impact fee waiver', the: 'the School Board fee waiver', who: 'the School Board\'s',
          help: 'The School Board can waive this fee' + t + '. It has to approve it first.' }
        : { name: 'County fee exemption', the: 'the county fee exemption', who: 'the county\'s',
          help: 'The county can exempt ' + (R.place.id === 'mdc' ? 'these fees' : 'its fees') + t + ', if the Impact Fee Section approves.' };
    case 'school':
      return { name: 'School fee exemption', the: 'the school fee exemption', who: 'the county\'s',
        help: 'The county can exempt a home that adds no school-age children. It is not confirmed for backyard homes. Ask first, and ask on the building permit application.' };
    case 'boost':
      return { name: 'First-year write-off', the: 'the first-year write-off',
        help: 'About ' + fig(c, 'tax.boost.share', 'pct') + ' of the cost: appliances, furniture, fencing, walkways and a driveway. Worth about ' + fig(c, 'tax.boost.tenYear') +
          ' over ten years, because the write-offs come sooner, not twice.' + (R.tax.boost.unused > 0 ? ' ' + fig(c, 'tax.boost.unused') + ' of it waits for later years.' : '') };
    case 'granny':
      return { name: 'Granny flat property tax reduction', the: 'the granny flat reduction',
        help: 'For a parent or grandparent who is 62 or older and lives there. It takes the home\'s added value off your assessment' +
          (R.granny.capped ? ', up to ' + fig(c, 'DATA.GRANNY_CAP', 'pct') + ' of the whole: ' + fig(c, 'granny.reduced') + ' here.' : '.') };
    case 'dep':
      return { name: esc(s.label), the: 'the dependent credit',
        help: 'Needs your parent\'s gross income under $5,500 in ' + fig(c, 'taxYear', 'num') + ', and you paying more than half of their support.' };
    case 'hoh':
      return { name: 'Head of household status', the: 'head of household status',
        help: s.needs === 'unmarried' ? 'Head of household is for unmarried owners who claim the parent. Set how you file to Single to count it.'
          : !isOn(c.S, 'dep') ? 'Count the dependent credit first. Head of household needs a parent you can claim.'
          : 'For unmarried owners who claim the parent and pay more than half the cost of keeping up the home.' };
    default:
      return { name: 'Home office deduction', the: 'the home office deduction',
        help: 'For the self-employed who use the home for the business and nothing else. Figured the simple way at your ' + fig(c, 'rate', 'pct') + ' tax rate. Ask a tax preparer which method fits.' };
  }
}
// A saving row beside its switch: the status, the name, what it takes, and where the card is.
function savingMain(c, id) {
  var s = sav(c, id), t;
  if (!s) return '';
  t = savingText(c, s);
  return '<span class="sv-t">' + chip(s.status) + '<b id="svt-' + id + '">' + t.name + '</b></span>' +
    '<span class="sv-h" id="svh-' + id + '">' + t.help + '</span>' + how(s, t.the);
}
function savingAmount(c, id) {
  var s = sav(c, id), p = 'savings.' + id + '.amount';
  if (!s || !(s.amount > 0)) return '';
  return s.id === 'boost' ? fig(c, 'tax.boost.savings') + '<small>less tax in year one</small>'
    : s.when === 'upfront' ? fig(c, p) + '<small>off day one</small>'
    : fig(c, p, 'usd-per') + '<small>' + perWord(c) + '</small>';
}
function counted(c, flag) {            // is this saving inside the totals right now
  var s = sav(c, flag);
  return s ? !!s.counted : isOn(c.S, flag);
}
function blocked(c, flag) {            // a switch that cannot turn on yet
  var s = sav(c, flag);
  return flag === 'hoh' && !!s && (s.needs === 'unmarried' || !isOn(c.S, 'dep'));
}
function tagView(c, k) {
  var f = FIELDS[k], ex = f.tag === 'ex';
  if (c.S.set[k] == null) return '<span class="tag">' + (ex ? 'Example' : 'Estimate') + '</span>';
  return '<span class="tag is-yours">Yours</span><button type="button" class="rw-reset" data-reset="' + k + '">' + (ex ? 'Use the example' : 'Use our estimate') +
    '<span class="sr-only"> for ' + f.name.charAt(0).toLowerCase() + f.name.slice(1) + '</span></button>';
}
// One shape for every case, so the line holds its length while a slider moves.
function paybackText(c) {
  var R = c.R, cash = fig(c, 'upfront.cash');
  if (!(R.upfront.cash > 0)) return 'You put nothing in on day one.';
  return 'Your ' + cash + (R.payback ? ' is back in year ' + fig(c, 'payback', 'int') + '.' : ' is not back in 30 years.');
}
function stepsFor(c) {
  var set = STEPS[kind(c)], loc = c.S.loc, tier = M.DATA.RENT_CAP[c.R.place.county].tier;
  function fill(t) {
    return esc(pick(t, loc)).replace(/\{tier\}/g, tier).replace(/\{tel:([a-z0-9-]+)\}\s?/g, function (m, id) { var n = firstTel(id, loc); return n ? telLink(n) + '. ' : ''; });
  }
  return { steps: set.steps.map(function (s) { return [fill(s[0]), fill(s[1])]; }), note: fill(set.note) };
}
// The ten columns of the long-run chart: how tall each stands against the largest, and where the day-one money sits.
function chartOf(c) {
  var R = c.R, ys = R.years.slice(0, 10), cash = Math.max(0, R.upfront.cash), up = cash, down = 0;
  ys.forEach(function (y) { up = Math.max(up, y.cum); down = Math.max(down, -y.cum); });
  return { ys: ys, cash: cash, up: up, down: down, share: up + down > 0 ? up / (up + down) : 1 };
}

/* ------------------------------------------------------------------ VIEW: every sentence, bar and list the page builds */
var VIEW = {
  // --- the answer
  'for': function (c) { return 'Estimate for ' + { rent: 'a rental', par: 'housing your parents', fam: 'family, guests or work' }[kind(c)] + ' in ' + esc(c.R.place.inName); },
  r1: function () { return 'all in'; },
  r2: function (c) { var n = c.R.year1.net; return n >= 0 ? 'left over' : isRent(c) ? '<i class="bang" aria-hidden="true"></i>you add' : 'you pay'; },
  r3: function (c) { var n = c.R.ten.net; return n >= 0 ? 'kept' : isRent(c) ? 'paid in' : 'spent'; },
  s1: function (c) {
    var R = c.R;
    return (R.loan.amount > 0 ? 'You bring ' + fig(c, 'upfront.cash') + '. A loan covers ' + fig(c, 'upfront.borrowed') + '.' : 'You pay it all on day one, with no loan.') +
      (R.cost.waived > 0 ? ' Counted: ' + fig(c, 'cost.waived') + ' of fees off, not yet approved.' : '');
  },
  s2: function (c) {
    var R = c.R, loan = R.loan.amount > 0, x = fig(c, 'after.net/12', 'usd-abs');
    // each pair of wordings runs to the same length, so the lines under it hold still when the answer changes sign
    var after = !loan ? 'There is no loan payment to make.' : isRent(c) && R.after.net < 0 ? 'You still add ' + x + ' once the loan is paid off.' : x + ' once the loan is paid off.';
    if (isRent(c)) return (R.year1.net < 0 ? 'The rent does not cover the ' + (loan ? 'loan and the bills. ' : 'bills. ') : loan ? 'What is left after the loan, the bills and tax. ' : 'What is left after the bills and tax. ') + after;
    return (loan ? 'The loan and the bills' : 'The bills') + (R.saved.yearly > 0 ? ', less the tax breaks counted. ' : ', with no tax breaks counted. ') + after;
  },
  s3: function (c) {
    var R = c.R, worth = R.value.amount > 0 ? ' The property may be worth about ' + fig(c, 'value.amount') + ' more.' : ' No added value is counted for the property.';
    return (isRent(c) ? paybackText(c) : 'On top of day one.') + worth;
  },
  // The line under the three figures: unapproved money that is counted, or else the largest saving that is not.
  maybe: function (c) {
    var R = c.R, loc = c.S.loc, all = R.savings.filter(function (s) { return s.amount > 0 && s.id !== 'writeoffs'; });
    var by = function (a, b) { return b.amount - a.amount; };
    var risky = all.filter(function (s) { return s.counted && s.status === 'call'; }).sort(by);
    var open = all.filter(function (s) { return !s.counted; }).sort(by);
    var s = risky[0] || open[0], t, a, tel, text, more, rest;
    if (!s) return '';
    t = savingText(c, s); a = fig(c, 'savings.' + s.id + '.amount'); tel = firstTel(s.card, loc);
    rest = (risky[0] ? risky : open).slice(1);
    if (risky[0]) {
      text = s.id === 'office' ? '<b>Counted, not yet confirmed:</b> ' + t.the + ', ' + a + ' a year. Ask a tax preparer before you budget on it.'
        : '<b>Counted, not yet approved:</b> ' + t.the + ', ' + a + '. Get ' + t.who + ' yes in writing before you budget on it.';
    } else {
      text = '<b>Not counted:</b> ' + a + ({
        waiver: ' off day one if ' + (bro(c) ? 'the School Board waives its impact fee' : 'the county exempts its fees') + '.',
        school: ' off day one if the county exempts the school fee.',
        boost: ' less tax in year one with the first-year write-off.',
        granny: ' a year off your property tax with the granny flat reduction.',
        dep: ' a year off your tax with the dependent credit.',
        hoh: ' a year off your tax as head of household.',
        office: ' a year off your tax with a home office.'
      })[s.id] + (s.status !== 'call' ? '' : s.id === 'office' ? ' Ask a tax preparer first.' : tel ? ' Ask first: ' + telLink(tel) + '.' : ' Ask first.');
    }
    more = rest.length ? ' <a href="#sv-' + rest[0].id + '">and ' + rest.length + ' more<span class="sr-only"> ' + (risky[0] ? 'counted the same way' : 'not counted') + '</span></a>' : '';
    return '<p class="maybe' + (risky[0] ? ' is-counted' : '') + '"><span>' + text + '</span> ' + how(s, t.the) + more + '</p>';
  },
  cashnote: function (c) { return 'You pay ' + fig(c, 'cost.total') + ' on day one. No loan payment.'; },
  'sc-down': function () { return '<span>' + usd(FIELDS.down.min) + '</span><span>' + usd(FIELDS.down.max) + '</span>'; },
  'sc-rent': function (c) {
    return '<span>' + usd(FIELDS.rent.min) + '</span>' + (SHOW.cap(c) ? '<b>Rent cap ' + fig(c, 'rent.cap') + '</b>' : '') + '<span>' + usd(FIELDS.rent.max) + '</span>';
  },
  'sc-value': function () { return '<span>' + FIELDS.valuePct.min + '%</span><span>' + FIELDS.valuePct.max + '%</span>'; },
  note: function (c) {
    var n = estimates(c).length;
    return 'Estimates, never a quote. ' + (n === 0 ? 'You have set every number yourself.' : n === 1 ? 'One of these numbers is still our estimate, and you can change it below.'
      : (WORDS[n] || n) + ' of these numbers are estimates, and you can change every one below.') + ' Not tax, legal or lending advice.';
  },
  // --- day one
  bar1l: function (c) {
    var R = c.R;
    return 'All in, ' + fig(c, 'cost.total') + ': the home ' + fig(c, 'cost.home') + ', installation ' + fig(c, 'cost.install') + ', lot work and permits ' + fig(c, 'cost.lot') +
      ', fees ' + fig(c, 'cost.feesTotal') + (R.cost.waived > 0 ? ', less ' + fig(c, 'cost.waived') + ' counted as exempt' : '') + '.';
  },
  bar1: function (c) {
    var R = c.R, h = seg('t1', R.cost.home) + seg('t2', R.cost.install) + seg('t3', R.cost.lot);
    R.cost.fees.forEach(function (f) { if (!f.counted) h += seg(f.waive ? 'is-poss' : 't4', f.amount); });
    return '<span class="splitbar" role="img" aria-labelledby="bar1L">' + h + '</span>';
  },
  'l-county': function (c) { return feeLabel(c, 'county'); },
  'l-city': function (c) { return feeLabel(c, 'city'); },
  'l-school': function (c) { return feeLabel(c, 'school'); },
  'h-county': function (c) {
    var f = fee(c, 'county'), p = 'cost.fees.county.';
    if (!f) return '';
    return (f.low < f.high ? 'The county schedule runs ' + fig(c, p + 'low') + ' to ' + fig(c, p + 'high') + ' for a home this size.' + (c.S.set.feeCounty == null ? ' We used the middle.' : '')
        : 'The county\'s published rate for a home this size.') +
      (f.alt ? ' If the county applies its multi-family rate: about ' + fig(c, p + 'alt.0') + ' to ' + fig(c, p + 'alt.1') + '. Ask which.' : '');
  },
  'h-city': function (c) {
    if (!fee(c, 'city')) return '';
    return isRent(c) ? 'The City\'s own impact fees, about $8,100 plus a 3% charge, can be postponed for a certified affordable unit. They are not waived.' : 'The City\'s own impact fees, at its published rate for a home this size.';
  },
  'h-school': function (c) { return !fee(c, 'school') ? '' : bro(c) ? 'The School Board\'s published single-family rate.' : 'The school district\'s published rate for a home this size.'; },
  'l-waived': function (c) { return '<i class="key is-off"></i>' + (bro(c) ? 'Fee waiver counted' : 'Fee exemption counted'); },
  'a-waived': function (c) { return c.R.cost.waived > 0 ? NEG + fig(c, 'cost.waived') : '<small>None</small>'; },
  'h-loan': function (c) { return fig(c, 'loan.pmt') + ' a month for ' + fig(c, 'loan.years', 'num') + ' years.'; },
  'svm-waiver': function (c) { return savingMain(c, 'waiver'); }, 'svn-waiver': function (c) { return savingAmount(c, 'waiver'); },
  'svm-school': function (c) { return savingMain(c, 'school'); }, 'svn-school': function (c) { return savingAmount(c, 'school'); },
  'svm-boost': function (c) { return savingMain(c, 'boost'); },   'svn-boost': function (c) { return savingAmount(c, 'boost'); },
  // --- each month
  'h-month': function (c) { return isRent(c) ? 'Where the rent goes' : 'What it costs each month'; },
  bar2l: function (c) {
    var R = c.R, out = R.year1.moneyOut.filter(function (o) { return o.amount > 0; }).map(function (o) {
      return o.label.charAt(0).toLowerCase() + o.label.slice(1) + ' ' + fig(c, 'year1.moneyOut.' + o.id + '.amount', 'usd-per');
    }).join(', ');
    if (!isRent(c)) return 'What it costs ' + perWord(c) + ': ' + out + '.';
    return 'Of the ' + fig(c, 'year1.moneyIn.rent.amount', 'usd-per') + ' rent ' + perWord(c) + ': ' + out + '. ' +
      (R.year1.net >= 0 ? fig(c, 'year1.net', 'usd-per') + ' is left over.' : 'You add ' + fig(c, 'year1.net', 'usd-abs-per') + '.');
  },
  bar2: function (c) {
    var R = c.R, y = R.year1, tint = { loan: 't1', ins: 't2', ptax: 't3', upkeep: 't4', empty: 't2', tax: 't3' }, h = '', out = 0, short;
    y.moneyOut.forEach(function (o) { if (o.amount > 0) { h += seg(tint[o.id], o.amount); out += o.amount; } });
    if (isRent(c) && y.net > 0) h += seg('is-left', y.net);
    short = isRent(c) && y.net < 0 && out > 0;
    return '<span class="splitbar' + (short ? ' is-short" style="--short:' + r4(-y.net / out) : '') + '" role="img" aria-labelledby="bar2L">' + h + '</span>';
  },
  'h-rent': function (c) {
    var R = c.R, loc = c.S.loc, tel, h;
    if (!isRent(c)) return '';
    h = bro(c) ? 'Our published rent range covers Miami. For Broward, check listings near you before you count on this figure.'
      : 'A small furnished one-bedroom on a long lease in Miami rents for about $1,600 to $1,950. Unfurnished rents for less.';
    if (loc === 'mia') { tel = firstTel('mia-rules', loc); h += ' The City of Miami requires 450 sq ft for a one-bedroom ADU. Ask City zoning how they will permit a 401 sq ft home' + (tel ? ': ' + telLink(tel) + '.' : '.'); }
    if (R.rent.capped) h += ' <b>The ' + (bro(c) ? 'waiver' : 'exemption') + ' caps rent at ' + fig(c, 'rent.cap') + ' with utilities. These numbers use ' + fig(c, 'rent.used') + '.</b>';
    return h;
  },
  'h-ptax': function (c) {
    return isRent(c) ? 'The county adds the home to your assessment and taxes it with no exemption, because it is rented.'
      : 'The county adds the home to your assessment. Lived in by family rent-free, it joins your homestead exemption.';
  },
  'h-mills': function (c) {
    return !c.R.place.millsRange ? '' : 'Depends on your city: ' + fig(c, 'place.millsRange.0*100') + ' to ' + fig(c, 'place.millsRange.1*100') + ' a year per $100,000 here. We used ' + fig(c, 'place.mills*100') + '.';
  },
  'l-tax': function (c) { return '<i class="key t3"></i>' + (isRent(c) && c.R.tax.tax < 0 ? 'Income tax saved' : 'Income tax on the rent'); },
  'a-tax': function (c) {
    var t = isRent(c) ? c.R.tax.tax : 0;
    return !isRent(c) ? '' : (t > 0 ? NEG : t < 0 ? POS : '') + fig(c, 'tax.tax', 'usd-abs-per');
  },
  'h-tax': function (c) {
    var R = c.R, s = sav(c, 'writeoffs');
    if (!isRent(c)) return '';
    return 'Figured on the ' + fig(c, 'taxYear', 'num') + ' federal tax tables at your income. The write-offs cut it by about ' + fig(c, 'tax.writeoffValue', 'usd-per') + ' ' + perWord(c) +
      ': loan interest, running costs and one slice of the cost every year for ' + fig(c, 'DATA.LIFE', 'num') + ' years.' +
      (R.tax.unused > 0 ? ' ' + fig(c, 'tax.unused') + ' of this year\'s loss waits for later years.' : '') + (s ? ' ' + how(s, 'the write-offs') : '');
  },
  'a-breaks': function (c) { return c.R.saved.yearly > 0 && !isRent(c) ? POS + fig(c, 'saved.yearly', 'usd-per') : '<small>None</small>'; },
  'l-net': function (c) { var n = c.R.year1.net; return n >= 0 ? 'Left over' : isRent(c) ? 'You add' : 'You pay'; },
  'h-net': function (c) {
    var R = c.R;
    if (!isRent(c)) return 'What the home costs to keep, after the tax breaks counted.';
    return R.year1.net >= 0 ? 'What is left of the rent after every line above.' : R.loan.amount > 0 ? 'More money down, a longer loan or a higher rent changes that.' : 'A higher rent changes that.';
  },
  'a-net': function (c) {
    var n = c.R.year1.net;
    return n >= 0 ? fig(c, 'year1.net', 'usd-per') : isRent(c) ? '<span class="neg">' + NEG + fig(c, 'year1.net', 'usd-abs-per') + '</span>' : fig(c, 'year1.net', 'usd-abs-per');
  },
  'svm-granny': function (c) { return savingMain(c, 'granny'); }, 'svn-granny': function (c) { return savingAmount(c, 'granny'); },
  'svm-dep': function (c) { return savingMain(c, 'dep'); },       'svn-dep': function (c) { return savingAmount(c, 'dep'); },
  'svm-hoh': function (c) { return savingMain(c, 'hoh'); },       'svn-hoh': function (c) { return savingAmount(c, 'hoh'); },
  'svm-office': function (c) { return savingMain(c, 'office'); }, 'svn-office': function (c) { return savingAmount(c, 'office'); },
  // --- ten years
  tensum: function (c) {
    if (!isRent(c)) return 'Over ten years the home costs about ' + fig(c, 'ten.net', 'usd-abs') + ' to own, on top of day one.';
    return c.R.ten.net < 0 ? 'At these numbers you pay in about ' + fig(c, 'ten.net', 'usd-abs') + ' over ten years.' : paybackText(c);
  },
  chartl: function (c) {
    if (!isRent(c)) return '';
    return 'Money kept so far, year by year: ' + fig(c, 'years.0.cum') + ' after year 1, ' + fig(c, 'years.4.cum') + ' after year 5 and ' + fig(c, 'years.9.cum') + ' after year 10. ' + paybackText(c);
  },
  chart: function (c) {
    var R = c.R, k, h, i;
    if (!isRent(c)) return '';
    k = chartOf(c);
    h = '<span class="yc-top"><span>Money kept so far, years 1 to 10</span>' + (k.cash > 0 ? '<span class="yc-key"><i></i><span>' + fig(c, 'upfront.cash') + ' you put in</span></span>' : '') + '</span>' +
      '<span class="yc-plot" role="img" aria-labelledby="ycL" style="--pos:' + r4(k.share) + '">' + (k.cash > 0 ? '<span class="yc-rule" style="--y:' + r4(k.cash / k.up) + '"></span>' : '');
    k.ys.forEach(function (y, n) {
      var up = y.cum >= 0, back = R.payback === n + 1;
      h += '<span class="yc-col' + (up ? '' : ' is-neg') + (back ? ' is-back' : '') + '" style="--h:' + r4(up ? (k.up ? y.cum / k.up : 0) : -y.cum / k.down) + '">' + (back ? '<b>Back</b>' : '') + '<i></i></span>';
    });
    h += '</span><span class="yc-axis" aria-hidden="true">';
    for (i = 1; i <= 10; i++) h += '<span>' + i + '</span>';
    return h + '</span>';
  },
  tenrows: function (c) {
    var h = '', i, p;
    for (i = 0; i < 10; i++) {
      p = 'years.' + i + '.';
      h += '<tr><th scope="row">' + (i + 1) + '</th><td class="num">' + fig(c, p + 'keep') + '</td><td class="num">' + fig(c, p + 'cum') + '</td><td class="num">' + fig(c, p + 'balance') + '</td></tr>';
    }
    return h;
  },
  'l-ten': function (c) { var n = c.R.ten.net; return n >= 0 ? 'Kept over ten years' : isRent(c) ? 'Paid in over ten years' : 'Spent over ten years'; },
  'l-after': function (c) { return c.R.after.net >= 0 ? 'Left over each month once the loan is paid off' : 'You pay each month once the loan is paid off'; },
  'val-read': function (c) { return 'about ' + fig(c, 'value.amount'); },
  'val-band': function (c) {
    return 'The marked stretch of the track, ' + fig(c, 'DATA.VALUE.band.0', 'pct') + ' to ' + fig(c, 'DATA.VALUE.band.1', 'pct') + ', is where the evidence we found falls: ' +
      fig(c, 'value.low') + ' to ' + fig(c, 'value.high') + ' here.';
  },
  // --- the steps, the plain answers
  steps: function (c) {
    return stepsFor(c).steps.map(function (s) { return '<li><b>' + s[0] + '</b> <span>' + s[1] + '</span></li>'; }).join('');
  },
  stepsnote: function (c) { return stepsFor(c).note; },
  'pa-rate': function (c) {
    return 'No. A write-off shrinks your tax bill. It does not refund what you spent. At your ' + fig(c, 'rate', 'pct') + ' tax rate, every $1,000 in write-offs trims your tax by about ' + fig(c, 'rate*1000') + '.';
  }
};
function feeLabel(c, id) {
  var f = fee(c, id);
  return !f ? '' : '<i class="key ' + (f.counted ? 'is-off' : f.waive ? 'is-poss' : 't4') + '"></i>' + esc(f.label);
}
function view(name, c) {
  if (VIEW[name]) return VIEW[name](c);
  if (name.slice(0, 2) === 't-') return tagView(c, name.slice(2));
  if (name.slice(0, 4) === 'sws-') return counted(c, name.slice(4)) ? 'Counted' : 'Not counted';
  return '';
}

/* ------------------------------------------------------------------ SHOW: what applies to this lot and this plan */
var SHOW = {
  num: function (c) { return c.S.use !== 'down'; },
  down: function (c) { return c.S.use === 'down'; },
  rent: isRent,
  par: function (c) { return kind(c) === 'par'; },
  fam: function (c) { return kind(c) === 'fam'; },
  family: function (c) { return !isRent(c); },
  loan: function (c) { return c.R.input.pay === 'loan'; },
  cash: function (c) { return c.R.input.pay !== 'loan'; },
  'has-loan': function (c) { return c.R.loan.amount > 0; },
  'fee-county': function (c) { return !!fee(c, 'county'); },
  'fee-city': function (c) { return !!fee(c, 'city'); },
  'fee-school': function (c) { return !!fee(c, 'school'); },
  'city-unknown': function (c) { return c.R.cost.cityFeesUnknown; },
  'has-waiver': function (c) { return c.R.cost.fees.some(function (f) { return !!f.waive; }); },
  'off-list': function (c) { return !!(sav(c, 'waiver') || sav(c, 'school') || sav(c, 'boost')); },
  'sv-waiver': function (c) { return !!sav(c, 'waiver'); },
  'sv-school': function (c) { return !!sav(c, 'school'); },
  'sv-boost': function (c) { return !!sav(c, 'boost'); },
  'sv-granny': function (c) { return !!sav(c, 'granny'); },
  'sv-dep': function (c) { return !!sav(c, 'dep'); },
  'sv-hoh': function (c) { return !!sav(c, 'hoh'); },
  'sv-office': function (c) { return !!sav(c, 'office'); },
  'mills-range': function (c) { return !!c.R.place.millsRange; },
  cap: function (c) { var s = sav(c, 'waiver'); return isRent(c) && !!s && s.counted; },
  changed: function (c) { return changed(c.S); },
  'neg-month': function (c) { return c.R.year1.net < 0; },
  'neg-ten': function (c) { return c.R.ten.net < 0; }
};
function show(name, c) { return SHOW[name] ? !!SHOW[name](c) : true; }
// The custom properties a slider's frame carries: how far it is filled, and the marks on its track.
function sliderStyle(c, k) {
  var f = FIELDS[k], v = cur(c, k), s = '--pn:' + r4((clamp(v, f.min, f.max) - f.min) / (f.max - f.min));
  if (k === 'valuePct') s += ';--b0:' + r4(M.DATA.VALUE.band[0]) + ';--b1:' + r4(M.DATA.VALUE.band[1]);
  if (k === 'rent' && c.R.rent) s += ';--cap:' + r4((clamp(c.R.rent.cap, f.min, f.max) - f.min) / (f.max - f.min));
  return s;
}
// What a slider says to a screen reader in place of its bare number.
function sliderText(c, k) {
  var v = cur(c, k);
  return k === 'valuePct' ? v + '%, about ' + usd(c.R.value.amount) : usd(v) + (FIELDS[k].per || '');
}

/* ================================================================== THE PAGE (browser only) */
function boot() {
  var doc = root.document, page = doc && doc.getElementById('main');
  if (!page || !doc.getElementById('rn')) return;
  var $ = function (id) { return doc.getElementById(id); };
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var q = readQuery(root.location.search), S = q.S, c = null;
  var ui = { view: 'mine', chips: {}, q: '', open: {} }, dirKey = '';
  var typing = null, frame = 0, urlTimer = 0, sayTimer = 0, sayNext = '', quietSay = true, sayList = false;

  /* ---- where to start: the link, then what this browser remembers, then the home page's pick */
  (function () {
    var st = null, home = null;
    try { st = JSON.parse(root.localStorage.getItem(STORE) || 'null'); home = root.localStorage.getItem(HOME_USE); } catch (e) { /* private mode: start from the defaults */ }
    if (!q.has.loc && st && PLACES.indexOf(st.loc) > -1) S.loc = st.loc;
    if (!q.has.use) S.use = st && USES.indexOf(st.use) > -1 ? st.use : home ? HOME_MAP[home] || 'fam' : S.use;
    tidy(S);
  })();

  /* ---- drawing */
  function same(a, b) {                              // make a like b in place; false when their shapes differ
    var i, at, x, y;
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) return false;
    if (a.nodeType === 3) { if (a.data !== b.data) a.data = b.data; return true; }
    if (a.nodeType !== 1) return true;
    x = a.childNodes; y = b.childNodes;
    if (x.length !== y.length) return false;
    for (i = a.attributes.length - 1; i >= 0; i--) { at = a.attributes[i].name; if (!b.hasAttribute(at)) a.removeAttribute(at); }
    for (i = 0; i < b.attributes.length; i++) { at = b.attributes[i]; if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value); }
    for (i = 0; i < x.length; i++) if (!same(x[i], y[i])) return false;
    return true;
  }
  function morph(el, html) {                         // keep the nodes when only words and sizes change, so bars can ease
    var t = el.cloneNode(false), x = el.childNodes, y, i, ok;
    t.innerHTML = html; y = t.childNodes; ok = x.length === y.length;
    for (i = 0; ok && i < x.length; i++) ok = same(x[i], y[i]);
    if (!ok) el.innerHTML = html;
  }
  function paint() {
    each(page.querySelectorAll('[data-show]'), function (el) { var on = show(el.getAttribute('data-show'), c); if (el.hidden === on) el.hidden = !on; });
    each(page.querySelectorAll('[data-v]'), function (el) { var h = view(el.getAttribute('data-v'), c); if (el._h !== h) { morph(el, h); el._h = h; } });
    each(page.querySelectorAll('[data-fig]'), function (el) {
      var v = val(c, el.getAttribute('data-fig')), t;
      if (v === undefined) return;
      t = fmt(v, el.getAttribute('data-fmt'), c);
      if (el.textContent !== t) el.textContent = t;
    });
    each(page.querySelectorAll('[data-k]'), function (el) {
      var k = el.getAttribute('data-k'), v = cur(c, k);
      if (el.type === 'radio') el.checked = String(k === 'filing' && v === 'hoh' && el.name === 'filing-p' ? 'single' : v) === el.value;
      else if (el.tagName === 'SELECT') { if (el.value !== v) el.value = v; }
      else if (el.type === 'range') { if (+el.value !== +v) el.value = v; el.setAttribute('aria-valuetext', sliderText(c, k)); }
      else if (el !== typing) { var t = fieldText(c, k); if (el.value !== t) el.value = t; }
    });
    each(page.querySelectorAll('[data-rng]'), function (el) {
      sliderStyle(c, el.getAttribute('data-rng')).split(';').forEach(function (p) { var i = p.indexOf(':'); el.style.setProperty(p.slice(0, i), p.slice(i + 1)); });
    });
    each(page.querySelectorAll('[data-on]'), function (el) {
      var f = el.getAttribute('data-on'), off = blocked(c, f);
      el.checked = counted(c, f);
      if (off) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled');
    });
  }
  function render() {
    frame = 0;
    c = context(S);
    var key = [S.loc, kind(c), S.use === 'down', ui.view, Object.keys(ui.chips).sort().join(), ui.q].join('|');
    if (key !== dirKey) { dirKey = key; drawDirectory(); }
    paint();
    clearTimeout(urlTimer); urlTimer = setTimeout(remember, 250);
    clearTimeout(sayTimer); sayTimer = setTimeout(say, 700);
  }
  function schedule() { if (!frame) frame = root.requestAnimationFrame ? root.requestAnimationFrame(render) : setTimeout(render, 16); }
  function remember() {
    try { root.history.replaceState(null, '', root.location.pathname + writeQuery(S) + root.location.hash); } catch (e) { /* a sandboxed frame: the link stays as it was */ }
    try { root.localStorage.setItem(STORE, JSON.stringify({ loc: S.loc, use: S.use })); } catch (e) { /* storage is off */ }
  }
  // One polite sentence, once the controls have settled.
  function say() {
    var R = c.R, out = $('rnSay'), t;
    if (quietSay) { quietSay = false; sayNext = ''; sayList = false; return; }
    if (sayList) { sayList = false; out.textContent = $('dirCount').textContent; return; }
    if (S.use === 'down') t = 'Downsizing into the backyard home. No numbers for this one. Book a free call.';
    else t = view('for', c).replace(/&#39;/g, '\'').replace(/&amp;/g, '&') + '. About ' + usd(R.cost.total) + ' all in. About ' + usd(Math.abs(R.year1.net / 12)) + ' a month ' + strip(view('r2', c)) + '. About ' + usd(Math.abs(R.ten.net)) + ' ' + strip(view('r3', c)) + ' in ten years.';
    out.textContent = (sayNext ? sayNext + ' ' : '') + t; sayNext = '';
  }
  function strip(h) { return h.replace(/<[^>]*>/g, ''); }

  /* ---- changing a number */
  function setKey(k, v) {
    if (k === 'loc' || k === 'use' || k === 'per') S[k] = v;
    else { S.set[k] = v; if (v === defaultOf(S, k)) delete S.set[k]; }
    schedule();
  }
  function fieldBox(el) { return el.closest('.rw-sub, .rw, .lev, .rn-val'); }
  function clearLimit(el) {
    var box = fieldBox(el), old = box && box.querySelector('.field-err');
    if (old) { old.parentNode.removeChild(old); el.removeAttribute('aria-invalid'); }
  }
  function commit(el) {                              // a typed value is finished: keep it inside its limits and say so
    var k = el.getAttribute('data-k'), n = parseField(k, el.value), lim, msg, box, p;
    typing = null;
    if (n !== undefined) {
      lim = limits(c, k); msg = limitText(c, k, n);
      setKey(k, clamp(n, lim[0], lim[1]));
      clearLimit(el);
      if (msg && (box = fieldBox(el))) {
        p = doc.createElement('div'); p.className = 'field-err'; p.textContent = msg; box.appendChild(p);
        sayNext = msg;
      }
    }
    schedule();
  }
  page.addEventListener('input', function (e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-k'), n, lim;
    if (el.id === 'dirQ') { ui.q = el.value; if (ui.q) setView('all'); sayList = true; schedule(); return; }
    if (!k || el.type === 'radio' || el.tagName === 'SELECT') return;
    if (el.type === 'range') { setKey(k, +el.value); return; }
    n = parseField(k, el.value);
    if (n === undefined) return;                     // nothing usable typed yet: the numbers wait
    typing = el; clearLimit(el); lim = limits(c, k);
    setKey(k, clamp(n, lim[0], lim[1]));
  });
  page.addEventListener('change', function (e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-k'), f = el.getAttribute && el.getAttribute('data-on'), t;
    if (el.name === 'dirview') { setView(el.value); sayList = true; schedule(); return; }
    if (f) {
      if (el.getAttribute('aria-disabled') === 'true') { el.checked = false; sayNext = strip(savingText(c, sav(c, f)).help); schedule(); return; }
      S.on[f] = el.checked; tidy(S);
      t = sav(context(S), f);
      sayNext = t ? strip(savingText(context(S), t).name) + (el.checked ? ' counted' + (t.status === 'call' ? ', not yet approved.' : '.') : ' not counted.') : '';
      swap(); schedule(); return;
    }
    if (!k) return;
    if (el.type === 'radio' || el.tagName === 'SELECT') { setKey(k, k === 'loc' || k === 'use' || k === 'per' ? el.value : parseField(k, el.value)); swap(); return; }
    if (el.type !== 'range') commit(el);
  });
  page.addEventListener('focusin', function (e) { var el = e.target; if (el.classList && el.classList.contains('fld') && el.select) setTimeout(function () { if (doc.activeElement === el) el.select(); }, 0); });
  page.addEventListener('focusout', function (e) { if (e.target === typing) commit(e.target); });
  page.addEventListener('keydown', function (e) {
    var el = e.target;
    if (e.key === 'Enter' && el.classList && el.classList.contains('fld')) { e.preventDefault(); commit(el); render(); el.select(); }
  });
  each(page.querySelectorAll('form'), function (f) { f.addEventListener('submit', function (e) { e.preventDefault(); }); });
  // A discrete choice: the three figures cross-fade once, and the bars are free to ease.
  function swap() { var h = $('hzAll'); if (!h) return; h.classList.remove('is-swap'); void h.offsetWidth; h.classList.add('is-swap'); }
  page.addEventListener('pointerdown', function (e) { if (e.target.type === 'range') page.classList.add('is-drag'); });
  root.addEventListener('pointerup', function () { page.classList.remove('is-drag'); });
  root.addEventListener('pointercancel', function () { page.classList.remove('is-drag'); });

  page.addEventListener('click', function (e) {
    var t = e.target, b = t.closest ? t.closest('button, a') : null, k, el, id;
    if (!b) return;
    if ((k = b.getAttribute('data-reset'))) {
      el = fieldBox(b); delete S.set[k]; render();
      el = el && el.querySelector('[data-k="' + k + '"]'); if (el) { clearLimit(el); el.focus(); }
      return;
    }
    if (b.id === 'rnCopy') { copyLink(b); return; }
    if (b.id === 'rnReset') { S.set = {}; S.on = {}; S.per = 'month'; each(page.querySelectorAll('.field-err'), function (x) { x.parentNode.removeChild(x); }); sayNext = 'Back to our estimates.'; render(); $('ansH').focus(); return; }
    if ((k = b.getAttribute('data-chip'))) { if (ui.chips[k]) delete ui.chips[k]; else ui.chips[k] = 1; setView('all'); sayList = true; schedule(); return; }
    if ((k = b.getAttribute('data-dir'))) {
      if (k === 'clear') { ui.q = ''; $('dirQ').value = ''; ui.chips = {}; }
      setView('all'); sayList = true; render(); $('dirQ').focus(); return;
    }
    id = b.tagName === 'A' && (b.getAttribute('href') || '').match(/^#p-([a-z0-9-]+)$/);
    if (id) { e.preventDefault(); openCard(id[1], true); }
  });
  function copyLink(b) {
    var url = root.location.origin + root.location.pathname + writeQuery(S), label = b.getAttribute('data-label') || b.textContent;
    remember(); b.setAttribute('data-label', label);
    function done() { b.textContent = 'Link copied'; $('rnSay').textContent = 'Link copied.'; setTimeout(function () { b.textContent = label; }, 1800); }
    function fail() { $('rnSay').textContent = 'Copy is not available here. The address bar holds the link.'; b.textContent = 'Copy it from the address bar'; setTimeout(function () { b.textContent = label; }, 4000); }
    if (root.navigator.clipboard && root.navigator.clipboard.writeText) root.navigator.clipboard.writeText(url).then(done, fail); else fail();
  }

  /* ---- the directory: the cards for this place and purpose, from js/money-data.js */
  function setView(v) { ui.view = v; each(page.querySelectorAll('input[name="dirview"]'), function (r) { r.checked = r.value === v; }); }
  function base() { var u = kind(c); return D.ITEMS.filter(function (it) { return it.w.indexOf(S.loc) > -1 && it.u.indexOf(u) > -1; }); }
  function mine() {
    var ids = {};
    c.R.savings.forEach(function (s) { ids[s.card] = 1; });
    c.R.cost.fees.forEach(function (f) { if (f.waive) ids[f.waive.card] = 1; });
    return ids;
  }
  function limitTable() {                             // the income and rent limits behind a fee exemption
    var L = D.LIM[c.R.place.county], tier = c.R.rent ? c.R.rent.tier : 0, h;
    if (!L) return '';
    h = '<div class="table-scroll" role="region" aria-label="Income and rent limits, ' + esc(L.name) + '" tabindex="0"><table class="data-table wide rn-lim"><caption>Income and rent limits in ' + esc(L.name) +
      '. Rents include utilities. Incomes are the most a household of that size can earn.</caption><thead><tr><th scope="col">Share of median income</th><th scope="col" class="num">Efficiency rent</th><th scope="col" class="num">One-bedroom rent</th>' +
      '<th scope="col" class="num">1 person</th><th scope="col" class="num">2 people</th><th scope="col" class="num">3 people</th><th scope="col" class="num">4 people</th></tr></thead><tbody>';
    D.TIERS.forEach(function (t) {
      if (!L.rent[t] || !L.inc[t]) return;
      h += '<tr' + (t === tier ? ' class="is-tier"' : '') + '><th scope="row">' + t + '%' + (t === tier ? ' <span class="rn-tier">the limit used here</span>' : '') + '</th>' +
        L.rent[t].concat(L.inc[t]).map(function (n) { return '<td class="num">' + usd(n) + '</td>'; }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function cardHtml(it) {
    var loc = S.loc, h, rows, links, tels, own = c.R.savings.filter(function (s) { return s.card === it.id; });
    rows = [['Worth', pick(it.worth, loc)], ['Who', pick(it.who, loc)], ['The catch', pick(it['catch'], loc)], ['When', pick(it.when, loc)]].filter(function (r) { return r[1]; });
    links = (it.apply || []).filter(function (a) { return inLoc(a.loc, loc) && /^https:\/\//.test(a.h); });
    tels = (it.tel || []).filter(function (a) { return inLoc(a.loc, loc) && (isPhone(a.n) || isEmail(a.n)); });
    h = '<details class="faq-item rn-card" id="p-' + it.id + '"' + (ui.open[it.id] ? ' open' : '') + '><summary><span class="rn-card-h">' + chip(it.s) + '<span class="rn-card-t">' + esc(it.t) + '</span>' +
      '<span class="rn-card-w">' + esc(pick(it.worth, loc)) + '</span></span></summary><div class="faq-body"><dl class="rn-dl">' +
      rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>';
    own.forEach(function (s) {
      var sw = s.id !== 'writeoffs';
      h += '<div class="rn-mine"><span id="mine-' + s.id + '"><b>In your numbers:</b> ' + (s.amount > 0 ? '<span class="rn-mine-n" data-v="svn-' + s.id + '"></span>' : 'nothing yet') + '</span>' +
        (sw ? '<label class="sw"><input type="checkbox" role="switch" data-on="' + s.id + '" aria-labelledby="mine-' + s.id + '"><span class="sw-ui" aria-hidden="true"></span><span class="sw-st" aria-hidden="true" data-v="sws-' + s.id + '"></span></label>'
          : '<span class="sw-st">Counted</span>') + '</div>';
    });
    if (isRent(c) && own.some(function (s) { return s.id === 'waiver'; })) h += limitTable();
    if (links.length || tels.length) {
      h += '<div class="rn-card-go">' + links.map(function (a) {
        return '<a class="' + (a.alt ? 'rn-alt' : 'btn btn-secondary btn-sm') + '" href="' + esc(a.h) + '" target="_blank" rel="noopener">' + esc(a.l) + '<span class="sr-only"> (opens in a new tab)</span></a>';
      }).join('') + tels.map(function (a) {
        return isEmail(a.n) ? '<a class="btn btn-secondary btn-sm" href="mailto:' + esc(a.n) + '">' + (/^email$/i.test(a.l) ? 'Email ' : esc(a.l) + ': ') + esc(a.n) + '</a>'
          : '<a class="btn btn-secondary btn-sm" href="' + telHref(a.n) + '">' + esc(a.l) + ': <span class="nobr">' + esc(a.n) + '</span></a>';
      }).join('') + '</div>';
    }
    return h + (it.cite ? '<div class="rn-cite">' + esc(it.cite) + '</div>' : '') + '</div></details>';
  }
  function drawDirectory() {
    var all = base(), ids = mine(), u = kind(c), words = ui.q.toLowerCase().split(/\s+/).filter(Boolean), chips = Object.keys(ui.chips), list, h = '';
    var what = { rent: 'a rental', par: 'a parents\' home', fam: 'a family home' }[u] + ' in ' + c.R.place.inName;
    list = all.filter(function (it) {
      var hay;
      if (ui.view === 'mine' && !(ids[it.id] || it.s === 'warn')) return false;
      if (chips.length && chips.indexOf(it.s) < 0) return false;
      if (!words.length) return true;
      hay = [it.t, pick(it.worth, S.loc), pick(it.who, S.loc), pick(it['catch'], S.loc), pick(it.when, S.loc), it.cite || ''].join(' ').toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) > -1; });
    });
    D.CATS.forEach(function (cat) {
      var its = list.filter(function (it) { return it.c === cat[0]; });
      if (its.length) h += '<div class="rn-cat"><h3>' + esc(cat[1]) + '</h3><span class="rn-cat-n">' + its.length + '<span class="sr-only"> listed</span></span></div>' + its.map(cardHtml).join('');
    });
    if (!list.length) {
      h = '<div class="rn-empty">Nothing matches' + (ui.q ? ' \u201c' + esc(ui.q) + '\u201d' : ' that') + ' for ' + esc(what) + '. <button type="button" class="rn-alt" data-dir="clear">Clear the search</button>, or <button type="button" class="rn-alt" data-dir="all">show all ' + all.length + '</button>.</div>';
    }
    $('dirList').innerHTML = h;
    each($('dirList').querySelectorAll('[data-v]'), function (el) { el._h = null; });
    $('dirCount').textContent = (list.length < all.length ? list.length + ' of ' + all.length : all.length) + ' things to file, ask for or watch, for ' + what + '.';
    $('dirAllL').textContent = 'All ' + all.length;
    $('dirChips').innerHTML = ['go', 'call', 'auto', 'warn'].map(function (s) {
      var n = all.filter(function (it) { return it.s === s; }).length;
      return n ? '<button type="button" class="st st-' + s + ' rn-chip" data-chip="' + s + '" aria-pressed="' + (ui.chips[s] ? 'true' : 'false') + '">' + chip(s).replace(/^<span[^>]*>|<\/span>$/g, '') + ' <span class="rn-chip-n">' + n + '</span></button>' : '';
    }).join('');
    $('dirChecked').textContent = 'Checked ' + D.CHECKED + '. The office on each card has the final word.';
  }
  function openCard(id, focus) {                      // a number points at its card: show it, open it, go to it
    var el = $('p-' + id);
    if (!el && card(id)) { ui.q = ''; if ($('dirQ')) $('dirQ').value = ''; ui.chips = {}; setView('all'); ui.open[id] = 1; render(); el = $('p-' + id); }
    if (!el) return;
    ui.open[id] = 1; el.open = true;
    el.scrollIntoView({ block: 'start' });
    if (focus) el.querySelector('summary').focus({ preventScroll: true });
  }
  $('dirList').addEventListener('toggle', function (e) {
    var d = e.target; if (d.id && d.id.slice(0, 2) === 'p-') { if (d.open) ui.open[d.id.slice(2)] = 1; else delete ui.open[d.id.slice(2)]; }
  }, true);

  /* ---- the lists that do not change with the numbers */
  function pairs(list, a, b) { return list.map(function (x) { return '<div><dt>' + esc(x[a]) + '</dt><dd>' + esc(x[b]) + '</dd></div>'; }).join(''); }
  $('skipList').innerHTML = pairs(D.MYTHS, 't', 'd');
  $('dateList').innerHTML = pairs(D.DATES, 'd', 't');
  each(page.querySelectorAll('a[data-u]'), function (a) { var u = D.U[a.getAttribute('data-u')]; if (u) a.href = u; });

  /* ---- the three figures stay in reach under the bar once the answer has scrolled away */
  var dock = $('dock'), hz = $('hzAll');
  if (dock && hz && 'IntersectionObserver' in root) {
    new root.IntersectionObserver(function (es) {
      var e = es[es.length - 1];
      dock.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 120);
    }, { rootMargin: '-72px 0px 0px 0px' }).observe(hz);
  }

  render();
  root.addEventListener('hashchange', function () { var m = root.location.hash.match(/^#p-([a-z0-9-]+)$/); if (m) openCard(m[1], true); });
  (function () {                                      // a link to a section or a card lands where it says, after the numbers are in
    var hash = root.location.hash, m = hash.match(/^#p-([a-z0-9-]+)$/), el;
    if (m) openCard(m[1], false);
    else if (hash.length > 1 && (el = $(hash.slice(1)))) el.scrollIntoView();
  })();
}

return { boot: boot, FIELDS: FIELDS, FLAGS: FLAGS, PLACES: PLACES, USES: USES, STEPS: STEPS, VIEW: VIEW, SHOW: SHOW,
  blank: blank, context: context, view: view, show: show, val: val, fmt: fmt, cur: cur, fieldText: fieldText, sliderStyle: sliderStyle,
  counted: counted, isOn: isOn, readQuery: readQuery, writeQuery: writeQuery, tidy: tidy, limitText: limitText, stepsFor: stepsFor, estimates: estimates };
});
