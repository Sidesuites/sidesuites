/* The math from the owner's first draft calculator ("What can a Sidesuite earn you?", November 2026), kept word for word as a
   test oracle: configured the same way, js/money-model.js must return the same numbers. Not used by the site. */
'use strict';
var PRICE = 150000;      // all-in Miami price, impact fees included
var LIFE = 27.5;         // years the IRS spreads a rental home's cost over
var BOOST_SHARE = 0.25;  // share of cost a cost segregation study moves into year one
var TAX = {              // 2026 federal brackets and standard deduction
  single:  { std: 16100, steps: [[12400,0.10],[50400,0.12],[105700,0.22],[201775,0.24],[256225,0.32],[640600,0.35],[Infinity,0.37]] },
  married: { std: 32200, steps: [[24800,0.10],[100800,0.12],[211400,0.22],[403550,0.24],[512450,0.32],[768700,0.35],[Infinity,0.37]] }
};

function taxOn(taxable, filing){
  if (taxable <= 0) return 0;
  var t = 0, prev = 0, steps = TAX[filing].steps;
  for (var i = 0; i < steps.length; i++){
    if (taxable <= prev) break;
    t += (Math.min(taxable, steps[i][0]) - prev) * steps[i][1];
    prev = steps[i][0];
  }
  return t;
}

function marginal(taxable, filing){
  var steps = TAX[filing].steps;
  for (var i = 0; i < steps.length; i++){ if (taxable < steps[i][0]) return steps[i][1]; }
  return 0.37;
}

function loanYearOne(principal, aprPct, years){
  var r = aprPct / 100 / 12, n = years * 12;
  var pmt = r === 0 ? principal / n : principal * r / (1 - Math.pow(1 + r, -n));
  var bal = principal, interest = 0, paid = 0;
  for (var m = 0; m < 12; m++){
    var i = bal * r;
    interest += i; paid += pmt - i; bal -= pmt - i;
  }
  return { pmt: pmt, interest: interest, principal: paid };
}

function scenario(s, waived){
  var fee = waived ? s.fee : 0;
  var cost = PRICE - fee;
  var loanAmt = s.pay === 'loan' ? Math.max(0, cost - s.down) : 0;
  var L = loanAmt > 0 ? loanYearOne(loanAmt, s.rate, s.years) : { pmt: 0, interest: 0, principal: 0 };

  var rentYear = s.rent * 12;
  var empty = rentYear * s.emptyWeeks / 52;
  var collected = rentYear - empty;
  var running = (s.ins + s.ptax + s.upkeep) * 12;
  var loanPay = L.pmt * 12;
  var beforeTax = collected - running - loanPay;

  var dep = cost / LIFE;
  var base = Math.max(0, s.income - TAX[s.filing].std);
  // Rental losses offset other income up to $25,000, phased out between $100,000 and $150,000 of income.
  var allowance = Math.max(0, Math.min(25000, 25000 - 0.5 * (s.income - 100000)));

  function taxEffect(depAmt, interest){
    var taxable = collected - running - interest - depAmt;
    if (taxable >= 0){
      return { taxable: taxable, tax: taxOn(base + taxable, s.filing) - taxOn(base, s.filing), usable: 0, unused: 0 };
    }
    var loss = -taxable;
    var usable = Math.min(loss, allowance, base);
    return { taxable: taxable, tax: taxOn(base - usable, s.filing) - taxOn(base, s.filing), usable: usable, unused: loss - usable };
  }

  var t = taxEffect(dep, L.interest);
  var noWriteoffTax = taxOn(base + collected, s.filing) - taxOn(base, s.filing);

  var after = null;
  if (loanAmt > 0){
    var ta = taxEffect(s.years < LIFE ? dep : 0, 0);
    after = { keep: collected - running - ta.tax };
  }

  var tb = taxEffect(BOOST_SHARE * cost + (1 - BOOST_SHARE) * cost / LIFE, L.interest);

  return {
    fee: fee, cost: cost, loanAmt: loanAmt, cashIn: cost - loanAmt,
    pmt: L.pmt, interest: L.interest, principal: L.principal,
    rentYear: rentYear, empty: empty, collected: collected, running: running, loanPay: loanPay,
    beforeTax: beforeTax, dep: dep, allowance: allowance,
    taxable: t.taxable, tax: t.tax, usable: t.usable, unused: t.unused,
    keep: beforeTax - t.tax,
    writeoffValue: noWriteoffTax - t.tax,
    after: after,
    boost: { savings: t.tax - tb.tax, unused: tb.unused }
  };
}

function model(s){
  var cur = scenario(s, s.waived);
  var withW = s.waived ? cur : scenario(s, true);
  var withoutW = s.waived ? scenario(s, false) : cur;
  return {
    cur: cur, withW: withW, withoutW: withoutW,
    waiverGain: withW.keep - withoutW.keep,
    rate: marginal(Math.max(0, s.income - TAX[s.filing].std), s.filing)
  };
}
module.exports = { model: model, scenario: scenario, taxOn: taxOn, marginal: marginal, loanYearOne: loanYearOne, PRICE: PRICE };
