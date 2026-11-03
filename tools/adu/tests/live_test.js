// Live end-to-end test of the deployed ADU map: real browser, real county GIS servers.
// Usage: node live_test.js <page-url> <addresses.json> [report.md]
const { chromium } = require('playwright');
const fs = require('fs');
const [, , URL_, CASES, REPORT] = process.argv;
(async () => {
  const cases = JSON.parse(fs.readFileSync(CASES, 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  const consoleErrors = [], failedRequests = [], timings = [];
  page.on('pageerror', e => consoleErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('requestfailed', r => failedRequests.push(`${r.failure() && r.failure().errorText} ${r.url().slice(0, 160)}`));
  await page.goto(URL_, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => typeof window.L !== 'undefined' && document.querySelectorAll('#list div[data-slug]').length > 0, null, { timeout: 30000 });
  const rows = [];
  for (const c of cases) {
    await page.evaluate(() => { document.getElementById('result').innerHTML = ''; });
    await page.fill('#addr', c.input);
    const t0 = Date.now();
    await page.click('#btnCheck');
    let got = '', err = '', title = '', checks = [];
    try {
      await page.waitForFunction(() => document.querySelector('#result .rating, #result .err'), null, { timeout: 45000 });
      const r = await page.evaluate(() => ({
        rating: (document.querySelector('#result .rating') || {}).textContent || '',
        err: (document.querySelector('#result .err') || {}).textContent || '',
        title: (document.querySelector('#result h2') || {}).textContent || '',
        juris: (document.querySelector('#result .card > .small') || {}).textContent || '',
        checks: [...document.querySelectorAll('#result ul.checks li')].map(li => li.querySelector('.ic').className.split(' ')[1] + ': ' + li.textContent.slice(1).trim()),
        via: [...document.querySelectorAll('#result dl.kv dt')].filter(d => d.textContent === 'Found by').map(d => d.nextElementSibling.textContent)[0] || '',
        zoning: [...document.querySelectorAll('#result dl.kv dt')].filter(d => d.textContent === 'Zoning').map(d => d.nextElementSibling.textContent)[0] || '',
        lot: [...document.querySelectorAll('#result dl.kv dt')].filter(d => d.textContent === 'Lot').map(d => d.nextElementSibling.textContent)[0] || ''
      }));
      got = r.rating.trim(); err = r.err; title = r.title; checks = r.checks; c.juris = r.juris.trim(); c.via = r.via; c.zoning = r.zoning; c.lot = r.lot;
    } catch (e) { err = 'timeout: ' + e.message.split('\n')[0]; }
    const secs = ((Date.now() - t0) / 1000).toFixed(1); timings.push(+secs);
    const ok = got === c.expect;
    rows.push({ ...c, got, err, title, checks, secs, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.input}  expected=${c.expect} got=${got || err}  (${secs}s)  ${title} | ${c.zoning || ''} | ${c.via || ''}`);
    if (!ok) checks.forEach(x => console.log('        ' + x.slice(0, 200)));
  }
  await browser.close();
  const pass = rows.filter(r => r.ok).length;
  const md = [`## ADU map live test — ${pass}/${rows.length} passed`, '', `Page: ${URL_}`, `Median lookup time: ${timings.sort((a, b) => a - b)[Math.floor(timings.length / 2)]}s`, '',
    '| | Address | Expected | Got | Matched parcel | Zoning | Lot | Found by | Time |', '|---|---|---|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.ok ? '✅' : '❌'} | ${r.input} | ${r.expect} | ${r.got || r.err} | ${r.title} | ${r.zoning || ''} | ${r.lot || ''} | ${(r.via || '').slice(0, 60)} | ${r.secs}s |`), '',
    ...rows.filter(r => !r.ok).flatMap(r => [`### ❌ ${r.input}`, `Expected ${r.expect} (${r.why}), got ${r.got || r.err}`, ...r.checks.map(x => `- ${x}`), '']),
    consoleErrors.length ? '### Console errors\n' + [...new Set(consoleErrors)].slice(0, 20).map(e => '- ' + e).join('\n') : '',
    failedRequests.length ? '### Failed requests\n' + [...new Set(failedRequests)].slice(0, 20).map(e => '- ' + e).join('\n') : ''].join('\n');
  if (REPORT) fs.writeFileSync(REPORT, md);
  fs.writeFileSync('live-test-results.json', JSON.stringify(rows, null, 1));
  console.log(`\n${pass}/${rows.length} passed`);
  process.exit(pass === rows.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
