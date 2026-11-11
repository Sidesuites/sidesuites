/* Tests for js/money-model.js. Run from the repo root:  node --test tools/pages/tests/
   Three kinds of check: hand arithmetic (tax, loans), agreement with the owner's first draft calculator when both are
   set up the same way, and invariants that must hold for any input (nothing is counted twice, nothing goes missing). */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../../../js/money-model.js');
const draft = require('./fixtures/draft-model.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= (tol == null ? 0.01 : tol), `${msg || ''} expected ${b}, got ${a}`);
// A small seeded generator so a failing random case can be replayed.
function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const step = (r, lo, hi, st) => lo + Math.round(r() * (hi - lo) / st) * st;

test('federal tax by hand, 2026 and 2027 tables', () => {
  near(M.taxOn(0, 'single'), 0);
  near(M.taxOn(-500, 'single'), 0);
  // 2026 (Rev. Proc. 2025-32)
  near(M.taxOn(12400, 'single', 2026), 1240);
  near(M.taxOn(50400, 'single', 2026), 1240 + 38000 * 0.12);                 // 5,800
  near(M.taxOn(60000, 'single', 2026), 5800 + 9600 * 0.22);                  // 7,912
  near(M.taxOn(24800, 'married', 2026), 2480);
  near(M.taxOn(100800, 'married', 2026), 2480 + 76000 * 0.12);               // 11,600
  near(M.taxOn(17700, 'hoh', 2026), 1770);
  near(M.taxOn(67450, 'hoh', 2026), 1770 + 49750 * 0.12);
  // 2027 (Rev. Proc. 2026-35), the default
  assert.equal(M.DATA.TAX_YEAR, 2027);
  assert.deepEqual([M.DATA.TAX.single.std, M.DATA.TAX.married.std, M.DATA.TAX.hoh.std], [16600, 33200, 24925]);
  near(M.taxOn(12800, 'single'), 1280);
  near(M.taxOn(52025, 'single'), 1280 + 39225 * 0.12);                       // 5,987
  near(M.taxOn(25600, 'married'), 2560);
  near(M.taxOn(104050, 'married'), 2560 + 78450 * 0.12);                     // 11,974
  near(M.taxOn(56800, 'married'), 2560 + 31200 * 0.12);                      // $90,000 income less the $33,200 deduction
  near(M.taxOn(18250, 'hoh'), 1825);
  near(M.taxOn(69650, 'hoh'), 1825 + 51400 * 0.12);
  near(M.taxOn(109100, 'hoh'), 1825 + 51400 * 0.12 + 39450 * 0.22);
  assert.equal(M.marginal(56800, 'married'), 0.12);
  assert.equal(M.marginal(104050, 'married'), 0.22);
  assert.equal(M.marginal(1e7, 'single'), 0.37);
  assert.equal(M.taxOn(60000, 'single', 1999), M.taxOn(60000, 'single'), 'an unknown year falls back to the default table');
});

test('tax is continuous and never falls as income rises', () => {
  for (const yr of [2026, 2027]) for (const f of ['single', 'married', 'hoh']) {
    let prev = 0;
    for (let x = 0; x <= 900000; x += 137) {
      const t = M.taxOn(x, f, yr);
      assert.ok(t >= prev - 1e-9, `${f} tax fell at ${x}`);
      assert.ok(t - prev <= 137 * 0.37 + 1e-6, `${f} tax jumped at ${x}`);
      prev = t;
    }
  }
});

test('loan payments match the site\'s financing guide', () => {
  // /adu-financing/: $130,000 at 8.5% is $1,280 over 15 years, $1,128 over 20, $1,000 over 30.
  near(M.payment(130000, 8.5, 15), 1280, 0.6);
  near(M.payment(130000, 8.5, 20), 1128, 0.6);
  near(M.payment(130000, 8.5, 30), 1000, 0.6);
  near(M.payment(120000, 0, 10), 1000);
  assert.equal(M.payment(0, 8, 30), 0);
});

test('a loan is paid off exactly: principal adds up, balance reaches zero and stays there', () => {
  for (const [p, r, n] of [[106000, 8.25, 30], [134000, 8.25, 20], [50000, 11, 15], [164000, 5, 30], [90000, 0, 15]]) {
    const s = M.schedule(p, r, n, 31);
    const paid = s.rows.reduce((a, x) => a + x.principal, 0);
    near(paid, p, 0.5, 'principal repaid');
    assert.equal(s.rows[n - 1].balance, 0, 'balance at the end of the term');
    assert.equal(s.rows[30].pay, 0, 'no payment after the term');
    const interest = s.rows.reduce((a, x) => a + x.interest, 0);
    near(interest + paid, s.pmt * n * 12, 1, 'payments equal principal plus interest');
    for (let i = 1; i < s.rows.length; i++) assert.ok(s.rows[i].balance <= s.rows[i - 1].balance + 1e-9);
  }
});

test('depreciation adds up to the cost, with or without the first-year boost', () => {
  for (const share of [0, 0.15, 0.25]) {
    let sum = 0;
    for (let y = 1; y <= 31; y++) sum += M.depreciation(y, 150000, share);
    near(sum, 150000, 0.01);
  }
  near(M.depreciation(1, 115000, 0), 4181.8, 0.1);   // "about $4,181 a year on a $115,000 structure"
  near(M.depreciation(1, 100000, 0.15), 15000 + 85000 / 27.5, 0.01);
  assert.equal(M.depreciation(29, 150000, 0), 0);
});

// Set up this model the way the draft calculator was: one all-in price of $150,000 with the impact fee inside it,
// the 2026 tax table, and a quarter of the cost written off in year one.
function likeDraft(s, waived = s.waived) {
  const mills = M.DATA.LOC.mdc.mills.total;
  return {
    loc: 'mdc', use: 'rent', install: 30000, fees: draft.PRICE - 99999 - 30000 - (waived ? s.fee : 0),
    pay: s.pay, down: s.down, rate: s.rate, years: s.years, rent: s.rent, emptyWeeks: s.emptyWeeks, ins: s.ins, upkeep: s.upkeep,
    assessedAdd: s.ptax * 12 * 1000 / mills, income: s.income, filing: s.filing, taxYear: 2026, boostShare: 0.25, on: { waiver: false, boost: false }
  };
}
function compare(s, tag) {
  const d = draft.model(s), m = M.compute(likeDraft(s)), c = d.cur;
  near(m.cost.total, c.cost, 0.01, `${tag} cost`);
  near(m.loan.amount, c.loanAmt, 0.01, `${tag} loan`);
  near(m.year1.net, c.keep, 0.01, `${tag} keep`);
  near(m.tax.tax, c.tax, 0.01, `${tag} tax`);
  near(m.tax.taxable, c.taxable, 0.01, `${tag} taxable`);
  near(m.tax.usable, c.usable, 0.01, `${tag} usable loss`);
  near(m.tax.unused, c.unused, 0.01, `${tag} unused loss`);
  near(m.tax.writeoffValue, c.writeoffValue, 0.01, `${tag} write-off value`);
  near(m.tax.boost.savings, c.boost.savings, 0.01, `${tag} boost`);
  near(m.tax.boost.unused, c.boost.unused, 0.01, `${tag} boost unused`);
  near(M.compute(likeDraft(s, true)).year1.net - M.compute(likeDraft(s, false)).year1.net, d.waiverGain, 0.01, `${tag} waiver gain`);
  if (c.after) near(m.after.net, c.after.keep, 0.01, `${tag} after payoff`);
  assert.equal(m.rate, d.rate, `${tag} marginal rate`);
}

test('agrees with the draft calculator at its starting numbers ($437 a month)', () => {
  const s = { rent: 1800, pay: 'loan', down: 30000, rate: 8.25, years: 30, waived: true, fee: 14000, income: 90000, filing: 'married', emptyWeeks: 3, ins: 150, ptax: 200, upkeep: 100 };
  compare(s, 'defaults');
  const m = M.compute(likeDraft(s));
  assert.equal(Math.round(m.year1.net / 12), 437);
  assert.equal(Math.round(m.year1.net), 5242);
  assert.equal(Math.round(m.after.net / 12), 1097);
  assert.equal(Math.round((M.compute(likeDraft(s, true)).year1.net - M.compute(likeDraft(s, false)).year1.net) / 12), 89);
  assert.equal(Math.round(m.tax.writeoffValue), 2287);
});

test('agrees with the draft calculator across 4,000 random set-ups', () => {
  const r = rng(20261110);
  for (let i = 0; i < 4000; i++) {
    const s = {
      rent: step(r, 1200, 2800, 50), pay: pick(r, ['loan', 'loan', 'cash']), down: step(r, 0, 100000, 5000), rate: step(r, 5, 11, 0.25),
      years: pick(r, [15, 20, 30]), waived: r() < 0.5, fee: step(r, 8000, 20000, 500), income: step(r, 30000, 250000, 5000),
      filing: pick(r, ['single', 'married']), emptyWeeks: step(r, 0, 8, 1), ins: step(r, 50, 400, 10), ptax: step(r, 50, 500, 10), upkeep: step(r, 0, 300, 10)
    };
    compare(s, `case ${i} ${JSON.stringify(s)}`);
  }
});

test('year one adds up: money in less money out is what you keep', () => {
  const r = rng(7);
  for (let i = 0; i < 600; i++) {
    const inp = {
      loc: pick(r, ['mdc', 'mia', 'mdo', 'bro']), use: pick(r, ['rent', 'par', 'fam', 'off']), plan: pick(r, ['one', 'eff', undefined]), pay: pick(r, ['loan', 'cash']), down: step(r, 0, 120000, 5000),
      rate: step(r, 5, 11, 0.25), years: pick(r, [15, 20, 30]), rent: step(r, 1200, 3400, 50), emptyWeeks: step(r, 0, 8, 1),
      income: step(r, 30000, 250000, 5000), filing: pick(r, ['single', 'married']), parents: pick(r, [1, 2]), homeAssessed: step(r, 100000, 1500000, 10000),
      valueMultiple: step(r, 6, 16, 1), taxYear: pick(r, [2026, 2027]), fees: step(r, 0, 40000, 1000),
      on: { waiver: r() < 0.5, boost: r() < 0.5, parfee: r() < 0.5, granny: r() < 0.5, dep: r() < 0.5, hoh: r() < 0.5, office: r() < 0.5 }
    };
    const m = M.compute(inp), tag = JSON.stringify(inp);
    const sumIn = m.year1.moneyIn.reduce((a, x) => a + x.amount, 0), sumOut = m.year1.moneyOut.reduce((a, x) => a + x.amount, 0);
    near(sumIn - sumOut, m.year1.net, 0.01, `year one ${tag}`);
    // the cost: home + installation (with permits and lot work) + impact fees, less an exemption that is counted
    near(m.cost.total, m.cost.home + m.cost.install + m.cost.fees - m.cost.waived, 0.01, `cost ${tag}`);
    assert.equal(m.cost.home, M.DATA.PLANS[m.plan.id].price, `the home's price ${tag}`);
    assert.ok(m.cost.waived >= 0 && m.cost.waived <= m.cost.fees, `an exemption cannot pass the fees ${tag}`);
    near(m.upfront.cash + m.upfront.borrowed, m.cost.total, 0.01, `cash plus loan ${tag}`);
    assert.ok(m.upfront.cash >= 0 && m.upfront.borrowed >= 0);
    // ten years is the sum of ten years
    near(m.ten.net, m.years.slice(0, 10).reduce((a, x) => a + x.keep, 0), 0.01, `ten years ${tag}`);
    near(m.ten.paidDown, m.loan.rows.slice(0, 10).reduce((a, x) => a + x.principal, 0), 0.5, `paid down ${tag}`);
    for (const x of [m.year1.net, m.ten.net, m.after.net, m.value.income, m.value.survey, m.value.cost, m.saved.upfront, m.saved.yearly]) assert.ok(Number.isFinite(x), `finite ${tag}`);
    // a saving is counted only when its switch is on, and never twice
    const ids = m.savings.map(v => v.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate saving ${tag}`);
    near(m.saved.upfront, m.savings.filter(v => v.when === 'upfront' && v.counted).reduce((a, v) => a + v.amount, 0), 0.01);
    if (m.input.use !== 'rent') near(m.year1.moneyIn.reduce((a, x) => a + x.amount, 0), m.savings.filter(v => v.when === 'yearly' && v.counted).reduce((a, v) => a + v.amount, 0), 0.01, `money back ${tag}`);
  }
});

test('the starting estimates are the owner\'s: about $150,000, $140,000 for parents, $130,000 as affordable housing', () => {
  for (const loc of ['mdc', 'mia', 'mdo', 'bro']) for (const [plan, less] of [['one', 0], ['eff', 10000]]) {
    assert.equal(M.compute({ loc, plan, use: 'fam' }).cost.total, 149999 - less, `${loc} ${plan} guest house`);
    assert.equal(M.compute({ loc, plan, use: 'off' }).cost.total, 149999 - less, `${loc} ${plan} home office`);
    assert.equal(M.compute({ loc, plan, use: 'rent' }).cost.total, 149999 - less, `${loc} ${plan} rented at market rent`);
    assert.equal(M.compute({ loc, plan, use: 'rent', on: { waiver: true } }).cost.total, 129999 - less, `${loc} ${plan} rented as affordable housing`);
    assert.equal(M.compute({ loc, plan, use: 'par' }).cost.total, 139999 - less, `${loc} ${plan} parents`);
    assert.equal(M.compute({ loc, plan, use: 'par', on: { parfee: false } }).cost.total, 149999 - less, `${loc} ${plan} parents, no lower fees`);
  }
  const d = M.compute({});
  assert.deepEqual([d.cost.home, d.cost.install, d.cost.fees, d.cost.list], [99999, 30000, 20000, 149999]);
});

test('both lower estimates lean on someone\'s yes: flagged, switchable, and never more than the fees', () => {
  for (const loc of ['mdc', 'mia', 'mdo', 'bro']) {
    const off = M.compute({ loc, use: 'rent' }), on = M.compute({ loc, use: 'rent', on: { waiver: true } });
    const w = off.savings.find(v => v.id === 'waiver');
    assert.ok(w && w.status === 'call' && w.counted === false, `${loc}: market rent does not assume the exemption`);
    assert.equal(w.card, loc === 'bro' ? 'bro-school' : 'md-exempt');
    near(off.cost.total - on.cost.total, 20000, 0.01);
    near(on.waiverEffect.cost, 20000, 0.01);
    assert.equal(off.cost.total, off.cost.list);
    const p = M.compute({ loc, use: 'par' }).savings.find(v => v.id === 'parfee');
    assert.ok(p && p.status === 'call' && p.counted === true && p.amount === 10000);
    assert.equal(p.card, loc === 'bro' ? 'par-fees-bro' : 'par-fees');
  }
  // the visitor's own figure after a call to the county
  assert.equal(M.compute({ use: 'rent', exemptAmt: 15400, on: { waiver: true } }).cost.total, 149999 - 15400);
  // the Efficiency keeps the same assumptions on a lower price
  assert.equal(M.compute({ use: 'rent', plan: 'eff', exemptAmt: 15400, on: { waiver: true } }).cost.total, 139999 - 15400);
  assert.equal(M.compute({ use: 'rent', exemptAmt: 99999, on: { waiver: true } }).cost.total, 129999, 'capped at the fees');
  assert.equal(M.compute({ use: 'rent', fees: 5000, on: { waiver: true } }).cost.total, 129999, 'fees of $5,000, all exempt');
  // a guest house and a home office assume no exemption at all
  for (const use of ['fam', 'off']) assert.equal(M.compute({ use }).savings.filter(v => v.when === 'upfront').length, 0);
});

test('with the waiver counted, the rent cannot pass the cap for that tier', () => {
  const b = M.compute({ loc: 'bro', use: 'rent', rent: 2400, on: { waiver: true } });
  assert.equal(b.rent.cap, 1901); assert.equal(b.rent.tier, 80);
  assert.equal(b.rent.used, 1901); assert.ok(b.rent.capped); assert.ok(b.notes.includes('rent-capped'));
  const free = M.compute({ loc: 'bro', use: 'rent', rent: 2400 });
  assert.equal(free.rent.used, 2400); assert.equal(free.rent.capped, false);
  const mia = M.compute({ loc: 'mia', use: 'rent', rent: 3000, on: { waiver: true } });
  assert.equal(mia.rent.cap, 2862, 'under 450 sq ft the City of Miami counts the unit as an efficiency');
  const mdc = M.compute({ loc: 'mdc', use: 'rent', rent: 3000, on: { waiver: true } });
  assert.equal(mdc.rent.cap, 3066); assert.equal(mdc.rent.capped, false);
});

test('more rent, a lower rate or more money down never lowers what you keep', () => {
  const base = { loc: 'mdc', use: 'rent' };
  let prev = -Infinity;
  for (let rent = 1200; rent <= 2800; rent += 50) { const k = M.compute({ ...base, rent }).year1.net; assert.ok(k >= prev); prev = k; }
  prev = -Infinity;
  for (let rate = 11; rate >= 5; rate -= 0.25) { const k = M.compute({ ...base, rate }).year1.net; assert.ok(k >= prev - 1e-6, `rate ${rate}`); prev = k; }
  prev = -Infinity;
  for (let down = 0; down <= 160000; down += 5000) { const k = M.compute({ ...base, down }).year1.net; assert.ok(k >= prev - 1e-6, `down ${down}`); prev = k; }
});

test('paying cash: no loan, no interest, and the result after payoff is the result now', () => {
  const m = M.compute({ loc: 'mdc', use: 'rent', pay: 'cash' });
  assert.equal(m.loan.amount, 0); assert.equal(m.upfront.cash, m.cost.total);
  assert.equal(m.year1.moneyOut.find(x => x.id === 'loan').amount, 0);
  near(m.after.net, m.year1.net, 0.01);
  assert.equal(m.after.hasLoan, false);
  assert.ok(m.payback > 0, 'a cash purchase pays itself back in some year');
});

test('rental losses: capped by the allowance, phased out by income, and carried forward', () => {
  // A big first-year write-off at a high income cannot be used and must wait.
  const high = M.compute({ loc: 'mdc', use: 'rent', income: 200000, on: { boost: true } });
  assert.equal(high.tax.allowance, 0);
  // above $150,000 a loss cannot come off wages: the write-off can only erase the tax on the rental's own profit
  assert.equal(high.tax.usable, 0);
  assert.ok(high.tax.boost.savings <= Math.max(0, high.tax.tax) + 0.01, 'no saving against wages above $150,000');
  assert.ok(high.tax.boost.unused > 10000);
  const mid = M.compute({ loc: 'mdc', use: 'rent', income: 120000 });
  assert.equal(mid.tax.allowance, 15000);
  const low = M.compute({ loc: 'mdc', use: 'rent', income: 90000, on: { boost: true } });
  assert.equal(low.tax.allowance, 25000);
  assert.ok(low.tax.boost.savings > 0);
  // The boost moves write-offs forward, it does not create new ones: what cannot be used in year one rolls on, and
  // over ten years it is worth far less than the write-off times the top rate.
  // at $90,000 the whole first-year write-off can be used; at $140,000 the allowance is down to $5,000 and the rest waits
  assert.equal(low.tax.boost.unused, 0);
  const squeezed = M.compute({ loc: 'mdc', use: 'rent', income: 140000, on: { boost: true } });
  assert.equal(squeezed.tax.allowance, 5000);
  assert.ok(squeezed.tax.boost.unused > 10000, 'part of a big first-year write-off waits');
  assert.ok(low.tax.boost.tenYear > 0);
  assert.equal(low.tax.boost.share, 0.15);
  near(low.tax.boost.amount, 0.15 * low.cost.total, 0.01);
  assert.ok(low.tax.boost.tenYear < low.tax.boost.amount * 0.22);
  near(low.years[0].tax, low.tax.tax - low.tax.boost.savings, 0.01, 'year one of the long-run view carries the boost');
  // The everyday year never includes the boost.
  near(low.year1.net, M.compute({ loc: 'mdc', use: 'rent', income: 90000 }).year1.net, 0.01);
  assert.ok(low.ten.net > M.compute({ loc: 'mdc', use: 'rent', income: 90000 }).ten.net);
  // Unit level: a carried loss comes off later profit before it is taxed.
  const t = M.rentalTax(4000, 10000, 57800, 25000, 'married');
  near(t.tax, 0); near(t.carry, 6000);
  const u = M.rentalTax(-30000, 0, 57800, 25000, 'married');
  near(u.usable, 25000); near(u.carry, 5000); assert.ok(u.tax < 0);
  const v = M.rentalTax(-30000, 0, 10000, 25000, 'married');
  near(v.usable, 10000, 0.01, 'a loss cannot push taxable income below zero');
});

test('granny flat reduction: the added value, capped at 20% of the total assessed value', () => {
  const mills = M.DATA.LOC.mdc.mills.total;
  // $400,000 home + $120,000 added = $520,000; 20% is $104,000, so the cap bites.
  const a = M.compute({ loc: 'mdc', use: 'par', homeAssessed: 400000, assessedAdd: 120000 });
  near(a.granny.cap, 104000); near(a.granny.reduced, 104000); assert.ok(a.granny.capped);
  near(a.granny.save, 104000 * mills / 1000);
  // $1,000,000 home: 20% of $1,120,000 is $224,000, so the whole $120,000 comes off.
  const b = M.compute({ loc: 'mdc', use: 'par', homeAssessed: 1000000, assessedAdd: 120000 });
  near(b.granny.reduced, 120000); assert.equal(b.granny.capped, false);
  near(b.granny.save, b.ptaxYear, 0.01, 'uncapped, the reduction cancels the added property tax');
  // A modest home: $150,000 + $110,000 = $260,000, reduction $52,000. From 2028 the first $250,000 is exempt from
  // non-school taxes, so only $10,000 of the drop saves non-school tax; all $52,000 saves school tax. About $447.
  const c0 = M.compute({ loc: 'mdc', use: 'par', homeAssessed: 150000, assessedAdd: 110000 });
  near(c0.granny.reduced, 52000);
  near(c0.granny.save, (16.8983 - 6.623) * 10 + 6.623 * 52, 0.01);
  assert.equal(Math.round(c0.granny.save), 447);
  // and the unit itself adds little tax to that home: $10,000 over the exemption, plus school tax on $110,000
  near(c0.ptaxYear, (16.8983 - 6.623) * 10 + 6.623 * 110, 0.01);
  // A rented unit gets no exemption: the full rate on the whole added value.
  near(M.compute({ loc: 'mdc', use: 'rent', homeAssessed: 150000, assessedAdd: 110000 }).ptaxYear, 16.8983 * 110, 0.01);
  // Switched off, it is listed but not counted.
  const c = M.compute({ loc: 'mdc', use: 'par', on: { granny: false } });
  assert.equal(c.savings.find(v => v.id === 'granny').counted, false);
  assert.equal(c.year1.moneyIn.length, 0);
});

test('parents: dependent credit and head of household only when their conditions hold', () => {
  const two = M.compute({ loc: 'bro', use: 'par', parents: 2, on: { dep: true } });
  assert.equal(two.savings.find(v => v.id === 'dep').amount, 1000);
  const one = M.compute({ loc: 'bro', use: 'par', parents: 1, on: { dep: true } });
  assert.equal(one.savings.find(v => v.id === 'dep').amount, 500);
  // head of household needs the dependent and an unmarried filer
  const married = M.compute({ loc: 'bro', use: 'par', filing: 'married', on: { dep: true, hoh: true } });
  assert.equal(married.savings.find(v => v.id === 'hoh').counted, false);
  const noDep = M.compute({ loc: 'bro', use: 'par', filing: 'single', on: { dep: false, hoh: true } });
  assert.equal(noDep.savings.find(v => v.id === 'hoh').counted, false);
  const single = M.compute({ loc: 'bro', use: 'par', filing: 'single', income: 90000, on: { dep: true, hoh: true } });
  const hoh = single.savings.find(v => v.id === 'hoh');
  assert.equal(hoh.counted, true);
  near(hoh.amount, M.taxOn(90000 - 16600, 'single') - M.taxOn(90000 - 24925, 'hoh'), 0.01);
  assert.ok(hoh.amount > 1000 && hoh.amount < 4000);
});

test('a guest house costs money every year, and the model says so', () => {
  const m = M.compute({ loc: 'mdc', use: 'fam' });
  assert.ok(m.year1.net < 0);
  assert.equal(m.payback, null);
  assert.equal(m.year1.moneyIn.length, 0);
  assert.equal(m.savings.length, 0);
});

test('a home office: the building over 39 years, its running costs and interest, at income and self-employment tax rates', () => {
  const m = M.compute({ loc: 'mdc', use: 'off' }), o = m.office;
  near(o.dep, 149999 / 39, 0.01);
  near(o.interest, m.loan.rows[0].interest, 0.01);
  near(o.running, (100 + 200) * 12 + m.ptaxYear, 0.01);
  near(o.deductions, o.dep + o.interest + o.running, 0.01);
  // $90,000 married is in the 12% bracket: 80 cents of each dollar counts for income tax (the 20% business income
  // deduction), less the half of the self-employment tax saved that was itself deductible, plus 15.3% on 92.35%
  const se = 0.153 * 0.9235;
  near(o.rate, 0.12 * 0.8 * (1 - se / 2) + se, 1e-9);
  assert.ok(o.rate > 0.22 && o.rate < 0.24, `rate ${o.rate}`);
  // above the Social Security wage base ($192,300 for 2027) only Medicare's 2.9% is left: a dollar deducted saves less
  const top = M.compute({ use: 'off', income: 200000 }).office, med = 0.029 * 0.9235;
  near(top.rate, 0.22 * 0.8 * (1 - med / 2) + med, 1e-9);
  assert.ok(top.value < M.compute({ use: 'off', income: 190000 }).office.value);
  near(M.officeRate(0.22, 192300, 2027), 0.22 * 0.8 * (1 - se / 2) + se, 1e-9);
  near(M.officeRate(0.22, 192301, 2027), top.rate, 1e-9);
  near(M.officeRate(0.22, 190000, 2026), top.rate, 1e-9);        // the 2026 base was $184,500
  near(o.value, o.deductions * o.rate, 0.01);
  near(o.costAfterYear1, 149999 - o.value, 0.01);
  assert.ok(o.value > 3500 && o.value < 6000, `first-year value ${o.value}`);
  near(m.year1.moneyIn[0].amount, o.value, 0.01);
  near(o.simple, 1500 * o.rate, 0.01);
  const s = m.savings.find(v => v.id === 'office');
  assert.ok(s.counted && s.status === 'call' && s.card === 'office');
  // a higher bracket is worth more; paying cash leaves no interest to deduct; switched off, nothing comes back
  assert.ok(M.compute({ use: 'off', income: 160000 }).office.value > o.value);
  assert.equal(M.compute({ use: 'off', pay: 'cash' }).office.interest, 0);
  const no = M.compute({ use: 'off', on: { office: false } });
  assert.equal(no.year1.moneyIn.length, 0); near(no.office.costAfterYear1, 149999, 0.01);
  // the yearly figure falls as the loan interest falls
  assert.ok(m.years[9].moneyIn < m.years[0].moneyIn);
});

test('property value: three views, none of them in any total', () => {
  const m = M.compute({ loc: 'mdc', use: 'rent', rent: 1700 });
  assert.equal(m.value.income, 204000);                           // $1,700 x 12 x 10
  assert.equal(m.value.multiple, 10);
  assert.equal(m.value.cost, 149999);
  assert.equal(m.value.survey, Math.round(149999 * 0.35 / 1000) * 1000);
  assert.equal(M.compute({ use: 'rent', rent: 1700, valueMultiple: 12 }).value.income, 245000);   // 244,800 rounded to $1,000
  assert.equal(M.compute({ valueMultiple: 99 }).value.multiple, 16);
  assert.equal(M.compute({ valueMultiple: 1 }).value.multiple, 6);
  // rented as affordable housing above the ceiling, the income view uses the rent the math used
  const b = M.compute({ loc: 'bro', use: 'rent', rent: 2400, on: { waiver: true } });
  assert.equal(b.value.rent, 1901);
  // a home that is not rented: what it could rent for here
  assert.equal(M.compute({ loc: 'bro', use: 'par' }).value.rent, 1650);
  // counting an exemption lowers the price, not the cost view; changing the multiple changes nothing else
  assert.equal(M.compute({ use: 'rent', on: { waiver: true } }).value.cost, 149999);
  const hi = M.compute({ loc: 'mdc', use: 'rent', rent: 1700, valueMultiple: 14 });
  near(hi.year1.net, m.year1.net, 0.01); near(hi.ten.net, m.ten.net, 0.01);
});

test('bad input falls back to the defaults instead of breaking', () => {
  const m = M.compute({ loc: 'zzz', use: 'yacht', filing: 'alien' });
  assert.equal(m.input.loc, 'mdc'); assert.equal(m.input.use, 'rent'); assert.equal(m.input.filing, 'married');
  assert.ok(Number.isFinite(M.compute().year1.net));
  assert.ok(Number.isFinite(M.compute({ down: 1e9 }).year1.net));
  assert.equal(M.compute({ down: 1e9 }).loan.amount, 0);
});

test('what the fee schedules print is shown in words, and the words carry the numbers', () => {
  const usd = n => '$' + n.toLocaleString('en-US');
  for (const loc of ['mdc', 'mia', 'mdo', 'bro']) {
    const p = M.compute({ loc }).place.published, [lo, hi] = p.exemptible;
    assert.ok(lo > 0 && hi >= lo, `${loc} range`);
    for (const k of ['fees', 'rent', 'par']) {
      assert.ok(typeof p[k] === 'string' && p[k].length > 40 && /\.$/.test(p[k]), `${loc} published.${k} is a sentence`);
      assert.ok(!/may not|utility lines|waived automatically/i.test(p[k]), `${loc} published.${k} wording`);
    }
    // the sentence about an affordable rental names the same range the model holds
    assert.ok(p.rent.includes(usd(lo)) && p.rent.includes(usd(hi)), `${loc} published.rent names ${usd(lo)} and ${usd(hi)}`);
    // the estimate never sits below what the schedules print as exemptible
    assert.ok(M.DATA.EXEMPT.rent >= hi, `${loc}: the estimate covers the published range`);
  }
});

test('two homes: the one-bedroom at $99,999 and the Efficiency at $89,999, each place starting on the one that fits', () => {
  const P = M.DATA.PLANS;
  assert.deepEqual([P.one.price, P.one.sqft, P.eff.price, P.eff.sqft], [99999, 401, 89999, 352]);
  // unincorporated Miami-Dade asks for 400 sq ft or more; the City of Miami for 450 sq ft in a one-bedroom
  const start = { mdc: 'one', mia: 'eff', mdo: 'one', bro: 'one' };
  for (const loc of Object.keys(start)) {
    const m = M.compute({ loc });
    assert.equal(m.plan.id, start[loc], `${loc} starts on ${start[loc]}`);
    assert.equal(m.place.plan, start[loc]);
    assert.equal(m.plan.isDefault, true);
    assert.equal(m.cost.home, P[start[loc]].price);
    assert.notEqual(m.plan.fits, false, `${loc}: the starting home is never one the rules exclude`);
    // the other home can still be priced, and says so when the rules exclude it
    const other = start[loc] === 'one' ? 'eff' : 'one', o = M.compute({ loc, plan: other });
    assert.equal(o.plan.id, other); assert.equal(o.plan.isDefault, false);
    assert.equal(o.cost.home, P[other].price);
    if (o.plan.fits !== true) assert.ok(typeof o.plan.why === 'string' && /\.$/.test(o.plan.why), `${loc} ${other}: says why`);
    if (m.plan.fits === true) assert.equal(m.plan.why, null);
  }
  assert.equal(M.compute({ loc: 'mdc', plan: 'eff' }).plan.fits, false);
  assert.equal(M.compute({ loc: 'mia', plan: 'one' }).plan.fits, false);
  assert.equal(M.compute({ loc: 'bro', plan: 'eff' }).plan.fits, null);
  // a home the page does not know falls back to the place's own
  assert.equal(M.compute({ loc: 'mia', plan: 'castle' }).plan.id, 'eff');
});

test('the Efficiency: a lower price, a lower starting rent, the efficiency rent ceiling, a smaller assessment', () => {
  const one = M.compute({ loc: 'mdc', plan: 'one' }), eff = M.compute({ loc: 'mdc', plan: 'eff' });
  assert.equal(one.cost.total - eff.cost.total, 10000);
  assert.deepEqual([one.rent.asked, eff.rent.asked], [1800, 1650]);
  assert.deepEqual([one.rent.cap, eff.rent.cap], [3066, 2862]);           // Miami-Dade, 120% of median income
  assert.deepEqual([one.rent.unit, eff.rent.unit], [1, 0]);
  const b1 = M.compute({ loc: 'bro', plan: 'one' }), b0 = M.compute({ loc: 'bro', plan: 'eff' });
  assert.deepEqual([b1.rent.asked, b0.rent.asked], [1650, 1500]);
  assert.deepEqual([b1.rent.cap, b0.rent.cap], [1901, 1774]);             // Broward, 80%
  assert.equal(one.assessedAdd, 104000); assert.equal(eff.assessedAdd, 96000);   // 80% of the home plus installation
  assert.ok(eff.loan.amount === one.loan.amount - 10000 && eff.loan.pmt < one.loan.pmt);
  // the value views follow the home: its rent and its cost
  assert.equal(eff.value.cost, 139999); assert.equal(eff.value.income, 1650 * 12 * 10);
  // a rent the visitor typed is kept when the home changes
  assert.equal(M.compute({ loc: 'mdc', plan: 'eff', rent: 1900 }).rent.asked, 1900);
  // the City of Miami starts on the Efficiency, so its starting estimates are $10,000 lower
  assert.equal(M.compute({ loc: 'mia', use: 'fam' }).cost.total, 139999);
  assert.equal(M.compute({ loc: 'mia', use: 'par' }).cost.total, 129999);
  assert.equal(M.compute({ loc: 'mia', use: 'rent', on: { waiver: true } }).cost.total, 119999);
});
