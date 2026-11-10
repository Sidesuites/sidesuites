/* Tests for js/money-data.js (the directory of fee waivers, tax breaks and programs).
   Run from the repo root:  node --test tools/pages/tests/*.test.js
   These check the shape of the data, not the law: every card can be shown in every place it claims to cover,
   every link is a real https address, and every card the calculator points to exists where it points. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../../../js/money-data.js');
const M = require('../../../js/money-model.js');

const PLACES = ['mia', 'mdc', 'mdo', 'bro'], USES = ['rent', 'par', 'fam'];
const CATS = D.CATS.map(c => c[0]);
// The page's own lookup: a place's wording, else the Miami-Dade wording, else the general one.
const pick = (v, loc) => v == null ? '' : typeof v === 'string' ? v : v[loc] != null ? v[loc] : loc !== 'bro' && v.md != null ? v.md : v.all || '';
const inLoc = (x, loc) => !x || [].concat(x).includes(loc) || (loc !== 'bro' && [].concat(x).includes('md'));

test('every card has an id of its own, a known category, status, places and purposes', () => {
  const seen = new Set();
  for (const it of D.ITEMS) {
    assert.match(it.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `id ${it.id}`);
    assert.ok(!seen.has(it.id), `duplicate id ${it.id}`); seen.add(it.id);
    assert.ok(CATS.includes(it.c), `${it.id}: category ${it.c}`);
    assert.ok(D.STATUS[it.s], `${it.id}: status ${it.s}`);
    assert.ok(Array.isArray(it.w) && it.w.length && it.w.every(w => PLACES.includes(w)), `${it.id}: places ${it.w}`);
    assert.ok(Array.isArray(it.u) && it.u.length && it.u.every(u => USES.includes(u)), `${it.id}: purposes ${it.u}`);
    assert.ok(it.t && it.t.length <= 90, `${it.id}: title`);
  }
});

test('every card reads complete in every place it covers', () => {
  for (const it of D.ITEMS) for (const loc of it.w) {
    assert.ok(pick(it.worth, loc).length > 10, `${it.id} in ${loc}: what it is worth`);
    for (const k of ['who', 'catch', 'when']) {
      const v = it[k];
      if (v && typeof v === 'object') for (const key of Object.keys(v)) assert.ok(PLACES.concat(['md', 'all']).includes(key), `${it.id}.${k}: unknown place key ${key}`);
    }
    assert.ok(pick(it.who, loc) || pick(it.worth, loc), `${it.id} in ${loc}`);
    for (const k of ['worth', 'who', 'catch', 'when']) assert.doesNotMatch(pick(it[k], loc), /\bSidesuite\b(?!s)/, `${it.id}: the name is Sidesuites`);
  }
});

test('links are https, labelled, and shown somewhere; phone lines are labelled', () => {
  const urls = new Set(Object.values(D.U));
  for (const it of D.ITEMS) {
    for (const a of it.apply || []) {
      assert.ok(a.l && a.l.length <= 60, `${it.id}: link label`);
      assert.match(a.h || '', /^https:\/\/[^\s"]+$/, `${it.id}: link ${a.l}`);
      assert.ok(urls.has(a.h), `${it.id}: link ${a.l} is not in U`);
      if (a.loc) assert.ok(it.w.some(loc => inLoc(a.loc, loc)), `${it.id}: link ${a.l} is never shown`);
    }
    for (const t of it.tel || []) {
      assert.ok(t.l && t.n, `${it.id}: phone line`);
      if (t.loc) assert.ok(it.w.some(loc => inLoc(t.loc, loc)), `${it.id}: ${t.l} is never shown`);
    }
  }
  for (const [k, v] of Object.entries(D.U)) assert.match(v, /^https:\/\//, `U.${k}`);
});

test('every card the calculator points to exists, in that place, for that purpose', () => {
  const byId = Object.fromEntries(D.ITEMS.map(i => [i.id, i]));
  for (const loc of PLACES) for (const use of USES) {
    const m = M.compute({ loc, use });
    for (const s of m.savings) {
      const card = byId[s.card];
      assert.ok(card, `${loc} ${use}: saving ${s.id} points to a missing card ${s.card}`);
      assert.ok(card.w.includes(loc), `${loc} ${use}: card ${s.card} does not cover ${loc}`);
      assert.ok(card.u.includes(use), `${loc} ${use}: card ${s.card} does not cover ${use}`);
      assert.equal(card.s, s.status, `${loc} ${use}: saving ${s.id} says ${s.status}, its card ${s.card} says ${card.s}`);
    }
  }
});

test('the rent ceilings the model uses are the ones in the limit tables', () => {
  for (const county of ['md', 'bro']) {
    const cap = M.DATA.RENT_CAP[county];
    assert.deepEqual(cap.cap, D.LIM[county].rent[cap.tier], `${county} rent cap at ${cap.tier}% AMI`);
  }
});

test('each place and purpose has something to show, and the lists read cleanly', () => {
  for (const loc of PLACES) for (const use of USES) {
    const n = D.ITEMS.filter(i => i.w.includes(loc) && i.u.includes(use)).length;
    assert.ok(n >= 8, `${loc} ${use}: only ${n} cards`);
  }
  for (const m of D.MYTHS) assert.ok(m.t && m.d, 'a myth needs a title and a reason');
  for (const d of D.DATES) assert.ok(d.d && d.t, 'a date needs a day and what happens');
});
