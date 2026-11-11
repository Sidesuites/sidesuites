/* Sidesuites money model: what a backyard home costs, saves and earns.
   Pure functions, no DOM. The calculator page (js/money.js) draws what this returns; tools/pages/tests/money-model.test.js
   checks it. Every figure a homeowner sees starts in this file.

   YEARLY UPDATE: the numbers that change every year live in the DATA block below, each with its source. New tax
   tables come out each autumn, rent and income limits each spring, millage each autumn, fee schedules when a county
   adopts one. Change them there and run the tests: node --test tools/pages/tests/*.test.js */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SSMoney = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

/* ------------------------------------------------------------------ DATA (checked November 2026) */

// What Sidesuites charges, as published on the home page and /adu-cost/.
// lot = permits, site prep and utility tie-ins: an estimate until the site-plan quote replaces it.
var PRICE = { home: 99999, install: 30000, lot: 20000 };

/* Federal income tax. [top of bracket, rate]. A home ordered now is first lived in or rented in 2027, so 2027 is the
   default (IRS news release IR-2026-133 and Rev. Proc. 2026-35, November 5, 2026). 2026 (Rev. Proc. 2025-32) is kept
   for returns filed for 2026 and for the test that compares this model with the first draft calculator. */
var TAXES = {
  2026: {
    single:  { std: 16100, steps: [[12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]] },
    married: { std: 32200, steps: [[24800, 0.10], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]] },
    hoh:     { std: 24150, steps: [[17700, 0.10], [67450, 0.12], [105700, 0.22], [201750, 0.24], [256200, 0.32], [640600, 0.35], [Infinity, 0.37]] }
  },
  2027: {
    single:  { std: 16600, steps: [[12800, 0.10], [52025, 0.12], [109125, 0.22], [208325, 0.24], [264550, 0.32], [661375, 0.35], [Infinity, 0.37]] },
    married: { std: 33200, steps: [[25600, 0.10], [104050, 0.12], [218250, 0.22], [416650, 0.24], [529100, 0.32], [793650, 0.35], [Infinity, 0.37]] },
    hoh:     { std: 24925, steps: [[18250, 0.10], [69650, 0.12], [109100, 0.22], [208300, 0.24], [264550, 0.32], [661350, 0.35], [Infinity, 0.37]] }
  }
};
var TAX_YEAR = 2027;
var LIFE = 27.5;             // years the IRS spreads a rental home's cost over (IRS Publication 527)
// Share of the cost a tax preparer can usually write off in year one (appliances, furniture, fencing, walkways, a
// driveway). Cost segregation firms publish 15% to 30% for homes; 15% is the careful end for a unit this size.
var BOOST_SHARE = 0.15;
var LOSS_ALLOWANCE = 25000;  // rental loss a hands-on owner may set against wages (IRC 469(i))...
var LOSS_PHASE_START = 100000; // ...cut 50 cents on the dollar above this income, gone at $150,000
var DEPENDENT_CREDIT = 500;  // credit for other dependents, per parent (IRS Publication 501)
var OFFICE_RATE = 5, OFFICE_MAX_SQFT = 300; // simplified home office method (IRS Rev. Proc. 2013-13)

// Share of what you spend on the build that the county is likely to add to your assessed value. New construction is
// added at "just value" on the January 1 after it is finished; the appraiser sets it. This share is our estimate,
// not a published figure, and the visitor can change it.
var ASSESS_SHARE = 0.8;
// Granny flat reduction (Florida Statutes 193.703): the unit's added value comes off the assessment, up to this
// share of the property's total assessed value as improved.
var GRANNY_CAP = 0.20;
// Homestead exemption from January 1, 2028, the first tax year a unit ordered now is on the roll (Amendment 3,
// approved November 3, 2026): the first $250,000 of assessed value for non-school taxes, $25,000 for school taxes.
var HOMESTEAD = { other: 250000, school: 25000 };

/* What the home may add to the property's value, as a share of the whole project cost. The one local figure we found:
   the Remodeling 2025 Cost vs. Value Report puts a Miami ADU at about 35 cents of resale value per dollar spent.
   band = where other evidence falls. An adjustable estimate, never a promise: only an appraisal can say. */
var VALUE = { pct: 0.35, min: 0, max: 1, band: [0.2, 0.6] };

// Rent ceilings, utilities included, at the income tier each fee waiver uses (Florida Housing Finance
// Corporation 2026 limits, in force May 1, 2026; new limits each spring). [efficiency, one bedroom]
var RENT_CAP = { md: { tier: 120, cap: [2862, 3066] }, bro: { tier: 80, cap: [1774, 1901] } };

/* Where the lot is.
   mills: 2026 tax per $1,000 of taxable value; total, and the school share (the homestead exemption treats them
     differently). Cities differ: the two "depends on your city" places use a middle rate and say so.
   fees: one-time impact and school fees on a detached unit this size, from the published schedules. low and high are
     the single-family row, the plain reading for a detached unit; alt is the multi-family row, which the county
     may apply instead. waive[use] = who can ask for the fee to be waived or exempted, and the card that says how.
   unit: 0 = counted as an efficiency for the rent ceiling (City of Miami, under 450 sq ft), 1 = one bedroom. */
var LOC = {
  mdc: { name: 'Unincorporated Miami-Dade', inName: 'unincorporated Miami-Dade', county: 'md', unit: 1, rent: 1800,
    mills: { total: 16.8983, school: 6.623 },
    fees: [
      { id: 'county', label: 'County road, fire, police and park fees', low: 13800, high: 17000, alt: [9900, 11800], waive: { rent: { status: 'call', card: 'md-exempt' } } },
      { id: 'school', label: 'School impact fee', low: 980, high: 980, waive: { par: { status: 'call', card: 'md-school' }, fam: { status: 'call', card: 'md-school' } } }
    ] },
  mia: { name: 'City of Miami', inName: 'the City of Miami', county: 'md', unit: 0, rent: 1800,
    mills: { total: 19.9544, school: 6.623 },
    fees: [
      { id: 'county', label: 'County road fee', low: 9500, high: 9800, alt: [6800, 7000], waive: { rent: { status: 'call', card: 'md-exempt' } } },
      { id: 'city', label: 'City of Miami impact fees', low: 8342, high: 8342 },
      { id: 'school', label: 'School impact fee', low: 980, high: 980, waive: { par: { status: 'call', card: 'md-school' }, fam: { status: 'call', card: 'md-school' } } }
    ] },
  mdo: { name: 'Another Miami-Dade city', inName: 'your Miami-Dade city', county: 'md', unit: 1, rent: 1800, cityFeesUnknown: true,
    mills: { total: 19.5, school: 6.623, range: [15.46, 24.19] },
    fees: [
      { id: 'county', label: 'County road and fire fees', low: 9500, high: 11400, alt: [6800, 8300], waive: { rent: { status: 'call', card: 'md-exempt' } } },
      { id: 'school', label: 'School impact fee', low: 980, high: 980, waive: { par: { status: 'call', card: 'md-school' }, fam: { status: 'call', card: 'md-school' } } }
    ] },
  bro: { name: 'Broward County', inName: 'Broward', county: 'bro', unit: 1, rent: 1750, cityFeesUnknown: true,
    mills: { total: 19.5, school: 6.4, range: [16.4, 23.15] },
    fees: [
      { id: 'school', label: 'School impact fee', low: 8809, high: 8809, waive: { rent: { status: 'call', card: 'bro-school' } } }
    ] }
};

var DEFAULTS = {
  loc: 'mdc', use: 'rent',
  install: PRICE.install, lot: PRICE.lot, fee: {},          // fee: { id: amount } overrides an estimate
  pay: 'loan', down: 30000, rate: 8.25, years: 30,
  rent: null, emptyWeeks: 3, ins: null, upkeep: null,        // null = the default for the place and the purpose
  assessedAdd: null,                                          // value the county adds to the assessment
  income: 90000, filing: 'married', taxYear: TAX_YEAR,
  parents: 1, homeAssessed: 400000,
  valuePct: VALUE.pct, boostShare: BOOST_SHARE,
  // Savings the visitor has chosen to count. Anything that needs someone's approval starts off.
  on: { waiver: false, boost: false, school: false, granny: true, dep: false, hoh: false, office: false }
};

/* ------------------------------------------------------------------ building blocks */

function table(year) { return TAXES[year] || TAXES[TAX_YEAR]; }
function taxOn(taxable, filing, year) {
  if (!(taxable > 0)) return 0;
  var t = 0, prev = 0, steps = table(year)[filing].steps;
  for (var i = 0; i < steps.length && taxable > prev; i++) {
    t += (Math.min(taxable, steps[i][0]) - prev) * steps[i][1];
    prev = steps[i][0];
  }
  return t;
}
function marginal(taxable, filing, year) {
  var steps = table(year)[filing].steps;
  for (var i = 0; i < steps.length; i++) if (taxable < steps[i][0]) return steps[i][1];
  return 0.37;
}
function payment(principal, aprPct, years) {
  if (!(principal > 0)) return 0;
  var r = aprPct / 100 / 12, n = years * 12;
  return r === 0 ? principal / n : principal * r / (1 - Math.pow(1 + r, -n));
}
// One row per year: what was paid, how much of it was interest, how much paid the loan down, what is still owed.
function schedule(principal, aprPct, years, horizon) {
  var r = aprPct / 100 / 12, pmt = payment(principal, aprPct, years), bal = principal > 0 ? principal : 0, rows = [];
  for (var y = 1; y <= horizon; y++) {
    var interest = 0, paid = 0;
    for (var m = 0; m < 12 && bal > 0.005; m++) {
      var i = bal * r, p = Math.min(pmt - i, bal);
      interest += i; paid += p; bal -= p;
    }
    if (bal <= 0.005) bal = 0;
    rows.push({ pay: interest + paid, interest: interest, principal: paid, balance: bal });
  }
  return { pmt: pmt, rows: rows };
}
/* Depreciation in year y (1-based) on a rental home: full-year slices, the half slice in year 28. (The IRS counts
   year one from the middle of the month the unit is ready, so a real first year is a little less.) With the boost,
   share of the cost is written off in year one and the yearly slices shrink to match. */
function depreciation(y, basis, share) {
  share = share > 0 ? share : 0;
  var slice = basis * (1 - share) / LIFE;
  var d = y <= 27 ? slice : y === 28 ? slice * 0.5 : 0;
  if (share && y === 1) d += basis * share;
  return d;
}
/* Federal tax caused by the rental in one year. net = rent collected less running costs, interest and depreciation.
   A loss lowers the tax on wages, up to the allowance and never below zero income; what cannot be used waits
   (carry) and comes off later rental profit. Returns the tax (negative = a saving) and the new carry. */
function rentalTax(net, carry, base, allowance, filing, year) {
  if (net >= 0) {
    var use = Math.min(carry, net), taxable = net - use;
    return { tax: taxOn(base + taxable, filing, year) - taxOn(base, filing, year), carry: carry - use, usable: 0, unused: carry - use, taxable: net };
  }
  var avail = -net + carry, usable = Math.min(avail, allowance, base);
  return { tax: taxOn(base - usable, filing, year) - taxOn(base, filing, year), carry: avail - usable, usable: usable, unused: avail - usable, taxable: net };
}
// Property tax on a homestead assessed at v: the exemption is larger for non-school taxes than for school taxes.
function homesteadTax(v, mills) {
  return ((mills.total - mills.school) * Math.max(0, v - HOMESTEAD.other) + mills.school * Math.max(0, v - HOMESTEAD.school)) / 1000;
}
function round(n, to) { return Math.round(n / to) * to; }
function mid(f) { return f.low === f.high ? f.low : round((f.low + f.high) / 2, 100); }   // a published single figure stays exact
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function merge(a, b) {
  var o = {}, k;
  for (k in a) o[k] = a[k];
  for (k in b) if (b[k] !== undefined) o[k] = b[k];
  return o;
}
function withDefaults(inp) {
  inp = inp || {};
  var s = merge(DEFAULTS, inp);
  s.on = merge(DEFAULTS.on, inp.on || {});
  s.fee = merge({}, inp.fee || {});
  if (!LOC[s.loc]) s.loc = DEFAULTS.loc;
  if (s.use !== 'rent' && s.use !== 'par' && s.use !== 'fam') s.use = DEFAULTS.use;
  if (!TAXES[s.taxYear]) s.taxYear = TAX_YEAR;
  if (!TAXES[s.taxYear][s.filing]) s.filing = DEFAULTS.filing;
  s.boostShare = clamp(+s.boostShare >= 0 ? +s.boostShare : BOOST_SHARE, 0, 0.4);
  var L = LOC[s.loc];
  if (s.rent == null) s.rent = L.rent;
  if (s.ins == null) s.ins = s.use === 'rent' ? 150 : 100;       // a rented unit needs its own landlord policy
  if (s.upkeep == null) s.upkeep = s.use === 'rent' ? 100 : 200; // family use: upkeep and the utilities you pay
  return s;
}

/* ------------------------------------------------------------------ the cost, and the savings on it */

function costOf(s) {
  var L = LOC[s.loc], fees = [], feesTotal = 0, waived = 0;
  L.fees.forEach(function (f) {
    var amount = s.fee[f.id] != null ? +s.fee[f.id] : mid(f);
    var w = f.waive && f.waive[s.use] || null;
    var counted = !!w && (s.use === 'rent' ? s.on.waiver : s.on.school);
    fees.push({ id: f.id, label: f.label, amount: amount, low: f.low, high: f.high, alt: f.alt || null, waive: w, counted: counted });
    feesTotal += amount; if (counted) waived += amount;
  });
  var build = PRICE.home + s.install + s.lot;
  return { home: PRICE.home, install: s.install, lot: s.lot, build: build, fees: fees, feesTotal: feesTotal,
    waived: waived, list: build + feesTotal, total: build + feesTotal - waived, cityFeesUnknown: !!L.cityFeesUnknown };
}

/* ------------------------------------------------------------------ compute */

function compute(input, _inner) {
  var s = withDefaults(input), L = LOC[s.loc], Y = s.taxYear, T = TAXES[Y];
  var cost = costOf(s);
  var loanAmt = s.pay === 'loan' ? Math.max(0, cost.total - s.down) : 0;
  var H = 31, sch = schedule(loanAmt, s.rate, s.years, H);
  var cash = cost.total - loanAmt;
  var assessedAdd = s.assessedAdd != null ? Math.max(0, +s.assessedAdd) : round(cost.build * ASSESS_SHARE, 1000);
  var home = Math.max(0, +s.homeAssessed || 0);
  /* Added property tax. A rented unit is taxed on its own, with no exemption, at the full rate. A unit family lives
     in rent-free joins the homestead, so the exemption applies to the whole and a modest home may add little. */
  var ptaxYear = s.use === 'rent' ? assessedAdd * L.mills.total / 1000 : homesteadTax(home + assessedAdd, L.mills) - homesteadTax(home, L.mills);
  var base = Math.max(0, s.income - T[s.filing].std);
  var rate = marginal(base, s.filing, Y);
  var savings = [], notes = [];

  var out = { input: s, taxYear: Y,
    place: { id: s.loc, name: L.name, inName: L.inName, county: L.county, mills: L.mills.total, millsSchool: L.mills.school, millsRange: L.mills.range || null },
    cost: cost,
    loan: { amount: loanAmt, pmt: sch.pmt, years: s.years, rate: s.rate, rows: sch.rows },
    upfront: { total: cost.total, cash: cash, borrowed: loanAmt },
    assessedAdd: assessedAdd, ptaxYear: ptaxYear, rate: rate };

  // The fee that can be waived or exempted for this purpose here, counted or not.
  cost.fees.forEach(function (f) {
    if (!f.waive) return;
    savings.push({ id: s.use === 'rent' ? 'waiver' : 'school', when: 'upfront', label: f.label, amount: f.amount, low: f.low, high: f.high,
      status: f.waive.status, card: f.waive.card, counted: f.counted });
  });

  var years = [], cum = 0, y;

  if (s.use === 'rent') {
    /* ---------- a tenant ---------- */
    var cap = RENT_CAP[L.county], capRent = cap.cap[L.unit];
    var waiverHere = cost.fees.some(function (f) { return f.waive; });
    var rentUsed = s.on.waiver && waiverHere ? Math.min(s.rent, capRent) : s.rent;
    var rentYear = rentUsed * 12, empty = rentYear * s.emptyWeeks / 52, collected = rentYear - empty;
    var running = (s.ins + s.upkeep) * 12 + ptaxYear;
    var allowance = Math.max(0, Math.min(LOSS_ALLOWANCE, LOSS_ALLOWANCE - 0.5 * (s.income - LOSS_PHASE_START)));
    var basis = cost.total;
    // Year by year. Losses that cannot be used wait in "carry" and come off later rental profit.
    var simulate = function (share) {
      var rows = [], carry = 0, sum = 0;
      for (var yy = 1; yy <= H; yy++) {
        var row = sch.rows[yy - 1];
        var t = rentalTax(collected - running - row.interest - depreciation(yy, basis, share), carry, base, allowance, s.filing, Y);
        carry = t.carry;
        var keep = collected - running - row.pay - t.tax;
        sum += keep;
        rows.push({ y: yy, moneyIn: collected, loan: row.pay, running: running, tax: t.tax, keep: keep, cum: sum, balance: row.balance, t: t });
      }
      return rows;
    };
    // The everyday picture never includes the one-time boost: a first-year windfall must not inflate "each month".
    var plainYears = simulate(0), boostYears = simulate(s.boostShare);
    years = s.on.boost ? boostYears : plainYears;
    var first = plainYears[0], dep1 = depreciation(1, basis, 0);
    var noWriteoffs = taxOn(base + collected, s.filing, Y) - taxOn(base, s.filing, Y);
    // Once the loan is paid off: no payment, no interest; depreciation continues only if the loan ends before year 27.5.
    // With no loan there is no "after": the picture now is the picture later.
    var afterTax = rentalTax(collected - running - (s.years < LIFE ? dep1 : 0), 0, base, allowance, s.filing, Y).tax;
    var afterKeep = loanAmt > 0 ? collected - running - afterTax : first.keep;

    out.rent = { asked: s.rent, used: rentUsed, cap: capRent, tier: cap.tier, capped: rentUsed < s.rent, unit: L.unit,
      year: rentYear, empty: empty, collected: collected };
    out.year1 = {
      moneyIn: [{ id: 'rent', label: 'Rent', amount: rentYear }],
      moneyOut: [
        { id: 'loan', label: 'Loan payment', amount: first.loan },
        { id: 'ins', label: 'Insurance', amount: s.ins * 12 },
        { id: 'ptax', label: 'Added property tax', amount: ptaxYear },
        { id: 'upkeep', label: 'Repairs and upkeep', amount: s.upkeep * 12 },
        { id: 'empty', label: 'Empty weeks', amount: empty },
        { id: 'tax', label: 'Income tax on the rent', amount: first.tax }   // negative = tax saved
      ],
      net: first.keep };
    out.tax = { taxable: first.t.taxable, tax: first.tax, usable: first.t.usable, unused: first.t.unused, allowance: allowance,
      interest: sch.rows[0].interest, dep: dep1, running: running, collected: collected,
      writeoffValue: noWriteoffs - first.tax,
      // savings: tax saved in year one. tenYear: what the boost is worth over ten years. The write-offs are taken
      // sooner, not twice: later slices are smaller, and what cannot be used in year one rolls forward.
      boost: { savings: first.tax - boostYears[0].tax, unused: boostYears[0].t.unused, share: s.boostShare, amount: basis * s.boostShare, tenYear: boostYears[9].cum - plainYears[9].cum } };
    out.after = { net: afterKeep, hasLoan: loanAmt > 0 };

    savings.push({ id: 'boost', when: 'upfront', label: 'First-year write-off', amount: out.tax.boost.savings, status: 'go', card: 'bonus', counted: s.on.boost });
    savings.push({ id: 'writeoffs', when: 'yearly', label: 'Tax write-offs on the rent', amount: out.tax.writeoffValue, status: 'go', card: 'depr', counted: true });
    if (out.rent.capped) notes.push('rent-capped');
    if (s.on.waiver && !waiverHere) notes.push('no-waiver-here');
  } else {
    /* ---------- family: parents, or your own use ---------- */
    var moneyOut = [
      { id: 'loan', label: 'Loan payment', amount: sch.rows[0].pay },
      { id: 'ins', label: 'Insurance', amount: s.ins * 12 },
      { id: 'ptax', label: 'Added property tax', amount: ptaxYear },
      { id: 'upkeep', label: 'Upkeep and utilities', amount: s.upkeep * 12 }
    ];
    var back = [];
    if (s.use === 'par') {
      // Granny flat reduction: the unit's added value comes off the assessment, up to 20% of the total as improved.
      // What that saves depends on where the homestead exemption leaves the taxable value.
      var total = home + assessedAdd, room = GRANNY_CAP * total, reduced = Math.min(assessedAdd, room);
      var grannySave = homesteadTax(total, L.mills) - homesteadTax(total - reduced, L.mills);
      out.granny = { reduced: reduced, cap: room, capped: room < assessedAdd, save: grannySave };
      savings.push({ id: 'granny', when: 'yearly', label: 'Granny flat property tax reduction', amount: grannySave, status: 'go', card: 'granny', counted: s.on.granny });
      if (s.on.granny) back.push({ id: 'granny', label: 'Granny flat property tax reduction', amount: grannySave });
      var n = s.parents === 2 ? 2 : 1, depSave = DEPENDENT_CREDIT * n;
      savings.push({ id: 'dep', when: 'yearly', label: n === 2 ? 'Credit for two dependent parents' : 'Credit for a dependent parent', amount: depSave, status: 'go', card: 'dep', counted: s.on.dep });
      if (s.on.dep) back.push({ id: 'dep', label: 'Dependent credit', amount: depSave });
      // Head of household: only for someone unmarried who can claim the parent. The saving is the tax under
      // the single brackets less the tax under the head of household brackets, at this income.
      var hohSave = Math.max(0, taxOn(Math.max(0, s.income - T.single.std), 'single', Y) - taxOn(Math.max(0, s.income - T.hoh.std), 'hoh', Y));
      var hohOk = s.filing !== 'married';
      savings.push({ id: 'hoh', when: 'yearly', label: 'Head of household status', amount: hohOk ? hohSave : 0, status: 'go', card: 'hoh', counted: s.on.hoh && s.on.dep && hohOk, needs: hohOk ? 'dep' : 'unmarried' });
      if (s.on.hoh && s.on.dep && hohOk) back.push({ id: 'hoh', label: 'Head of household status', amount: hohSave });
    } else {
      // A self-employed owner who uses the unit only for the business: the simplified method, the floor of what a
      // tax preparer can claim (the regular method can be worth more).
      var officeSave = OFFICE_RATE * OFFICE_MAX_SQFT * rate;
      savings.push({ id: 'office', when: 'yearly', label: 'Home office deduction', amount: officeSave, status: 'call', card: 'office', counted: s.on.office });
      if (s.on.office) back.push({ id: 'office', label: 'Home office deduction', amount: officeSave });
    }
    var backSum = back.reduce(function (a, b) { return a + b.amount; }, 0);
    var fixed = (s.ins + s.upkeep) * 12 + ptaxYear;
    for (y = 1; y <= H; y++) {
      var r2 = sch.rows[y - 1], net = backSum - fixed - r2.pay;
      cum += net;
      years.push({ y: y, moneyIn: backSum, loan: r2.pay, running: fixed, tax: 0, keep: net, cum: cum, balance: r2.balance });
    }
    out.year1 = { moneyIn: back, moneyOut: moneyOut, net: years[0].keep };
    out.after = { net: backSum - fixed, hasLoan: loanAmt > 0 };
  }

  out.years = years;
  out.ten = { net: years[9].cum, balance: years[9].balance, paidDown: loanAmt - years[9].balance };
  // The year the money that came back passes the money put in on day one (rentals only make sense of this).
  out.payback = null;
  if (s.use === 'rent') for (y = 0; y < years.length; y++) if (years[y].cum >= cash) { out.payback = y + 1; break; }
  // Value the home may add: a share of the whole project cost before any waiver. In none of the totals.
  var pct = clamp(s.valuePct === 0 ? 0 : (+s.valuePct || VALUE.pct), VALUE.min, VALUE.max);
  out.value = { pct: pct, base: cost.list, amount: round(cost.list * pct, 1000), low: round(cost.list * VALUE.band[0], 1000), high: round(cost.list * VALUE.band[1], 1000) };
  out.savings = savings;
  out.saved = {
    upfront: savings.filter(function (v) { return v.when === 'upfront' && v.counted; }).reduce(function (a, v) { return a + v.amount; }, 0),
    upfrontPossible: savings.filter(function (v) { return v.when === 'upfront' && !v.counted; }).reduce(function (a, v) { return a + v.amount; }, 0),
    yearly: savings.filter(function (v) { return v.when === 'yearly' && v.counted; }).reduce(function (a, v) { return a + v.amount; }, 0),
    yearlyPossible: savings.filter(function (v) { return v.when === 'yearly' && !v.counted && v.amount > 0; }).reduce(function (a, v) { return a + v.amount; }, 0)
  };
  out.notes = notes;

  // What counting the fee waiver changes, for the "what if" line: the same inputs with the switch flipped.
  if (!_inner && s.use === 'rent' && savings.some(function (v) { return v.id === 'waiver'; })) {
    var flipped = merge(s, {}); flipped.on = merge(s.on, { waiver: !s.on.waiver });
    var other = compute(flipped, true), w = s.on.waiver ? out : other, wo = s.on.waiver ? other : out;
    out.waiverEffect = { perYear: w.year1.net - wo.year1.net, cost: wo.cost.total - w.cost.total, loanWith: w.loan.amount, loanWithout: wo.loan.amount, rentCapped: w.rent.capped, cap: w.rent.cap };
  }
  return out;
}

return { compute: compute, defaults: function (o) { return withDefaults(o); }, taxOn: taxOn, marginal: marginal, payment: payment,
  schedule: schedule, depreciation: depreciation, rentalTax: rentalTax, homesteadTax: homesteadTax,
  DATA: { PRICE: PRICE, TAX_YEAR: TAX_YEAR, TAX: TAXES[TAX_YEAR], TAXES: TAXES, LOC: LOC, RENT_CAP: RENT_CAP, VALUE: VALUE, LIFE: LIFE, BOOST_SHARE: BOOST_SHARE,
    ASSESS_SHARE: ASSESS_SHARE, GRANNY_CAP: GRANNY_CAP, HOMESTEAD: HOMESTEAD, DEPENDENT_CREDIT: DEPENDENT_CREDIT, LOSS_ALLOWANCE: LOSS_ALLOWANCE,
    LOSS_PHASE_START: LOSS_PHASE_START, DEFAULTS: DEFAULTS } };
});
