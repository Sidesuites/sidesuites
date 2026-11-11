/* Sidesuites: Run My Numbers (/adu-calculator/). The page's behaviour.
   It reads the controls, asks js/money-model.js (SSMoney.compute) for every dollar figure and draws the answer.
   js/money-data.js (SSMoneyData) supplies every phone number, link and card text at run time.
   This file words, formats and arranges. It never works out a dollar figure of its own.

   Four hooks tie the page to the model. tools/pages/tests/money-page.test.js checks every one of them:
     data-fig="path" data-fmt="usd"   a figure. The path names a value in what SSMoney.compute() returns
                                      (cost.total, year1.net/12, plan.sqft). Four other roots: DATA.x reads the
                                      model's constants, LIM.x the directory's limit tables, cases.<row>.x one row
                                      of the side-by-side table and tiles.<purpose>.x the estimate on a purpose tile.
     data-v="name"                    a sentence, a bar or a list this file builds (VIEW below).
     data-show="name"                 a row or a block that shows only when it applies (SHOW below).
     data-k="key" / data-on="flag"    a control bound to one input of the model (FIELDS, PICKS and FLAGS below).
   tools/pages/money.main.html carries the default scenario in all four, so the first paint is right before
   this script runs. After a change to the model or to the wording here, rewrite it and rebuild the page:
     node tools/pages/tests/money-page.test.js --write && python3 tools/pages/make_pages.py adu-calculator

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
   One list per purpose. A step is [what to do, why or how, when]. Text that differs by place is an object keyed
   like the cards in money-data.js: a place id, md for any Miami-Dade place, all for everywhere.
   when: aff = only for a home rented as affordable housing, mkt = only at market rent.
   {tier} is the income tier the fee exemption uses there (from the model). ({tel:card}) is the first phone
   number on that card for the place, ({tel:card~word}) the first whose label holds that word (both from the
   directory); the brackets go with it when the card or the number is gone. {see:card|words} is a link to that
   card, which holds a figure this file must not type (it goes when the card is gone).
   Dollar figures are not typed here: the model and the directory hold them. The page test lists the few that are
   (a unit, or a published rule neither file holds as a number) and fails on any other. */
var LOT = {
  mdc: 'Unincorporated Miami-Dade: a lot of 7,500 sq ft or more inside the Urban Development Boundary, and a unit of 400 to 800 sq ft. On septic? Sewer usually comes first.',
  mia: 'City of Miami: a single-family lot in T3-L, T3-O, T4, T5 or T6 (not T3-R). A detached unit can be up to 10% of the lot, 800 sq ft at most.',
  mdo: 'Call your city\'s zoning desk first. ADU rules are different in every Miami-Dade city.',
  bro: 'Call your city\'s zoning desk first. Six Broward cities have a rentable ADU ordinance. Many do not.'
};
var LOT_FAMILY = { mdc: LOT.mdc + ' Ask about the guesthouse permit for a family-only unit.', mia: LOT.mia, mdo: LOT.mdo, bro: LOT.bro };
var FEES_GUEST = {
  mdc: 'Ask the Impact Fee Section ({tel:md-exempt}) whether a family guesthouse is charged as a new unit. Ask for the school fee exemption on the permit application.',
  mia: 'Ask for the county school fee exemption on the permit application. Ask City zoning which rules apply to a rent-free family unit.',
  mdo: 'Ask for the county school fee exemption on the permit application. Ask your city what it charges.',
  bro: 'County road fees are already $0. Ask the School Board which school fee row applies to a family unit.'
};
var FEES_PARENTS = {
  mdc: 'Ask the Impact Fee Section ({tel:par-fees}) whether a rent-free home for your parents is charged the county\'s impact fees. Ask for the school fee exemption on the permit application. Get the answer in writing.',
  mia: 'Ask the Impact Fee Section ({tel:par-fees}) whether a rent-free home for your parents is charged the county road fee. Ask for the school fee exemption on the permit application, and ask City zoning what the City charges.',
  mdo: 'Ask the Impact Fee Section ({tel:par-fees}) whether a rent-free home for your parents is charged the county\'s fees. Ask for the school fee exemption on the permit application, and ask your city what it charges.',
  bro: 'Ask the School Board ({tel:par-fees-bro}) whether its impact fee applies to a home that a recorded restriction bars to school-age residents. Ask your city what it charges.'
};
var STEPS = {
  rent: {
    steps: [
      ['Confirm the lot can take the home.', LOT],
      ['Pick your tenant\'s income tier.', {
        md: 'The county exemption is for a tenant household at or under {tier}% of the area\'s median income. The fee exemption card below has the income and rent limits. The rent cap at that tier sits above market rent.',
        bro: 'The school fee waiver is for a tenant household at or under {tier}% of the area\'s median income. The school fee waiver card below has the income and rent limits.' }, 'aff'],
      ['Ask about the fee exemption before the permit.', {
        mdc: 'Call or email the Impact Fee Section ({tel:md-exempt}) and ask for the affordable housing exemption on one backyard home. It can exempt the county fees if it approves. Get the answer in writing.',
        mia: 'County: ask the Impact Fee Section ({tel:md-exempt}) for the road fee exemption, in writing. City: its own impact fees, about $8,100 plus a 3% charge, can be postponed for a certified affordable unit. They are not waived.',
        mdo: 'Call or email the county Impact Fee Section ({tel:md-exempt}) and ask for the affordable housing exemption on the county fees. Then ask your city what it charges.',
        bro: 'First ask the county housing division ({tel:bro-school~housing}) for an Affordable Housing Certification Letter. Then take it to the School Board ({tel:bro-school~school}) and ask it to waive the school impact fee.' }, 'aff'],
      ['Call the Property Appraiser before the tenant moves in.', 'The rented unit comes off your homestead. Hiding it costs back taxes, a 50% penalty and 15% interest.'],
      ['Sign a written lease longer than six months, at the full permitted rent.', 'Save three comparable listings that day. They protect your deductions.', 'aff'],
      ['Sign a written lease longer than six months, at market rent.', 'Save three comparable listings that day. They protect your deductions.', 'mkt'],
      ['Hand your CPA an itemized invoice.', 'Structure, appliances and site work on separate lines. The first-year write-off needs that split.'],
      ['Mark two dates.', 'April 1: tangible property return (Form DR-405). April 15: Schedule E with your federal return.']
    ],
    note: {
      aff: {
        mia: 'Order matters. Ask before the building permit. The school exemption and the City of Miami deferral are lost if you miss that point. The county exemption can still be claimed as a refund within one year of the certificate of occupancy.',
        md: 'Order matters. Ask before the building permit. The school exemption is lost if you miss that point. The county exemption can still be claimed as a refund within one year of the certificate of occupancy.',
        bro: 'Order matters. Ask before the building permit.' },
      mkt: 'Order matters. Call the Property Appraiser before the tenant moves in, and ask for the itemized invoice before you pay for the home.'
    }
  },
  par: {
    steps: [
      ['Confirm the lot can take the home.', LOT_FAMILY],
      ['Decide who pays.', 'If your parents put money in, see an elder-law attorney first. A gift over the yearly limit needs a tax form, and Medicaid looks back five years.{see:parentmoney|See this year\'s gift limit}'],
      ['Ask about the lower fees before the permit.', FEES_PARENTS],
      ['Finish and move in before January 1.', 'The home must be complete and your parent living there on January 1 to count for that tax year.'],
      ['File Form DR-501PGP by March 1.', { md: 'With the Miami-Dade Property Appraiser. File once and it renews on its own.', bro: 'With the Broward County Property Appraiser. File it again every year.' }],
      ['Call the Elder Helpline.', 'One phone screening ({tel:ltc}) opens Medicaid long-term care and the state programs.'],
      ['At tax time, give your CPA the list.', 'Dependent credit, head of household if you are unmarried, medical deduction, care credit.']
    ],
    note: 'Order matters. Ask about the fees before the building permit. The January 1 and March 1 dates decide which tax year the savings start.'
  },
  fam: {
    steps: [
      ['Confirm the lot can take the home.', LOT_FAMILY],
      ['Decide what it is for.', 'A guest house and a home office follow different rules. If you will use it only for your own business, pick Home office at the top and run those numbers.'],
      ['Ask about fees before the permit.', FEES_GUEST],
      ['Finish before January 1.', 'The county adds the home to your assessment on the January 1 after it is finished. That date sets the first tax year it counts.'],
      ['Tell your insurer.', 'Add the home to your homeowner\'s policy before anyone uses it. Ask what a wind mitigation inspection takes off the premium.'],
      ['At tax time, hand your CPA the list.', 'The mortgage interest on the loan that built the home.']
    ],
    note: 'Order matters. Ask about fees before the permit. January 1 sets the first tax year.'
  },
  off: {
    steps: [
      ['Confirm the lot can take the home.', LOT],
      ['Ask your tax preparer whether your work qualifies, before you order.', 'The deduction is for the self-employed. Employees cannot claim it, even when working from home is required.'],
      ['Ask the Property Appraiser whether business use changes the homestead on the home.', 'These numbers figure the home under your homestead exemption. Ask whether that holds for a building used only for a business.'],
      ['Keep it business only.', 'A bed, or any personal use, breaks the only-for-business test.'],
      ['At tax time, hand your preparer the costs.', 'The price of the home, the loan interest, insurance, upkeep, utilities and property tax. They go on Form 8829.']
    ],
    note: 'Order matters. Ask your tax preparer and the Property Appraiser before you order the home.'
  }
};

/* ------------------------------------------------------------------ THE CONTROLS
   One row per input of the model the visitor can type or slide.
   q     its name in the link (?rent=1900)
   t     usd, int, rate (percent with decimals) or pick (one of a set)
   tag   est = starts as our estimate, ex = starts as an example about the visitor; either turns to "Yours"
   name  how the page names it in "Rent goes up to $3,200 here."  per = the unit said after the limit */
var FIELDS = {
  install:       { q: 'install',  t: 'usd',  min: 0,     max: 80000,   step: 500,   tag: 'est', name: 'Installation' },
  fees:          { q: 'fees',     t: 'usd',  min: 0,     max: 60000,   step: 500,   tag: 'est', name: 'Impact fees', many: 1 },
  exemptAmt:     { q: 'exempt',   t: 'usd',  min: 0,     max: 60000,   step: 100,   tag: 'est', name: 'The amount taken off' },
  pay:           { q: 'pay',      t: 'pick', of: ['loan', 'cash'] },
  down:          { q: 'down',     t: 'usd',  min: 0,     max: 100000,  step: 1000,  name: 'Money down' },
  rate:          { q: 'rate',     t: 'rate', min: 4,     max: 14,      step: 0.125, tag: 'est', name: 'The loan rate' },
  years:         { q: 'years',    t: 'pick', of: [15, 20, 30] },
  rent:          { q: 'rent',     t: 'usd',  min: 1000,  max: 3200,    step: 25,    tag: 'est', name: 'Rent', per: ' a month' },
  emptyWeeks:    { q: 'weeks',    t: 'int',  min: 0,     max: 12,      step: 1,     tag: 'est', name: 'Empty weeks', many: 1, per: ' a year' },
  ins:           { q: 'ins',      t: 'usd',  min: 0,     max: 600,     step: 10,    tag: 'est', name: 'Insurance', per: ' a month' },
  upkeep:        { q: 'upkeep',   t: 'usd',  min: 0,     max: 600,     step: 10,    tag: 'est', name: 'Upkeep', per: ' a month' },
  assessedAdd:   { q: 'assessed', t: 'usd',  min: 0,     max: 250000,  step: 1000,  tag: 'est', name: 'The added value' },
  income:        { q: 'income',   t: 'usd',  min: 20000, max: 400000,  step: 5000,  tag: 'ex',  name: 'Household income' },
  filing:        { q: 'filing',   t: 'pick', of: ['single', 'married', 'hoh'] },
  parents:       { q: 'parents',  t: 'pick', of: [1, 2] },
  homeAssessed:  { q: 'home',     t: 'usd',  min: 50000, max: 3000000, step: 10000, tag: 'ex',  name: 'Your home\'s assessed value' },
  valueMultiple: { q: 'times',    t: 'int',  min: M.DATA.VALUE.multipleMin, max: M.DATA.VALUE.multipleMax, step: 1, tag: 'est', name: 'The multiple' }
};
var KEYS = Object.keys(FIELDS);
var PLACES = ['mdc', 'mia', 'mdo', 'bro'], USES = ['rent', 'par', 'fam', 'off', 'down'], PLANS = Object.keys(M.DATA.PLANS);
var PICKS = ['loc', 'plan', 'use', 'mode', 'per'];        // the choices that are not a typed field: place, home, purpose, market or affordable, month or year
var FLAGS = ['waiver', 'parfee', 'boost', 'granny', 'dep', 'hoh', 'office'];
var SWITCHES = FLAGS.concat(['exempt']);                  // exempt = whichever of waiver and parfee this purpose has
var ON0 = M.DATA.DEFAULTS.on;                             // which savings start counted
var STORE = 'sidesuite-numbers', HOME_USE = 'sidesuite-use';
var HOME_MAP = { renter: 'rent', parents: 'par', wfh: 'off', downsize: 'down' };   // every other home-page pick is a guest house
// The rows of the side-by-side table, in order: the purpose each computes, and its switch for a rental.
var CASES = [
  { id: 'rent',  use: 'rent', on: { waiver: false }, name: 'Rent it out, at market rent' },
  { id: 'rentA', use: 'rent', on: { waiver: true },  name: 'Rent it out, as affordable housing' },
  { id: 'par',   use: 'par',  name: 'My parents' },
  { id: 'fam',   use: 'fam',  name: 'Guest house' },
  { id: 'off',   use: 'off',  name: 'Home office' }
];
/* Three figures belong to one kind of home, not to the lot. The amount assumed exempt is a rental's or a parents'
   home's own. Insurance and upkeep are a landlord's policy and repairs on a rental, and a rider on your own policy
   plus the utilities you pay on a home the family uses. OWN gives, for each, the kind a purpose falls under ('' =
   this purpose has no such figure). S.set holds the figure for the purpose on screen; S.keep holds what was typed
   for the other kinds (S.keep.ins.rent), so nothing typed is lost when the purpose changes and every row of the
   side-by-side table is worked out from the figures typed for it. In the link a kept figure names its kind:
   ins-rent=250, exempt-par=4000. */
function homeKind(use) { return use === 'rent' ? 'rent' : 'home'; }
var OWN = { exemptAmt: function (use) { return use === 'rent' || use === 'par' ? use : ''; }, ins: homeKind, upkeep: homeKind };
var KINDS = { exemptAmt: ['rent', 'par'], ins: ['rent', 'home'], upkeep: ['rent', 'home'] };
// How each home is named inside a sentence. Names, sizes and prices on the page come from SSMoney.DATA.PLANS.
var HOME = { one: { the: 'the one-bedroom', a: 'a one-bedroom', anew: 'A new one-bedroom' }, eff: { the: 'the Efficiency', a: 'an efficiency', anew: 'A new efficiency' } };
var MINUS = '−', NEG = '<i class="sgn">' + MINUS + '</i>', POS = '<i class="sgn">+</i>';   // signs set in the text face, so they read at a glance

/* ------------------------------------------------------------------ small tools */
var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return ESC[ch]; }); }
function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function copyState(S) {
  var T = { loc: S.loc, use: S.use, plan: S.plan, per: S.per, set: {}, on: {}, keep: {} }, k, j;
  for (k in S.set) T.set[k] = S.set[k];
  for (k in S.on) T.on[k] = S.on[k];
  for (k in S.keep) { T.keep[k] = {}; for (j in S.keep[k]) T.keep[k][j] = S.keep[k][j]; }
  return T;
}
// The directory's own lookups (see the top of js/money-data.js).
function pick(v, loc) { return v == null ? '' : typeof v === 'string' ? v : v[loc] != null ? v[loc] : loc !== 'bro' && v.md != null ? v.md : v.all || ''; }
function inLoc(x, loc) { return !x || [].concat(x).indexOf(loc) > -1 || (loc !== 'bro' && [].concat(x).indexOf('md') > -1); }
function card(id) { return find(D.ITEMS, id); }
function isPhone(n) { return /^[\d\s().+-]{3,}$/.test(n); }
function isEmail(n) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(n); }
function telHref(n) { var d = String(n).replace(/\D/g, ''); return 'tel:' + (d.length === 10 ? '+1' + d : d.length === 11 && d.charAt(0) === '1' ? '+' + d : d); }
// A phone number on a card for this place: the first, or the first whose label holds a word. The office to call.
function firstTel(id, loc, word) {
  var it = card(id), t = it && (it.tel || []).filter(function (a) {
    return inLoc(a.loc, loc) && isPhone(a.n) && (!word || String(a.l).toLowerCase().indexOf(word) > -1);
  })[0];
  return t ? t.n : '';
}
function telLink(n) { return '<a class="nobr" href="' + telHref(n) + '">' + esc(n) + '</a>'; }

/* ------------------------------------------------------------------ figures: look one up, format it */
function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function trim(n) { return String(+(+n).toFixed(3)); }
function usd(v) { var r = Math.round(Math.abs(v)); return (v < 0 && r > 0 ? MINUS : '') + '$' + group(r); }
function near(v, to) { return Math.round(v / to) * to; }
// "cost.exempt.amount": a list is searched by id, a number picks a row. See the roots at the top of the file.
function lookup(c, path) {
  var p = path.split('.'), o = c.R, i = 0, j;
  if (p[0] === 'DATA') { o = M.DATA; i = 1; }
  else if (p[0] === 'LIM') { o = D.LIM; i = 1; }
  else if (p[0] === 'cases' || p[0] === 'tiles') { o = caseOf(c, p[1], p[0] === 'tiles'); i = 2; }
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
/* usd: whole dollars. usd-abs: without the sign. -per: by the month or the year, as the visitor chose.
   usd-k, usd-h, usd-t: to the nearest $1,000, $100 or $10, for a figure said with "about". */
function fmt(v, kind, c) {
  if (typeof v !== 'number') return String(v);
  var per = c && c.S.per === 'year' ? 1 : 12;
  switch (kind) {
    case 'usd-abs': return usd(Math.abs(v));
    case 'usd-per': return usd(v / per);
    case 'usd-abs-per': return usd(Math.abs(v / per));
    case 'usd-k': return usd(near(v, 1000));
    case 'usd-h': return usd(near(v, 100));
    case 'usd-t': return usd(near(v, 10));
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

/* ------------------------------------------------------------------ state: the picks and what was changed
   plan is null until the visitor picks a home: until then the home follows the place.
   keep holds the figures typed for another kind of home (see OWN). */
function blank() { return { loc: 'mdc', use: 'rent', plan: null, per: 'month', set: {}, on: {}, keep: {} }; }
function isOn(S, flag) { return S.on[flag] != null ? !!S.on[flag] : !!ON0[flag]; }
function modelUse(S) { return S.use === 'down' ? 'rent' : S.use; }   // Downsize shows no numbers: a rental stands in behind the hidden rows
/* What SSMoney.compute() is asked for one purpose. Anything the visitor has not set is left out, so the model's
   own defaults apply. Every purpose is asked with the same figures (the lot, the loan, the income) and with the
   switches the visitor left on or off: each switch belongs to one purpose, so none leaks into another. The three
   figures that belong to a kind of home (OWN) are the ones typed for that kind. So a row of the side-by-side table
   is the answer the visitor gets when they press it, whichever purpose is on screen.
   flags forces a switch (market or affordable). plain = the starting switches: what a purpose tile shows. */
function inputFor(S, use, flags, plain) {
  var here = modelUse(S), inp = { loc: S.loc, use: use, on: {} }, k, i, v;
  if (S.plan) inp.plan = S.plan;
  for (i = 0; i < KEYS.length; i++) {
    k = KEYS[i];
    v = !OWN[k] || OWN[k](use) === OWN[k](here) ? S.set[k] : (S.keep[k] || {})[OWN[k](use)];
    if (v != null) inp[k] = v;
  }
  for (i = 0; i < FLAGS.length; i++) inp.on[FLAGS[i]] = plain ? !!ON0[FLAGS[i]] : isOn(S, FLAGS[i]);
  for (k in flags || {}) inp.on[k] = flags[k];
  return inp;
}
function compute(c, inp) { var key = JSON.stringify(inp); return c.memo[key] || (c.memo[key] = M.compute(inp)); }
function context(S) { var c = { S: S, memo: {} }; c.R = compute(c, inputFor(S, modelUse(S))); return c; }
// One row of the side-by-side table (the visitor's own switches), or the same purpose as its tile shows it (the
// starting switches). Worked out once for each drawing of the page.
function caseOf(c, id, tile) {
  var k = find(CASES, id);
  return k ? compute(c, inputFor(c.S, k.use, k.on, tile)) : undefined;
}
/* A change of purpose. The figures that belong to the kind of home being left are kept for it, and the ones typed
   earlier for the kind arrived at come back. */
function setUse(S, use) {
  var a = modelUse(S), b, k, from, to;
  S.use = use; b = modelUse(S);
  for (k in OWN) {
    from = OWN[k](a); to = OWN[k](b);
    if (from === to) continue;
    if (S.set[k] != null && from) (S.keep[k] = S.keep[k] || {})[from] = S.set[k];
    delete S.set[k];
    if (S.keep[k] && S.keep[k][to] != null) { S.set[k] = S.keep[k][to]; delete S.keep[k][to]; }
  }
  return tidy(S);
}
// Put one row of the side-by-side table on screen: its purpose and, for a rental, market rent or affordable housing.
function showCase(S, id) {
  var k = find(CASES, id), f;
  if (!k) return S;
  setUse(S, k.use);
  for (f in k.on || {}) S.on[f] = k.on[f];
  return tidy(S);
}
// The value a control shows: what the model used, whether the visitor set it or not.
function cur(c, k) {
  var R = c.R;
  if (k === 'loc' || k === 'use' || k === 'per') return c.S[k];
  if (k === 'plan') return R.plan.id;
  if (k === 'mode') return counted(c, 'waiver') ? 'afford' : 'market';
  if (k === 'exemptAmt') return R.cost.exempt ? R.cost.exempt.amount : undefined;
  if (k === 'assessedAdd') return R.assessedAdd;
  if (k === 'valueMultiple') return R.value.multiple;
  if (k === 'down') return Math.min(R.input.down, Math.round(R.cost.total));   // never shown above the all-in price: past it there is nothing left to borrow
  return R.input[k];
}
function defaultOf(S, k) { var T = copyState(S); delete T.set[k]; return cur(context(T), k); }
// What we would use for a figure of another kind of home (see OWN) when nothing is typed for it.
function kindDefault(S, k, kind) {
  var T = copyState(S); T.use = k === 'exemptAmt' ? kind : kind === 'rent' ? 'rent' : 'fam'; T.keep = {};
  return defaultOf(T, k);
}
/* Forget anything set to exactly what we would have used anyway: it is our estimate again. A figure a link kept
   for the kind of home now on screen is the figure on screen. */
function tidy(S) {
  var k, j, here = modelUse(S), kind;
  for (k in OWN) {
    kind = OWN[k](here);
    if (!kind) delete S.set[k];
    if (S.keep[k] && S.keep[k][kind] != null) { if (S.set[k] == null) S.set[k] = S.keep[k][kind]; delete S.keep[k][kind]; }
  }
  for (k in S.set) if (S.set[k] === defaultOf(S, k)) delete S.set[k];
  for (k in S.keep) {
    for (j in S.keep[k]) if (S.keep[k][j] === kindDefault(S, k, j)) delete S.keep[k][j];
    if (!Object.keys(S.keep[k]).length) delete S.keep[k];
  }
  for (k in S.on) if (!!S.on[k] === !!ON0[k]) delete S.on[k];
  return S;
}
function changed(S) { return S.per !== 'month' || Object.keys(S.set).length > 0 || Object.keys(S.on).length > 0 || Object.keys(S.keep).length > 0; }
/* What was typed in a field, as a number; undefined when it cannot be read.
   Dollars and whole numbers: cents are cut, never read as two more digits ("$31,250.00" is 31250, not 3125000),
   and a point or comma before three digits groups thousands ("1.850" and "1,850" are 1850).
   A rate keeps its decimals, typed with a point or a comma. Anything with a letter in it, or a sign that is not
   part of one amount (a minus, the dash of a range), is not read at all: "32k" must never become 32, nor
   "1,600-1,950" a figure of eight digits. */
function parseField(k, raw) {
  var f = FIELDS[k], s = String(raw == null ? '' : raw).trim(), n, i;
  if (f.t === 'pick') { for (i = 0; i < f.of.length; i++) if (String(f.of[i]) === s) return f.of[i]; return undefined; }
  if (/[^\d\s$.,%'’]/.test(s)) return undefined;
  if (f.t === 'rate') {
    if (s.indexOf('.') < 0) s = s.replace(',', '.');
    n = Math.round(parseFloat(s.replace(/[^\d.]/g, '')) * 1000) / 1000;
  } else {
    n = parseInt(s.replace(/[.,]\d{1,2}(?!\d)\D*$/, '').replace(/\D/g, ''), 10);
  }
  return isFinite(n) ? n : undefined;
}
// Money down can go up to the whole price; the amount taken off the impact fees can never pass the fees.
function limits(c, k) {
  var f = FIELDS[k];
  if (k === 'down' && c) return [f.min, Math.max(f.max, Math.round(c.R.cost.total))];
  if (k === 'exemptAmt' && c) return [f.min, Math.round(c.R.cost.fees)];
  return [f.min, f.max];
}
function fieldText(c, k) {
  var v = cur(c, k), t = FIELDS[k].t;
  return v === undefined ? '' : t === 'usd' ? usd(v) : t === 'int' ? group(Math.round(v)) : trim(v);
}
// "Insurance goes up to $600 a month here." Said under a field when what was typed is outside what the page takes.
function limitText(c, k, n) {
  var f = FIELDS[k], lim = limits(c, k), low = n < lim[0], v = low ? lim[0] : lim[1];
  if (n >= lim[0] && n <= lim[1]) return '';
  var shown = f.t === 'usd' ? usd(v) : f.t === 'rate' ? trim(v) + '%' : group(v);
  return f.name + (low ? (f.many ? ' start at ' : ' starts at ') : (f.many ? ' go up to ' : ' goes up to ')) + shown + (f.per || '') +
    (low ? ' here.' : k === 'down' ? ' here, the all-in price.' : k === 'exemptAmt' ? ' here, the impact fees.' : ' here.');
}
// Said under a field when what was typed cannot be read as a number ("32k"): the field goes back to what it held.
function oddText(c, k) {
  var v = cur(c, k);
  return 'Type a number here, like ' + (FIELDS[k].t === 'rate' ? trim(v) : group(Math.round(v))) + '.';
}
/* The link. Only what differs from the defaults is written; the place and the purpose ride along whenever
   anything is, so a copied link gives the same answer on any device. plan is written only when the visitor
   picked a home. on and off list the switches moved from where they start. A figure kept for another kind of home
   names the kind (ins-rent=250). full = the place and the purpose even for the starting example: a link that is
   handed to someone else must not lean on what their browser remembers. */
function writeQuery(S, full) {
  var q = [], k, i, on = [], off = [];
  if (S.plan) q.push('plan=' + S.plan);
  for (i = 0; i < KEYS.length; i++) { k = KEYS[i]; if (S.set[k] != null) q.push(FIELDS[k].q + '=' + encodeURIComponent(S.set[k])); }
  for (k in KINDS) for (i = 0; i < KINDS[k].length; i++) if (S.keep[k] && S.keep[k][KINDS[k][i]] != null) q.push(FIELDS[k].q + '-' + KINDS[k][i] + '=' + encodeURIComponent(S.keep[k][KINDS[k][i]]));
  for (i = 0; i < FLAGS.length; i++) { k = FLAGS[i]; if (isOn(S, k) !== !!ON0[k]) (isOn(S, k) ? on : off).push(k); }
  if (on.length) q.push('on=' + on.join(','));
  if (off.length) q.push('off=' + off.join(','));
  if (S.per === 'year') q.push('per=year');
  if (!full && !q.length && S.loc === 'mdc' && S.use === 'rent') return '';
  return '?loc=' + S.loc + '&use=' + S.use + (q.length ? '&' + q.join('&') : '');
}
function readQuery(search) {
  var S = blank(), got = {}, has = {}, pairs = String(search || '').replace(/^\?/, '').split('&'), i, j, kv, k, n, f;
  // A number in a link: digits, with cents if it was pasted with them. Held inside the field's limits.
  function linked(k, raw) {
    var f = FIELDS[k], n = raw != null && /^\d+(\.\d+)?$/.test(raw) ? parseField(k, raw) : undefined;
    return n === undefined ? undefined : clamp(n, f.min, k === 'down' ? 1000000 : f.max);
  }
  for (i = 0; i < pairs.length; i++) {
    kv = pairs[i].split('=');
    try { got[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); } catch (e) { /* a broken link part is skipped */ }
  }
  if (PLACES.indexOf(got.loc) > -1) { S.loc = got.loc; has.loc = true; }
  if (USES.indexOf(got.use) > -1) { S.use = got.use; has.use = true; }
  if (PLANS.indexOf(got.plan) > -1) { S.plan = got.plan; has.plan = true; }
  if (got.per === 'year') S.per = 'year';
  for (i = 0; i < KEYS.length; i++) {
    k = KEYS[i]; f = FIELDS[k];
    n = f.t === 'pick' ? (got[f.q] == null ? undefined : parseField(k, got[f.q])) : linked(k, got[f.q]);
    if (n !== undefined) S.set[k] = n;
  }
  for (k in KINDS) for (j = 0; j < KINDS[k].length; j++) {
    n = linked(k, got[FIELDS[k].q + '-' + KINDS[k][j]]);
    if (n !== undefined) (S.keep[k] = S.keep[k] || {})[KINDS[k][j]] = n;
  }
  for (i = 0; i < FLAGS.length; i++) {
    if ((got.on || '').split(',').indexOf(FLAGS[i]) > -1) S.on[FLAGS[i]] = true;
    if ((got.off || '').split(',').indexOf(FLAGS[i]) > -1) S.on[FLAGS[i]] = false;
  }
  return { S: tidy(S), has: has };
}

/* ------------------------------------------------------------------ what the page says: helpers for the wording */
function kind(c) { return c.R.input.use; }                 // rent, par, fam or off (Downsize shows no numbers)
function isRent(c) { return kind(c) === 'rent'; }
function bro(c) { return c.R.place.county === 'bro'; }
function sav(c, id) { return find(c.R.savings, id); }
function perWord(c) { return c.S.per === 'year' ? 'a year' : 'a month'; }
function exempt(c) { var ex = c.R.cost.exempt; return ex && ex.amount > 0 ? ex : null; }
function flagOf(c, f) { return f !== 'exempt' ? f : c.R.cost.exempt ? c.R.cost.exempt.id : null; }
function chip(s, words) { return '<span class="st st-' + s + '"><svg class="st-ic" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><use href="#st-' + s + '"/></svg>' + esc(words || D.STATUS[s]) + '</span>'; }
function assumed() { return '<span class="tag tag-as">Assumed</span>'; }
// The link from a saving to the card that says how to get it. Nothing when the directory has no such card.
function how(s, what) {
  return s && card(s.card) ? '<a class="sv-a" href="#p-' + s.card + '">' + (s.status === 'call' ? 'See how to ask' : 'See how to file') + '<span class="sr-only">: ' + what + '</span></a>' : '';
}
function seg(cls, n) { n = Math.round(n); return n > 0 ? '<i class="sg ' + cls + '" style="--s:' + n + '"></i>' : ''; }
function r4(n) { return String(Math.round(clamp(n, 0, 1) * 10000) / 10000); }
// The page's words for a gain and a cost, the same in the answer, the dock, the ledgers and the side-by-side table.
function monthWord(n) { return n >= 0 ? 'left over' : 'you pay'; }
function tenWord(n) { return n >= 0 ? 'kept' : 'spent'; }
// The name a saving goes by on this page, and the sentences beside its switch.
function savingText(c, s) {
  var R = c.R, ten, tenFmt;
  switch (s.id) {
    case 'waiver': return { name: esc(s.label), the: bro(c) ? 'the school fee waiver' : 'the fee exemption' };
    case 'parfee': return { name: esc(s.label), the: 'the lower fees for a parents\' home' };
    case 'office': return { name: esc(s.label), the: 'the home office deductions' };
    case 'boost':
      // Over ten years the write-off can be worth nothing, or cost a little: the words carry the sign, never a minus.
      // "About" goes with a rounded figure: to the nearest $100 from $1,000 up, to the nearest $10 under it.
      ten = R.tax.boost.tenYear; tenFmt = Math.abs(ten) >= 1000 ? 'usd-h' : 'usd-t';
      return { name: 'First-year write-off', the: 'the first-year write-off',
        help: 'About ' + fig(c, 'tax.boost.share', 'pct') + ' of the cost: appliances, furniture, fencing, walkways and a driveway. ' +
          (ten >= 5 ? 'Worth about ' + fig(c, 'tax.boost.tenYear', tenFmt) + ' over ten years, because the write-offs come sooner, not twice.'
            : ten <= -5 ? 'At your income it costs about ' + fig(c, '0-tax.boost.tenYear', tenFmt) + ' over ten years: taking the write-offs sooner leaves less to write off in the years after.'
            : 'At your income it saves nothing over ten years: the write-offs come sooner, not twice.') +
          (R.tax.boost.unused > 0 ? ' ' + fig(c, 'tax.boost.unused') + ' of it waits for later years.' : '') };
    case 'granny':
      return { name: 'Granny flat property tax reduction', the: 'the granny flat reduction',
        help: 'For a parent or grandparent who is 62 or older and lives there. It takes the home\'s added value off your assessment' +
          (R.granny.capped ? ', up to ' + fig(c, 'DATA.GRANNY_CAP', 'pct') + ' of the whole: ' + fig(c, 'granny.reduced') + ' here.' : '.') };
    case 'dep':
      return { name: esc(s.label), the: 'the dependent credit',
        help: 'Needs your parent\'s gross income under $5,500 in ' + fig(c, 'taxYear', 'num') + ', and you paying more than half of their support.' };
    default:
      return { name: 'Head of household status', the: 'head of household status',
        help: s.needs === 'unmarried' ? 'Head of household is for unmarried owners who claim the parent. Set how you file to Single to count it.'
          : !isOn(c.S, 'dep') ? 'Count the dependent credit first. Head of household needs a parent you can claim.'
          : 'For unmarried owners who claim the parent and pay more than half the cost of keeping up the home.' };
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
  return s.id === 'boost' ? fig(c, 'tax.boost.savings') + ' <small>less tax in year one</small>'
    : s.when === 'upfront' ? fig(c, p) + ' <small>off day one</small>'
    : fig(c, p, 'usd-per') + ' <small>' + perWord(c) + '</small>';
}
// The same amount on the saving's card in the directory, which is drawn once and kept current with every change:
// a saving worth nothing at these figures says so instead of leaving a gap.
function savingOnCard(c, id) { return savingAmount(c, id) || 'nothing yet'; }
function counted(c, flag) {            // is this saving inside the totals right now
  var f = flagOf(c, flag), s = f && sav(c, f);
  return s ? !!s.counted : !!f && isOn(c.S, f);
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
// The lowest and the highest of the three ways of looking at what the home may add to the property's value.
function valueRange(c) {
  var v = c.R.value, by = ['income', 'cost', 'survey'].sort(function (a, b) { return v[a] - v[b]; });
  return 'about ' + fig(c, 'value.' + by[0], 'usd-k') + ' to ' + fig(c, 'value.' + by[2], 'usd-k');
}
function stepsFor(c) {
  var set = STEPS[kind(c)], loc = c.S.loc, tier = M.DATA.RENT_CAP[c.R.place.county].tier, mode = counted(c, 'waiver') ? 'aff' : 'mkt';
  function fill(t) {
    return esc(pick(t, loc)).replace(/\{tier\}/g, tier).replace(/ ?\(\{tel:([a-z0-9-]+)(?:~([a-z]+))?\}\)/g, function (m, id, word) {
      var n = firstTel(id, loc, word); return n ? ' (' + telLink(n) + ')' : '';
    }).replace(/\{see:([a-z0-9-]+)\|([^}]+)\}/g, function (m, id, words) {
      var it = card(id); return it && it.w.indexOf(loc) > -1 ? ' <a href="#p-' + id + '">' + words + '</a>.' : '';
    });
  }
  return { steps: set.steps.filter(function (s) { return !s[2] || s[2] === mode; }).map(function (s) { return [fill(s[0]), fill(s[1])]; }),
    note: fill(set.note[mode] || set.note) };
}
// The ten columns of the long-run chart: how tall each stands against the largest, and where the day-one money sits.
function chartOf(c) {
  var R = c.R, ys = R.years.slice(0, 10), cash = Math.max(0, R.upfront.cash), up = cash, down = 0;
  ys.forEach(function (y) { up = Math.max(up, y.cum); down = Math.max(down, -y.cum); });
  return { ys: ys, cash: cash, up: up, down: down, share: up + down > 0 ? up / (up + down) : 1 };
}

/* ------------------------------------------------------------------ VIEW: every sentence, bar and list the page builds */
var VIEW = {
  // --- the home: one line under the two choices when the place's size rules do not plainly allow the one chosen
  'plan-why': function (c) {
    var p = c.R.plan, why;
    if (p.fits === true || !p.why) return '';
    why = esc(p.why).replace(/(\d) sq ft/g, '$1&nbsp;sq&nbsp;ft');      // a size never breaks from its unit
    return p.fits === false ? chip('warn') + ' <span>' + why + '</span>'
      : '<span>' + why.replace('Check My Lot', '<a href="/check-my-lot/">Check My Lot</a>') + '</span>';
  },
  // --- the answer. On a phone the place is said by the control just above, and the heading keeps to one line.
  'for': function (c) {
    return 'Estimate for ' + { rent: 'a rental', par: 'housing your parents', fam: 'a guest house', off: 'a home office' }[kind(c)] + '<span class="rn-for-in"> in ' + esc(c.R.place.inName) + '</span>';
  },
  r1: function () { return 'all in'; },
  r2: function (c) { var n = c.R.year1.net; return (n < 0 && isRent(c) ? '<i class="bang" aria-hidden="true"></i>' : '') + monthWord(n); },
  r3: function (c) { return tenWord(c.R.ten.net); },
  s1: function (c) {
    return c.R.loan.amount > 0 ? 'You bring ' + fig(c, 'upfront.cash') + '. A loan covers ' + fig(c, 'upfront.borrowed') + '.' : 'You pay it all on day one, with no loan.';
  },
  /* Under the three figures the sentences run in a stack on most screens, away from their figures, so each stands
     on its own: who pays, for what, and by the month. When the rent falls short the sentence says what would
     change it. The lines are reserved for the longest wording. */
  s2: function (c) {
    var R = c.R, loan = R.loan.amount > 0, k = kind(c), x = fig(c, 'after.net/12', 'usd-abs'), what = loan ? 'the loan and the bills' : 'the bills';
    var back = R.saved && R.saved.yearly > 0, cover = k === 'off' ? 'the tax the office deductions save covers ' : 'the tax breaks counted cover ';
    if (k === 'rent') {
      if (R.year1.net < 0) return 'The rent does not cover ' + what + '. ' + whatHelps(c);
      return loan ? 'What is left of the rent after the loan, the bills and tax. ' + (R.after.net < 0 ? 'You still pay ' + x + ' a month' : 'It grows to ' + x) + ' once the loan is paid off.'
        : 'What is left of the rent after the bills and tax. There is no loan payment to make.';
    }
    return (R.year1.net >= 0 ? (back ? cover.charAt(0).toUpperCase() + cover.slice(1) + what + '. ' : 'There is nothing to pay each month at these figures. ')
        : 'You pay ' + what + (k === 'fam' ? '. ' : k === 'off' ? (back ? ', less the tax the office deductions save. ' : ', with no office deductions counted. ')
          : back ? ', less the tax breaks counted. ' : ', with no tax breaks counted. ')) +
      (!loan ? 'There is no loan payment to make.' : R.after.net < 0 ? 'Once the loan is paid off you still pay ' + x + ' a month.'
        : back ? 'Once the loan is paid off the tax saved covers the bills.' : 'Once the loan is paid off there is nothing left to pay.');
  },
  s3: function (c) {
    return (isRent(c) ? paybackText(c) : c.R.ten.net < 0 ? 'That is on top of day one.' : 'That does not count day one.') +
      ' It may also add to <a href="#valH">what your property is worth</a>: ' + valueRange(c) + ', depending on who is looking.';
  },
  /* The line under the three figures. Solid: an exemption the day-one figure assumes, which needs someone's yes.
     Dashed: one that is there to ask for and is not counted. A home office: what its deductions save, which is
     never in the day-one figure. A guest house has no line. */
  maybe: function (c) {
    var R = c.R, loc = c.S.loc, ex = exempt(c), s, tel, a, text, link;
    if (ex) {
      s = sav(c, ex.id); tel = firstTel(ex.card, loc); a = fig(c, 'cost.exempt.amount'); link = s ? how(s, savingText(c, s).the) : '';
      tel = tel ? ', ' + telLink(tel) : '';
      if (ex.id === 'waiver') {
        text = ex.counted ? '<b>Assumes</b> ' + a + ' of impact fees are ' + (bro(c) ? 'waived' : 'exempt') + ' as affordable housing. ' + (bro(c) ? 'The School Board' : 'The county') + ' decides: ask first' + tel + '.'
          : '<b>Not counted:</b> ' + a + ' off day one if you rent it as affordable housing and ' + (bro(c) ? 'the School Board waives its fee.' : 'the county exempts its impact fees.');
      } else {
        text = ex.counted ? '<b>Assumes</b> ' + a + ' less in impact fees for a parents\' home. Ask first' + tel + '.'
          : '<b>Not counted:</b> ' + a + ' off day one if a parents\' home is charged lower impact fees. Ask first' + tel + '.';
      }
      return '<p class="maybe' + (ex.counted ? ' is-counted' : '') + '"><span>' + text + '</span> ' + link + '</p>';
    }
    if (R.office && R.office.value > 0) {
      s = sav(c, 'office'); a = 'about ' + fig(c, 'office.value', 'usd-h') + ' of tax saved a year if you are self-employed and use it only for your business.';
      return '<p class="maybe' + (s && s.counted ? ' is-counted' : '') + '"><span><b>' + (s && s.counted ? 'Not in the day-one figure:' : 'Not counted:') + '</b> ' + a + '</span> ' + how(s, 'the home office deductions') + '</p>';
    }
    return '';
  },
  // --- the levers
  'h-mode': function (c) {
    var loc = c.S.loc, ex = c.R.cost.exempt, id = ex ? ex.card : '', t1, t2;
    if (!isRent(c)) return '';
    if (!counted(c, 'waiver')) return 'Any tenant, any rent the market will pay. You pay the impact fees in full.';
    if (bro(c)) {
      t1 = firstTel(id, loc, 'housing'); t2 = firstTel(id, loc, 'school');
      return 'A tenant under the local income limit, rent at or under ' + fig(c, 'rent.cap') + ' with utilities, and a covenant the county records for at least 30 years. ' +
        'In return the School Board can waive its impact fee, once the county housing division certifies the home. They decide: ask first' +
        (t1 && t2 ? ', the county at ' + telLink(t1) + ', then the School Board at ' + telLink(t2) : t1 || t2 ? ', ' + telLink(t1 || t2) : '') + '.';
    }
    t1 = firstTel(id, loc);
    return 'A tenant under the local income limit, rent at or under ' + fig(c, 'rent.cap') + ' with utilities, and a covenant the county records for 15 years or more. ' +
      'In return the county can exempt its impact fees. It decides: ask first' + (t1 ? ', ' + telLink(t1) : '') + '.';
  },
  cashnote: function (c) { return 'You pay ' + fig(c, 'cost.total') + ' on day one. No loan payment.'; },
  'sc-down': function () { return '<span>' + usd(FIELDS.down.min) + '</span><span>' + usd(FIELDS.down.max) + '</span>'; },
  /* Under the rent slider: its two ends and, for a home rented as affordable housing, the cap named at its own tick
     (the frame's --cap places both). A cap in the last quarter of the track takes the end label's place. */
  'sc-rent': function (c) {
    var f = FIELDS.rent, cap = SHOW.cap(c), far = cap && (c.R.rent.cap - f.min) / (f.max - f.min) > 0.75;
    return '<span>' + usd(f.min) + '</span>' + (cap ? '<b' + (far ? ' class="is-end"' : '') + '>Rent cap ' + fig(c, 'rent.cap') + '</b>' : '') + (far ? '' : '<span>' + usd(f.max) + '</span>');
  },
  // Rent typed above the cap: the field keeps what was typed, so the panel says which rent the figures use.
  capnote: function (c) { return c.R.rent && c.R.rent.capped ? 'These numbers use ' + fig(c, 'rent.used') + '.' : ''; },
  // --- day one
  bar1l: function (c) {
    return 'All in, ' + fig(c, 'cost.total') + ': the home ' + fig(c, 'cost.home') + ', installation ' + fig(c, 'cost.install') + ', impact fees ' + fig(c, 'cost.fees') +
      (c.R.cost.waived > 0 ? ', less ' + fig(c, 'cost.waived') + ' assumed exempt' : '') + '.';
  },
  // The bar is what is paid: an exemption that is counted is left out of it, one that is only possible is dashed.
  bar1: function (c) {
    var k = c.R.cost, ex = exempt(c), off = ex ? ex.amount : 0;
    return '<span class="splitbar" role="img" aria-labelledby="bar1L">' + seg('t1', k.home) + seg('t2', k.install) + seg('t3', k.fees - off) + (ex && !ex.counted ? seg('is-poss', off) : '') + '</span>';
  },
  'l-exempt': function (c) {
    var ex = c.R.cost.exempt;
    return !ex ? '' : '<i class="key ' + (ex.counted ? 'is-off' : 'is-poss') + '"></i>' + esc(ex.label);
  },
  'ex-marks': function (c) { var ex = c.R.cost.exempt; return !ex ? '' : (ex.counted ? assumed() : '') + chip(ex.status); },
  'a-exempt': function (c) { return c.R.cost.waived > 0 ? NEG + fig(c, 'cost.waived') : '<small>Not counted</small>'; },
  /* Under the exemption row: what our estimate takes off, what the published schedules print for this place
     (the model's own words, never in a sum), what to budget until there is a yes, and the office to ask. */
  'h-exempt': function (c) {
    var R = c.R, ex = R.cost.exempt, s, tel, link;
    if (!ex) return '';
    s = sav(c, ex.id); tel = firstTel(ex.card, c.S.loc); link = s ? how(s, savingText(c, s).the) : '';
    return 'Our estimate ' + (ex.counted ? 'takes ' : 'would take ') + fig(c, 'cost.exempt.amount') + ' of impact fees off for ' +
      (ex.id === 'waiver' ? 'a home rented as affordable housing. ' : 'a rent-free home for your parents. ') +
      fig(c, 'place.published.' + (ex.id === 'waiver' ? 'rent' : 'par'), 'text') +
      ' It is not automatic: until you have a yes in writing, budget ' + fig(c, 'cost.list') + '.' +
      (tel || link ? ' <span class="rw-go">' + (tel ? telLink(tel) : '') + (tel && link ? '<i aria-hidden="true">·</i>' : '') + link + '</span>' : '');
  },
  'h-loan': function (c) { return fig(c, 'loan.pmt') + ' a month for ' + fig(c, 'loan.years', 'num') + ' years.'; },
  'svm-boost': function (c) { return savingMain(c, 'boost'); },   'svn-boost': function (c) { return savingAmount(c, 'boost'); },
  // --- each month
  'h-month': function (c) { return isRent(c) ? 'Where the rent goes' : 'What it costs each month'; },
  bar2l: function (c) {
    var R = c.R, out = R.year1.moneyOut.filter(function (o) { return o.amount > 0; }).map(function (o) {
      return o.label.charAt(0).toLowerCase() + o.label.slice(1) + ' ' + fig(c, 'year1.moneyOut.' + o.id + '.amount', 'usd-per');
    }).join(', ');
    if (!isRent(c)) return 'What it costs ' + perWord(c) + ': ' + out + '.';
    // income tax that comes back is not a piece of the bar: said on its own, so the sentence adds up
    return 'Of the ' + fig(c, 'year1.moneyIn.rent.amount', 'usd-per') + ' rent ' + perWord(c) + ': ' + out + '. ' +
      (R.tax.tax < 0 ? 'The income tax saved gives back ' + fig(c, 'tax.tax', 'usd-abs-per') + '. ' : '') +
      (R.year1.net >= 0 ? fig(c, 'year1.net', 'usd-per') + ' is left over.' : 'You pay ' + fig(c, 'year1.net', 'usd-abs-per') + ' on top.');
  },
  bar2: function (c) {
    var R = c.R, y = R.year1, tint = { loan: 't1', ins: 't2', ptax: 't3', upkeep: 't4', empty: 't2', tax: 't3' }, h = '', out = 0, short;
    y.moneyOut.forEach(function (o) { if (o.amount > 0) { h += seg(tint[o.id], o.amount); out += o.amount; } });
    if (isRent(c) && y.net > 0) h += seg('is-left', y.net);
    short = isRent(c) && y.net < 0 && out > 0;
    return '<span class="splitbar' + (short ? ' is-short" style="--short:' + r4(-y.net / out) : '') + '" role="img" aria-labelledby="bar2L">' + h + '</span>';
  },
  /* The rent helper names the home and gives a market check: HUD's fair market rent for that size, which the
     directory holds for both counties (SSMoneyData.LIM[county].fmr: efficiency, one bedroom; fiscal 2027, utilities
     included; source: HUD User, Fair Market Rents). This is the one place the page reads those four figures. */
  'h-rent': function (c) {
    var R = c.R, L, start, h;
    if (!isRent(c)) return '';
    L = D.LIM[R.place.county]; start = 'DATA.LOC.' + R.place.id + '.rent.' + R.plan.id;
    h = HOME[R.plan.id].anew + ' this size starts at ' + fig(c, start) + ' a month in our estimate.';
    if (L && L.fmr && L.fmr[R.rent.unit] > 0) {
      h += ' As a market check, HUD\'s fiscal 2027 fair market rent (in effect since October 1, 2026) for ' + HOME[R.plan.id].a + ' in ' + esc(L.name) + ' is ' +
        fig(c, 'LIM.' + R.place.county + '.fmr.' + R.rent.unit) + ', utilities included.';
    }
    if (R.rent.capped) h += ' <b>The ' + (bro(c) ? 'waiver' : 'exemption') + ' caps rent at ' + fig(c, 'rent.cap') + ' with utilities. These numbers use ' + fig(c, 'rent.used') + '.</b>';
    return h;
  },
  'h-ptax': function (c) {
    return ({ rent: 'The county adds the home to your assessment and taxes it with no exemption, because it is rented.',
      par: 'The county adds the home to your assessment. Lived in by family rent-free, it joins your homestead exemption.',
      fam: 'The county adds the home to your assessment. Used by your own household, it joins your homestead exemption.',
      off: 'The county adds the home to your assessment. We figure it under your homestead exemption: ask the Property Appraiser whether business use changes that.' })[kind(c)];
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
    return 'Figured on the ' + fig(c, 'taxYear', 'num') + ' federal tax tables at your income. The write-offs cut it by ' + fig(c, 'tax.writeoffValue', 'usd-per') + ' ' + perWord(c) +
      ': loan interest, running costs and one slice of the cost every year for ' + fig(c, 'DATA.LIFE', 'num') + ' years.' +
      (R.tax.unused > 0 ? ' ' + fig(c, 'tax.unused') + ' of this year\'s loss waits for later years.' : '') + (s ? ' ' + how(s, 'the write-offs') : '');
  },
  // The money that comes back to a home with no tenant: the parents' tax breaks, or what the office deductions save.
  'l-back': function (c) { return '<i class="key is-off"></i>' + (kind(c) === 'off' ? 'Tax saved by the office deductions' : 'Tax breaks counted'); },
  'a-back': function (c) {
    return !isRent(c) && c.R.saved.yearly > 0 ? POS + fig(c, 'saved.yearly', 'usd-per') : '<small>' + (kind(c) === 'off' ? 'Not counted' : 'None') + '</small>';
  },
  'l-net': function (c) { var w = monthWord(c.R.year1.net); return w.charAt(0).toUpperCase() + w.slice(1); },
  'h-net': function (c) {
    var R = c.R, k = kind(c);
    if (k !== 'rent') return 'What the home costs to keep' + (!(R.saved.yearly > 0) ? '.' : k === 'off' ? ', after the tax the office deductions save.' : ', after the tax breaks counted.');
    return R.year1.net >= 0 ? 'What is left of the rent after every line above.' : whatHelps(c);
  },
  'a-net': function (c) {
    var n = c.R.year1.net;
    return n >= 0 ? fig(c, 'year1.net', 'usd-per') : isRent(c) ? '<span class="neg">' + NEG + fig(c, 'year1.net', 'usd-abs-per') + '</span>' : fig(c, 'year1.net', 'usd-abs-per');
  },
  'svm-granny': function (c) { return savingMain(c, 'granny'); }, 'svn-granny': function (c) { return savingAmount(c, 'granny'); },
  'svm-dep': function (c) { return savingMain(c, 'dep'); },       'svn-dep': function (c) { return savingAmount(c, 'dep'); },
  'svm-hoh': function (c) { return savingMain(c, 'hoh'); },       'svn-hoh': function (c) { return savingAmount(c, 'hoh'); },
  // --- the office deductions. The status beside the switch is the saving's own, in the directory's word for it.
  'st-office': function (c) { var s = sav(c, 'office'); return chip(s ? s.status : 'call'); },
  'svn-office': function (c) { return savingAmount(c, 'office'); },
  'how-office': function (c) { return how(sav(c, 'office'), 'the home office deductions'); },
  // --- ten years
  tensum: function (c) {
    if (!isRent(c)) return c.R.ten.net < 0 ? 'Over ten years the home costs ' + fig(c, 'ten.net', 'usd-abs') + ' to own, on top of day one.'
      : c.R.saved.yearly > 0 ? 'Over ten years the tax breaks counted cover what the home costs to own.' : 'At these figures the home costs nothing more to own over ten years.';
    return c.R.ten.net < 0 ? 'At these numbers you spend ' + fig(c, 'ten.net', 'usd-abs') + ' over ten years, on top of day one.' : paybackText(c);
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
  'l-ten': function (c) { return c.R.ten.net >= 0 ? 'Kept over ten years' : 'Spent over ten years'; },
  'l-after': function (c) { return c.R.after.net >= 0 ? 'Left over each month once the loan is paid off' : 'You pay each month once the loan is paid off'; },
  // --- what the property may be worth: the arithmetic of the rent view, in words
  'v-income': function (c) {
    var m = fig(c, 'value.rent'), y = fig(c, 'value.rent*12');
    return (isRent(c) ? m + ' a month is ' + y + ' a year.' : 'If it were rented at ' + m + ' a month here: ' + y + ' a year.') + ' At ' + fig(c, 'value.multiple', 'num') + ' times a year\'s rent:';
  },
  // --- side by side: every purpose for this place and these figures, one row each
  sbs: function (c) {
    var S = c.S, here = S.use === 'rent' ? (counted(c, 'waiver') ? 'rentA' : 'rent') : S.use;
    return CASES.map(function (k) {
      var r = caseOf(c, k.id), p = 'cases.' + k.id + '.', now = k.id === here, as = r.cost.exempt && r.cost.exempt.counted && r.cost.waived > 0;
      return '<tr role="row"' + (now ? ' class="is-now" aria-current="true"' : '') + '><th scope="row" role="rowheader">' +
        (now ? '<span class="sbs-n">' + k.name + '</span> <span class="tag is-yours">On screen</span>'
          : '<button type="button" class="sbs-go" data-go="' + k.id + '"><span class="sbs-n">' + k.name + '</span> <span class="sbs-a">Show this one</span></button>') + '</th>' +
        '<td role="cell"><span class="sbs-l" aria-hidden="true">Day one</span><span class="sbs-f">' + fig(c, p + 'cost.total') + '</span>' + (as ? ' ' + assumed() : '') + '</td>' +
        '<td role="cell"><span class="sbs-l" aria-hidden="true">Each month</span><span class="sbs-f">' + fig(c, p + 'year1.net/12', 'usd-abs') + '</span> <span class="sbs-w">' + monthWord(r.year1.net) + '</span></td>' +
        '<td role="cell"><span class="sbs-l" aria-hidden="true">Ten years</span><span class="sbs-f">' + fig(c, p + 'ten.net', 'usd-abs') + '</span> <span class="sbs-w">' + tenWord(r.ten.net) + '</span></td></tr>';
    }).join('');
  },
  // --- the steps, the plain answers, the method
  steps: function (c) {
    return stepsFor(c).steps.map(function (s) { return '<li><b>' + s[0] + '</b> <span>' + s[1] + '</span></li>'; }).join('');
  },
  stepsnote: function (c) { return stepsFor(c).note; },
  'pa-rate': function (c) {
    return 'No. A write-off shrinks your tax bill. It does not refund what you spent. At your ' + fig(c, 'rate', 'pct') + ' tax rate, every $1,000 in write-offs trims your tax by about ' + fig(c, 'rate*1000') + '.';
  },
  /* The model works the saving out from the tables: the tax without the deductions less the tax with them. Every
     rate and limit in the sentence is the model's own. */
  'm-office': function (c) {
    var y = c.R.taxYear, O = 'DATA.OFFICE.';
    return 'Home office: the building over ' + fig(c, O + 'life', 'num') + ' years, the first year\'s loan interest and the running costs. ' +
      'What they save is your tax without them less your tax with them, on the ' + fig(c, 'taxYear', 'num') + ' tables: income tax after the ' + fig(c, O + 'qbi', 'pct') +
      ' business income deduction, and self-employment tax. That tax is charged on ' + fig(c, O + 'net', 'pct') + ' of profit, and its Social Security part stops at the wage base (' +
      fig(c, O + 'wageBase.' + y) + ' in ' + fig(c, 'taxYear', 'num') + '), so past about ' + fig(c, O + 'wageBase.' + y + '/' + O + 'net', 'usd-k') +
      ' of profit a deducted dollar saves only Medicare\'s ' + fig(c, O + 'medicare', 'pct') + ' of it. We treat household income as one person\'s business profit.';
  }
};
// What would turn round a rental that costs money each month. Only what the page can still change is offered:
// the longest loan it takes cannot get longer.
function whatHelps(c) {
  var R = c.R;
  if (!(R.loan.amount > 0)) return 'A higher rent changes that.';
  return R.input.years >= Math.max.apply(null, FIELDS.years.of) ? 'More money down or a higher rent changes that.' : 'More money down, a longer loan or a higher rent changes that.';
}
function view(name, c) {
  if (VIEW[name]) return VIEW[name](c);
  if (name.slice(0, 2) === 't-') return tagView(c, name.slice(2));
  if (name.slice(0, 4) === 'sws-') return counted(c, name.slice(4)) ? 'Counted' : 'Not counted';
  if (name.slice(0, 4) === 'svn-') return savingAmount(c, name.slice(4));
  if (name.slice(0, 4) === 'svc-') return savingOnCard(c, name.slice(4));   // a saving's amount on its card in the directory
  return '';
}

/* ------------------------------------------------------------------ SHOW: what applies to this lot and this plan */
var SHOW = {
  num: function (c) { return c.S.use !== 'down'; },
  down: function (c) { return c.S.use === 'down'; },
  rent: isRent,
  par: function (c) { return kind(c) === 'par'; },
  off: function (c) { return kind(c) === 'off'; },
  family: function (c) { return !isRent(c); },
  'back-row': function (c) { return kind(c) === 'par' || kind(c) === 'off'; },
  loan: function (c) { return c.R.input.pay === 'loan'; },
  cash: function (c) { return c.R.input.pay !== 'loan'; },
  'has-loan': function (c) { return c.R.loan.amount > 0; },
  'plan-why': function (c) { return c.R.plan.fits !== true && !!c.R.plan.why; },
  'city-unknown': function (c) { return !!c.R.place.cityFeesUnknown; },
  'has-exempt': function (c) { return !!c.R.cost.exempt; },
  'sv-boost': function (c) { return !!sav(c, 'boost'); },
  'sv-granny': function (c) { return !!sav(c, 'granny'); },
  'sv-dep': function (c) { return !!sav(c, 'dep'); },
  'sv-hoh': function (c) { return !!sav(c, 'hoh'); },
  'mills-range': function (c) { return !!c.R.place.millsRange; },
  cap: function (c) { return isRent(c) && counted(c, 'waiver'); },
  changed: function (c) { return changed(c.S); },
  'neg-month': function (c) { return c.R.year1.net < 0; },
  'neg-ten': function (c) { return c.R.ten.net < 0; }
};
function show(name, c) { return SHOW[name] ? !!SHOW[name](c) : true; }
// The custom properties a slider's frame carries: how far it is filled, and the mark on the rent track.
function sliderStyle(c, k) {
  var f = FIELDS[k], v = cur(c, k), s = '--pn:' + r4((clamp(v, f.min, f.max) - f.min) / (f.max - f.min));
  if (k === 'rent' && c.R.rent) s += ';--cap:' + r4((clamp(c.R.rent.cap, f.min, f.max) - f.min) / (f.max - f.min));
  return s;
}
// What a slider says to a screen reader in place of its bare number.
function sliderText(c, k) { return usd(cur(c, k)) + (FIELDS[k].per || ''); }

/* ================================================================== THE PAGE (browser only) */
function boot() {
  var doc = root.document, page = doc && doc.getElementById('main');
  if (!page || !doc.getElementById('rn')) return;
  var $ = function (id) { return doc.getElementById(id); };
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var q = readQuery(root.location.search), S = q.S, c = null;
  var ui = { view: 'mine', chips: {}, q: '', open: {} }, dirKey = '';
  var typing = null, typedOver, frame = 0, urlTimer = 0, sayTimer = 0, sayNext = '', quiet = true, sayList = false;   // typing: the field being typed in, typedOver: what it held; quiet: nothing is announced while the page opens

  /* ---- where to start: the link, then what this browser remembers, then the home page's pick.
     A link that names a place brings its own home with it (Check My Lot sends the one that fits the lot). */
  (function () {
    var st = null, home = null;
    try { st = JSON.parse(root.localStorage.getItem(STORE) || 'null'); home = root.localStorage.getItem(HOME_USE); } catch (e) { /* private mode: start from the defaults */ }
    if (!q.has.loc && st && PLACES.indexOf(st.loc) > -1) {
      S.loc = st.loc;
      if (!q.has.plan && PLANS.indexOf(st.plan) > -1) S.plan = st.plan;
    }
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
    if (frame) { (root.cancelAnimationFrame || clearTimeout)(frame); frame = 0; }
    c = context(S);
    var key = [S.loc, kind(c), S.use === 'down', ui.view, Object.keys(ui.chips).sort().join(), ui.q].join('|');
    if (key !== dirKey) { dirKey = key; drawDirectory(); }
    paint();
    clearTimeout(urlTimer); urlTimer = setTimeout(remember, 250);
    clearTimeout(sayTimer); if (!quiet) sayTimer = setTimeout(say, 700);
  }
  function schedule() { if (!frame) frame = root.requestAnimationFrame ? root.requestAnimationFrame(function () { frame = 0; render(); }) : setTimeout(function () { frame = 0; render(); }, 16); }
  /* A choice (a tile, a switch, a segment) redraws at once, and the control stays where the hand left it: if the
     words above it changed length, the page scrolls by the difference. Sliders never need this, because the lines
     they change are reserved. */
  function hold(el, fn) {
    var a = el.getBoundingClientRect().top, d;
    fn(); render();
    d = el.isConnected ? el.getBoundingClientRect().top - a : 0;
    if (Math.abs(d) >= 1) root.scrollBy({ top: d, left: 0, behavior: 'instant' });
  }
  function remember() {
    try { root.history.replaceState(null, '', root.location.pathname + writeQuery(S) + root.location.hash); } catch (e) { /* a sandboxed frame: the link stays as it was */ }
    try { root.localStorage.setItem(STORE, JSON.stringify({ loc: S.loc, use: S.use, plan: S.plan })); } catch (e) { /* storage is off */ }
  }
  // One polite sentence, once the controls have settled.
  function say() {
    var R = c.R, out = $('rnSay'), t;
    if (sayList) { sayList = false; out.textContent = $('dirCount').textContent; return; }
    if (S.use === 'down') t = 'Downsizing into the backyard home. No numbers for this one. Book a free call.';
    else t = plain(view('for', c)) + '. About ' + usd(R.cost.total) + ' all in. About ' + usd(Math.abs(R.year1.net / 12)) + ' a month ' + strip(view('r2', c)) + '. About ' + usd(Math.abs(R.ten.net)) + ' ' + strip(view('r3', c)) + ' in ten years.';
    out.textContent = (sayNext ? sayNext + ' ' : '') + t; sayNext = '';
  }
  function strip(h) { return h.replace(/<[^>]*>/g, ''); }
  function plain(h) { return strip(h).replace(/&#39;/g, '\'').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }
  function homeLine() { var p = c.R.plan; return c.R.place.name + ': showing ' + HOME[p.id].the + ', ' + usd(p.price) + '.'; }

  /* ---- changing a number */
  function setKey(k, v) {
    if (k === 'loc' || k === 'per') S[k] = v;
    else if (k === 'use') setUse(S, v);              // the figures typed for one kind of home stay with that kind
    else if (k === 'plan') S.plan = v;
    else if (k === 'mode') { S.on.waiver = v === 'afford'; tidy(S); }
    else { S.set[k] = v; if (v === defaultOf(S, k)) delete S.set[k]; }
  }
  function fieldBox(el) { return el.closest('.rw-sub, .rw, .lev'); }
  /* One line under a field: what was typed is outside its limits, or cannot be read. The line is tied to its field
     (aria-describedby), so a screen reader says it again whenever the field is entered. It goes when the field is
     typed in again. */
  function tell(el, msg) {
    var box = fieldBox(el), p;
    if (!box || !el.id) return;
    p = doc.createElement('div'); p.className = 'field-err'; p.id = el.id + '-err'; p.textContent = msg; box.appendChild(p);
    el.setAttribute('aria-describedby', ((el.getAttribute('aria-describedby') || '') + ' ' + p.id).trim());
    sayNext = msg;
  }
  function clearLimit(el) {
    var old = el.id ? $(el.id + '-err') : null, d;
    if (!old) return;
    old.parentNode.removeChild(old);
    d = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (x) { return x && x !== old.id; }).join(' ');
    if (d) el.setAttribute('aria-describedby', d); else el.removeAttribute('aria-describedby');
  }
  function putBack(k) { if (typedOver === undefined) delete S.set[k]; else S.set[k] = typedOver; }   // the figure as it stood before this typing began
  /* Typing is finished. A number is kept inside the field's limits; anything else ("32k") puts back what the field
     held. Either way the page says so under the field. Nothing typed since the last time: the field and its line stand. */
  function commit(el) {
    var k = el.getAttribute('data-k'), n, lim, msg = '';
    if (typing !== el) return;
    n = parseField(k, el.value);
    if (n !== undefined) { lim = limits(c, k); msg = limitText(c, k, n); setKey(k, clamp(n, lim[0], lim[1])); }
    else { putBack(k); c = context(S); if (/\S/.test(el.value)) msg = oddText(c, k); }
    typing = null;
    clearLimit(el);
    if (msg) tell(el, msg);
    schedule();
  }
  page.addEventListener('input', function (e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-k'), n, lim;
    if (el.id === 'dirQ') { ui.q = el.value; if (ui.q) setView('all'); sayList = true; schedule(); return; }
    if (!k || el.type === 'radio' || el.tagName === 'SELECT') return;
    if (el.type === 'range') { setKey(k, +el.value); schedule(); return; }
    if (typing !== el) { typing = el; typedOver = S.set[k]; clearLimit(el); }   // typing begins: remember what the field held
    n = parseField(k, el.value);
    if (n === undefined) putBack(k);                 // nothing usable typed yet: the numbers wait where they were
    else { lim = limits(c, k); setKey(k, clamp(n, lim[0], lim[1])); }
    schedule();
  });
  page.addEventListener('change', function (e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-k'), f = el.getAttribute && el.getAttribute('data-on'), t, was, why, now, line;
    if (el.name === 'dirview') { setView(el.value); sayList = true; schedule(); return; }
    if (f) {
      f = flagOf(c, f);
      if (!f) return;
      if (el.getAttribute('aria-disabled') === 'true') { el.checked = false; sayNext = strip(savingText(c, sav(c, f)).help); schedule(); return; }
      hold(el, function () { S.on[f] = el.checked; tidy(S); });
      t = sav(c, f);
      sayNext = t ? plain(savingText(c, t).name) + (!el.checked ? ' not counted.' : t.status === 'call' ? ' counted. It needs a yes first.' : ' counted.') : '';
      swap(); return;
    }
    if (!k) return;
    if (el.type === 'radio' || el.tagName === 'SELECT') {
      was = c.R.plan.id; why = c.R.plan.fits !== true && c.R.plan.why || '';
      hold(el, function () { setKey(k, PICKS.indexOf(k) > -1 ? el.value : parseField(k, el.value)); });
      line = k === 'loc' && !S.plan && c.R.plan.id !== was ? homeLine() : '';
      /* The line under the home has just appeared or changed. It is the one warning that the home chosen does not
         meet the place's rules, and a screen reader hears a group's description only on entering the group. */
      now = c.R.plan.fits !== true && c.R.plan.why || '';
      if ((k === 'loc' || k === 'plan') && now && now !== why) line += (line ? ' ' : '') + (c.R.plan.fits === false ? D.STATUS.warn + ': ' : '') + now;
      if (line) sayNext = line;
      if (k === 'mode') sayNext = el.value !== 'afford' ? 'At market rent: the impact fees are paid in full.'
        : 'As affordable housing' + (c.R.cost.waived > 0 ? ': ' + usd(c.R.cost.waived) + ' of impact fees assumed ' + (bro(c) ? 'waived' : 'exempt') : '') + '.';
      swap(); return;
    }
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
    if ((k = find(CASES, b.getAttribute('data-go')))) {    // a row of the side-by-side table: show that one, and go to the answer
      showCase(S, k.id);
      sayNext = k.name + '.'; render(); swap(); $('ansH').focus(); return;
    }
    if (b.id === 'rnCopy') { copyLink(b); return; }
    if (b.id === 'rnReset') { S.set = {}; S.on = {}; S.keep = {}; S.per = 'month'; each(page.querySelectorAll('.fld'), clearLimit); sayNext = 'Back to our estimates.'; render(); $('ansH').focus(); return; }
    if ((k = b.getAttribute('data-chip'))) { if (ui.chips[k]) delete ui.chips[k]; else ui.chips[k] = 1; setView('all'); sayList = true; schedule(); return; }
    if ((k = b.getAttribute('data-dir'))) {
      if (k === 'clear') { ui.q = ''; $('dirQ').value = ''; ui.chips = {}; }
      setView('all'); sayList = true; render(); $('dirQ').focus(); return;
    }
    id = b.tagName === 'A' && (b.getAttribute('href') || '').match(/^#p-([a-z0-9-]+)$/);
    if (id) { e.preventDefault(); openCard(id[1], true); }
  });
  function copyLink(b) {                              // the copied link always names the place and the purpose: it must open the same answer in someone else's browser
    var url = root.location.origin + root.location.pathname + writeQuery(S, true), label = b.getAttribute('data-label') || b.textContent;
    remember(); b.setAttribute('data-label', label);
    function done() { b.textContent = 'Link copied'; $('rnSay').textContent = 'Link copied.'; setTimeout(function () { b.textContent = label; }, 1800); }
    function fail() { $('rnSay').textContent = 'Copy is not available here. The address bar holds the link.'; b.textContent = 'Copy it from the address bar'; setTimeout(function () { b.textContent = label; }, 4000); }
    if (root.navigator.clipboard && root.navigator.clipboard.writeText) root.navigator.clipboard.writeText(url).then(done, fail); else fail();
  }

  /* ---- the directory: the cards for this place and purpose, from js/money-data.js.
     A home office reads the cards for family use. */
  function setView(v) { ui.view = v; each(page.querySelectorAll('input[name="dirview"]'), function (r) { r.checked = r.value === v; }); }
  function dirUse() { var u = kind(c); return u === 'off' ? 'fam' : u; }
  function base() { var u = dirUse(); return D.ITEMS.filter(function (it) { return it.w.indexOf(S.loc) > -1 && it.u.indexOf(u) > -1; }); }
  function mine() {
    var ids = {};
    c.R.savings.forEach(function (s) { ids[s.card] = 1; });
    return ids;
  }
  function limitTable() {                             // the income and rent limits behind a fee exemption
    var L = D.LIM[c.R.place.county], tier = c.R.rent ? c.R.rent.tier : 0, h;
    if (!L) return '';
    h = '<div class="table-scroll" role="region" aria-label="Income and rent limits, ' + esc(L.name) + '" tabindex="0"><table class="data-table wide rn-lim"><caption><span class="rn-cap">Income and rent limits in ' + esc(L.name) +
      '. Rents include utilities. Incomes are the most a household of that size can earn.</span></caption><thead><tr><th scope="col">Share of median income</th><th scope="col" class="num">Efficiency rent</th><th scope="col" class="num">One-bedroom rent</th>' +
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
    own.forEach(function (s) {                        // the list is drawn once for a place and purpose: the amount is a view, so every later change reaches it
      var sw = s.id !== 'writeoffs';
      h += '<div class="rn-mine"><span id="mine-' + s.id + '"><b>In your numbers:</b> <span class="rn-mine-n" data-v="svc-' + s.id + '"></span></span>' +
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
    var what = { rent: 'a rental', par: 'a parents\' home', fam: 'a guest house', off: 'a home office' }[u] + ' in ' + c.R.place.inName;
    list = all.filter(function (it) {
      var hay;
      if (ui.view === 'mine' && !(ids[it.id] || it.s === 'warn')) return false;
      if (chips.length && chips.indexOf(it.s) < 0) return false;
      if (!words.length) return true;
      hay = [it.t, pick(it.worth, S.loc), pick(it.who, S.loc), pick(it['catch'], S.loc), pick(it.when, S.loc), it.cite || ''].join(' ').toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) > -1; });
    });
    // every card that is counted is listed: one whose category the directory does not name goes under a last heading
    D.CATS.concat([['', 'Everything else']]).forEach(function (cat) {
      var its = list.filter(function (it) { return cat[0] ? it.c === cat[0] : !D.CATS.some(function (k) { return k[0] === it.c; }); });
      if (its.length) h += '<div class="rn-cat"><h3>' + esc(cat[1]) + '</h3><span class="rn-cat-n">' + its.length + '<span class="sr-only"> listed</span></span></div>' + its.map(cardHtml).join('');
    });
    if (!list.length) {
      h = '<div class="rn-empty">Nothing matches' + (ui.q ? ' “' + esc(ui.q) + '”' : ' that') + ' for ' + esc(what) + '. <button type="button" class="rn-alt" data-dir="clear">Clear the search</button>, or <button type="button" class="rn-alt" data-dir="all">show all ' + all.length + '</button>.</div>';
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
  quiet = false;
  doc.documentElement.classList.remove('rn-wait');   // the right numbers are drawn: show them (see the line in the page's head)
}

return { boot: boot, FIELDS: FIELDS, FLAGS: FLAGS, SWITCHES: SWITCHES, PICKS: PICKS, PLACES: PLACES, USES: USES, CASES: CASES, KINDS: KINDS, STEPS: STEPS, VIEW: VIEW, SHOW: SHOW,
  blank: blank, copyState: copyState, context: context, inputFor: inputFor, caseOf: caseOf, setUse: setUse, showCase: showCase, view: view, show: show, val: val, fmt: fmt, cur: cur,
  fieldText: fieldText, sliderStyle: sliderStyle, counted: counted, isOn: isOn, readQuery: readQuery, writeQuery: writeQuery, tidy: tidy, parseField: parseField,
  limitText: limitText, oddText: oddText, stepsFor: stepsFor };
});
