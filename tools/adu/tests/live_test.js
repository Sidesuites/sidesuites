// Live end-to-end test of the ADU map: real browser, real county GIS servers.
// Usage: node live_test.js <page-url> <addresses.json> [report.md]
// Each case is either { input } (whole address typed into the street box) or
// { street, city (slug), zip } for the structured form. Optional: model ('407' | '352'),
// expectChoice (text that must appear in the "did you mean" list; it is then clicked).
// MODE=customer tests the customer page instead: the best model is rated automatically, the
// result must show a lot picture unless it is Unlikely, and no internal wording may appear.
const { chromium } = require('playwright');
const fs = require('fs');
const [, , URL_, CASES, REPORT] = process.argv;
const LOTIMG_MAX = +(process.env.LOTIMG_MAX || 0); // print this many small lot drawings into the log (base64) for review
const LOTIMG_CASES = String(process.env.LOTIMG_CASES || '').split(',').map(Number).filter(Boolean); // ...or these case numbers
const CUSTOMER = process.env.MODE === 'customer';
const PRIVATE = /TOO TOUGH|CONDITIONAL|code review|scoring|verified|Sec\.\s*\d|ordinance|servant|staff quarters|folio|spreadsheet|mirror text|confirm with RER/i, VERDICT_WORD = /\bGO\b/;
(async () => {
  // ONLY="addr 1|addr 2" checks just those addresses (report only), e.g. to look into one result.
  const cases = process.env.ONLY ? process.env.ONLY.split('|').map(s => s.trim()).filter(Boolean).map(input => ({ input, model: '407', expect: '' })) : JSON.parse(fs.readFileSync(CASES, 'utf8'));
  fs.mkdirSync('shots', { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
  const consoleErrors = [], failedRequests = [], timings = [];
  page.on('pageerror', e => consoleErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('requestfailed', r => failedRequests.push(`${r.failure() && r.failure().errorText} ${r.url().slice(0, 160)}`));
  await page.goto(URL_, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => typeof window.L !== 'undefined' && document.querySelectorAll('#fCity option').length > 60, null, { timeout: 30000 });
  const read = (model) => page.evaluate((model) => {
    const kv = k => [...document.querySelectorAll('#result dl.kv dt')].filter(d => d.textContent === k).map(d => d.nextElementSibling.textContent)[0] || '';
    const r = typeof lastResult !== 'undefined' ? lastResult : null, L = r && r.lot, f = r && r.fit;
    return {
      // staff: the rating of the model under test; customer: the best rating shown
      rating: ((document.querySelector('#result .card[data-best]') || { dataset: {} }).dataset.best && model ? (document.querySelector(`#result .mbox[data-model="${model}"]`) || { dataset: {} }).dataset.rating : (document.querySelector('#result .card[data-best]') || { dataset: {} }).dataset.best) || (document.querySelector('#result .rating') || {}).textContent || '',
      models: [...document.querySelectorAll('#result .mbox')].map(b => b.dataset.model + ':' + b.dataset.rating).join(' '),
      err: (document.querySelector('#result .err') || {}).textContent || '',
      choices: [...document.querySelectorAll('#result .choices .si b')].map(b => b.textContent),
      title: (document.querySelector('#result h2') || {}).textContent || '',
      juris: (document.querySelector('#result .card > .small') || {}).textContent || '',
      checks: [...document.querySelectorAll('#result ul.checks li')].map(li => li.querySelector('.ic').className.split(' ')[1] + ': ' + li.textContent.slice(1).trim()),
      via: kv('Found by'), zoning: kv('Zoning'), lot: kv('Lot'),
      other: ((document.querySelector('#result .other-models') || {}).textContent || '').replace(/\s+/g, ' '),
      diag: L ? { fit: f && f.status, relax: f && f.relax, prm: f && f.prm && { rear: f.prm.rear, side: f.prm.side, sep: f.prm.sep, behind: f.prm.tMin === null ? 'n/a' : (f.sp.behind ? 'behind' : 'not in front') }, streetOk: L.streetOk, nbOk: L.nbOk, corner: L.cornerLot, openRear: L.openRear,
        fps: L.fps.length, owned: L.fps.filter(x => x.owned).length, houseSf: Math.round(L.houseSf), ownedSf: Math.round(L.ownedSf), pools: L.pools.map(p => Math.round(p.area)), res: L.res, img: !!(r.siteData && r.siteData.img), lotPoly: L.lotSfPoly } : (r ? { siteErr: r.siteErr || null } : null),
      flood: r && r.extras && r.extras.flood ? r.extras.flood.zone : '',
      text: ((document.querySelector('#result .card') || {}).innerText || ''), hasImg: !!document.querySelector('#result img.lotfig'), hasChecks: !!document.querySelector('#result details.more')
    };
  }, model);
  const rows = []; let imgs = 0;
  for (let n = 0; n < cases.length; n++) {
    const c = cases[n];
    await page.evaluate(() => { document.getElementById('result').innerHTML = ''; window.lastResult = undefined; try { lastResult = null; } catch (e) { /* not reachable */ } });
    if ((await page.$('#folioRow:not([hidden])'))) await page.click('#lnkFolio');
    await page.selectOption('#fCity', c.city || '');
    await page.fill('#fZip', c.zip || '');
    await page.fill('#fStreet', c.street || c.input);
    const t0 = Date.now();
    await page.click('#btnCheck');
    let r = null, err = '';
    try {
      await page.waitForFunction(() => document.querySelector('#result .rating, #result .err, #result .choices'), null, { timeout: 60000 });
      r = await read(CUSTOMER ? null : (c.model || '407'));
      if (r.choices.length && c.expectChoice) {
        const i = r.choices.findIndex(t => t.toLowerCase() === c.expectChoice.toLowerCase());
        if (i < 0) err = `expected "${c.expectChoice}" among choices: ${r.choices.join(' | ')}`;
        else {
          await page.click(`#result .choices .si:nth-child(${i + 1})`);
          await page.waitForFunction(() => document.querySelector('#result .rating, #result .err'), null, { timeout: 60000 });
          r = await read(CUSTOMER ? null : (c.model || '407')); r.picked = c.expectChoice;
        }
      } else if (c.expectChoice) err = 'expected a "did you mean" list with ' + c.expectChoice;
    } catch (e) { err = 'timeout: ' + e.message.split('\n')[0]; }
    const secs = ((Date.now() - t0) / 1000).toFixed(1); timings.push(+secs);
    r = r || {}; const got = (r.rating || '').trim(); err = err || r.err || (r.choices && r.choices.length && !got ? 'choices: ' + r.choices.join(' | ') : '');
    if (CUSTOMER && got && !err) {
      const leak = (r.text || '').match(PRIVATE) || (r.text || '').match(VERDICT_WORD);
      if (leak) err = `internal wording on the customer page: "${leak[0]}"`;
      else if (r.hasChecks) err = 'staff details shown on the customer page';
      else if (got !== 'Unlikely' && !r.hasImg) err = 'no lot picture for a ' + got + ' result';
      else if (got === 'Unlikely' && r.hasImg) err = 'lot picture shown for an Unlikely result';
    }
    const ok = !err && (c.expect ? got === c.expect : !!got);
    const card = await page.$('#result .card') || await page.$('#result .loader'); if (card) { try { await card.screenshot({ path: `shots/${String(n + 1).padStart(2, '0')}.png` }); } catch (e) { /* ignore */ } }
    if ((LOTIMG_CASES.length ? LOTIMG_CASES.includes(n + 1) : imgs < LOTIMG_MAX) && (await page.$('#result img.lotfig'))) {
      const b64 = await page.evaluate(() => { const im = document.querySelector('#result img.lotfig'); const cv = document.createElement('canvas'); const w = 300, h = Math.round(w * im.naturalHeight / im.naturalWidth); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(im, 0, 0, w, h); return cv.toDataURL('image/jpeg', 0.55).split(',')[1]; });
      console.log(`LOTIMG ${n + 1} ${b64}`); imgs++;
    }
    const label = c.input || [c.street, c.city, c.zip].filter(Boolean).join(', ');
    rows.push({ ...c, ...r, label, got, err, secs, ok });
    console.log(`${ok ? (c.expect ? 'PASS' : 'INFO') : 'FAIL'}  ${label}  [${c.model || '407'}]  expected=${c.expect || '(report only)'} got=${got || err}  (${secs}s)  ${r.title || ''} | ${r.zoning || ''} | ${r.via || ''}`);
    console.log('        models ' + (r.models || '') + ' | diag ' + JSON.stringify(r.diag || null) + (r.flood ? ' flood=' + r.flood : ''));
    (r.checks || []).forEach(x => console.log('        ' + x.slice(0, 260)));
    if (CUSTOMER) console.log('        text: ' + (r.text || '').replace(/\s+/g, ' ').slice(0, 600));
  }
  await browser.close();
  const pass = rows.filter(r => r.ok).length;
  const md = [`## ADU map live test — ${pass}/${rows.length} passed`, '', `Page: ${URL_}`, `Median lookup time: ${timings.sort((a, b) => a - b)[Math.floor(timings.length / 2)]}s`, '',
    '| | Address | Unit | Expected | Got | Matched parcel | Zoning | Fit | Time |', '|---|---|---|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.ok ? '✅' : '❌'} | ${r.label} | ${r.model || '407'} | ${r.expect || 'report'} | ${r.got || r.err} | ${r.title || ''} | ${r.zoning || ''} | ${(r.diag && r.diag.fit) || ''} | ${r.secs}s |`), '',
    ...rows.filter(r => !r.ok).flatMap(r => [`### ❌ ${r.label}`, `Expected ${r.expect} (${r.why}), got ${r.got || r.err}`, ...(r.checks || []).map(x => `- ${x}`), '']),
    consoleErrors.length ? '### Console errors\n' + [...new Set(consoleErrors)].slice(0, 20).map(e => '- ' + e).join('\n') : '',
    failedRequests.length ? '### Failed requests\n' + [...new Set(failedRequests)].slice(0, 20).map(e => '- ' + e).join('\n') : ''].join('\n');
  if (REPORT) fs.writeFileSync(REPORT, md);
  fs.writeFileSync('live-test-results.json', JSON.stringify(rows, null, 1));
  console.log(`\n${pass}/${rows.length} passed`);
  if (consoleErrors.length) console.log('console errors:\n' + [...new Set(consoleErrors)].slice(0, 20).join('\n'));
  process.exit(pass === rows.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
