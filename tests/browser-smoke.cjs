/* 可选 Chrome 回归测试；应用运行不需要 Node 或 npm。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = path.resolve(__dirname, '..');
const shots = process.env.SCREENSHOT_DIR;
const checks = [];
const errors = [];
const ok = (name) => { checks.push(name); console.log('PASS', name); };

const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(base, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
  fs.readFile(file, (err, data) => {
    res.writeHead(err ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(err ? '' : data);
  });
});

async function route(page, id, selector) {
  await page.evaluate((id) => { location.hash = '/' + id; }, id);
  await page.waitForSelector(selector);
}
async function capture(page, name, selector) {
  if (!shots) return;
  fs.mkdirSync(shots, { recursive: true });
  await page.evaluate(() => document.activeElement.blur());
  if (selector) await page.locator(selector).screenshot({ path: path.join(shots, name + '.png'), style: '.app-header, .skip-link { visibility: hidden !important; }' });
  else {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(shots, name + '.png'), fullPage: true });
  }
}
async function noOverflow(page, name) {
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
  assert.ok(dimensions.width <= dimensions.viewport + 1, name + ': ' + JSON.stringify(dimensions));
  ok(name);
}

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.clock.install();
    await page.goto(url);
    await page.waitForSelector('.home-pager');
    assert.equal(await page.evaluate(() => NEG.tasks.ids().length), 7);
    await page.evaluate(() => {
      const create = NEG.ReactorModel.create;
      NEG.ReactorModel.create = (...args) => {
        const model = create(...args);
        window.testReactor = model;
        const step = model.step;
        model.step = (dt) => {
          if (window.testAuto && !['scram', 'complete', 'failed'].includes(model.state.status)) {
            const s = model.state, k = model.config;
            const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
            const feedback = k.fuelCoeff * clamp(s.fuelTemp - 600, -280, 500) + k.modCoeff * clamp(s.coolantTemp - 326, -45, 80) + k.xeCoeff * (s.xenon - 1);
            model.setControl('rod', 50 - ((95 - s.power) * 15 - feedback) / 80);
            model.setControl('load', 100);
          }
          step(dt);
        };
        return model;
      };
    });
    await route(page, 'console', '#consoleTrend');
    await page.evaluate(() => { window.testAuto = true; });
    await page.clock.runFor(16000);
    await page.locator('[data-speed="4"]').evaluate((b) => b.click());
    await page.clock.runFor(12000);
    assert.ok(await page.evaluate(() => testReactor.state.power > 80));
    assert.ok((await page.locator('.trend-line').getAttribute('d')).length > 200);
    for (const key of ['power', 'fuelTemp', 'xenon', 'electricalMW']) {
      await page.locator('[data-trend="' + key + '"]').evaluate((b) => b.click());
      assert.equal(await page.locator('[data-trend="' + key + '"]').getAttribute('aria-pressed'), 'true');
      assert.ok(!(await page.locator('.trend-line').getAttribute('d')).includes('NaN'));
    }
    await page.selectOption('#trendScope', 'shift');
    assert.match(await page.locator('#consoleTrend').textContent(), /12 h/);
    await page.locator('[data-trend="power"]').evaluate((b) => b.click());
    await page.locator('#consoleTrend').focus();
    await page.keyboard.press('Home');
    assert.match(await page.locator('#trendReading').textContent(), /回看 0.00 h/);
    await page.keyboard.press('End');
    assert.match(await page.locator('#trendReading').textContent(), /最新/);
    await page.evaluate(() => {
      for (const [key, id] of [['rod', 'rodRange'], ['load', 'loadRange']]) {
        const input = document.getElementById(id);
        input.value = testReactor.state[key];
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await capture(page, 'console-desktop');
    await capture(page, 'console-trends', '#consoleTrends');
    ok('live trends, all four metrics, time scope and keyboard history');

    await page.evaluate(() => { window.testAuto = false; });
    await page.locator('#scramBtn').evaluate((b) => b.click());
    await page.clock.runFor(3000);
    assert.equal(await page.evaluate(() => testReactor.state.status), 'scram');
    assert.ok(await page.locator('.trend-event').count() > 0);
    await page.locator('#resetScramBtn').evaluate((b) => b.click());
    await page.evaluate(() => { window.testAuto = true; });
    await page.clock.runFor(25000);
    assert.equal(await page.evaluate(() => testReactor.state.status), 'complete');
    assert.equal(await page.evaluate(() => testReactor.state.t), 12);
    await page.locator('.modal-close').evaluate((b) => b.click());
    await page.locator('.trend-data summary').evaluate((b) => b.click());
    assert.ok(await page.locator('.trend-data tbody tr').count() > 0);
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#trendExport').evaluate((b) => b.click());
    const download = await downloadEvent;
    const csv = fs.readFileSync(await download.path(), 'utf8');
    assert.ok(csv.split('\n').length > 300);
    assert.match(csv, /12.00000,.*complete/);
    assert.match(csv, /scram/);
    ok('SCRAM marker, reset, completed 12-hour shift and complete CSV');

    await route(page, 'home', '.home-pager');
    await route(page, 'console', '#consoleTrend');
    await page.clock.runFor(300);
    const prior = await page.evaluate(() => { window.priorReactor = testReactor; return testReactor.state.t; });
    await route(page, 'dose', '#annualDoseForm');
    await page.clock.runFor(1200);
    assert.equal(await page.evaluate(() => priorReactor.state.t), prior);
    ok('console route cleanup cancels simulation updates');

    assert.equal(await page.locator('.dose-row').count(), 25);
    assert.equal(await page.locator('.conv-out b').nth(2).textContent(), '0.0001');
    assert.match(await page.locator('#annualDoseTotal').textContent(), /^0 /);
    const ids = ['flight-long', 'chest-xray', 'head-ct', 'chest-ct', 'dental-xray'];
    for (let i = 0; i < ids.length; i++) await page.fill('#annual-' + ids[i], String([2, 3, 1, 1, 1][i]));
    assert.match(await page.locator('#annualDoseTotal').textContent(), /9.425/);
    await page.check('#annualIncludeBackground');
    assert.match(await page.locator('#annualDoseTotal').textContent(), /11.825/);
    assert.match(await page.locator('#annualMedicalTotal').textContent(), /9.305/);
    assert.match(await page.locator('#annualTravelTotal').textContent(), /0.12/);
    for (const value of ['-1', 'abc', '1.5', '1e3', '', '1001', 'Infinity']) {
      await page.fill('#annual-flight-long', value);
      assert.equal(await page.locator('#annual-flight-long').getAttribute('aria-invalid'), 'true');
      assert.equal(await page.locator('#annualDoseTotal').count(), 0);
    }
    await page.fill('#annual-flight-long', '2');
    assert.equal(await page.locator('#annual-flight-long').getAttribute('aria-invalid'), null);
    await page.uncheck('[data-dose-reference="public"]');
    assert.equal(await page.locator('[data-reference-line="public"]').isVisible(), false);
    await page.check('[data-dose-reference="public"]');
    assert.equal(await page.locator('[data-reference-line="public"]').isVisible(), true);
    await page.locator('[data-group="medical"]').evaluate((b) => b.click());
    assert.equal(await page.locator('.dose-row').count(), 10);
    await page.locator('[data-group="all"]').evaluate((b) => b.click());
    await page.locator('#doseTherapy summary').evaluate((b) => b.click());
    assert.equal(await page.locator('#doseTherapy').getAttribute('open'), '');
    await page.clock.runFor(1000);
    await capture(page, 'dose-desktop');
    await capture(page, 'annual-dose', '.dose-annual');
    await page.locator('#annualDoseReset').evaluate((b) => b.click());
    assert.match(await page.locator('#annualDoseTotal').textContent(), /^0 /);
    assert.equal(await page.locator('#annualIncludeBackground').isChecked(), false);
    ok('25 doses, annual subtotals, invalid inputs, reset, references and Gy/Sv disclosure');

    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await noOverflow(page, 'dose no horizontal overflow at ' + width);
      if (width === 390) await capture(page, 'annual-dose-mobile', '.dose-annual');
      await route(page, 'console', '#consoleTrend');
      await page.clock.runFor(1000);
      await noOverflow(page, 'console no horizontal overflow at ' + width);
      if (width === 390) await capture(page, 'console-trends-mobile', '#consoleTrends');
      await route(page, 'device', '#deviceStage');
      await page.clock.runFor(300);
      await noOverflow(page, 'device no horizontal overflow at ' + width);
      if (width === 390) await capture(page, 'device-mobile', '#deviceStage');
      await route(page, 'dose', '#annualDoseForm');
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await route(page, 'device', '#deviceStage');
    assert.equal(await page.locator('.di-item').count(), 7);
    assert.equal(await page.locator('.device-label').count(), 7);
    await page.locator('[data-part="core"]').click();
    assert.equal(await page.locator('#detailName').textContent(), '钚核心');
    await page.locator('#deviceExplodeBtn').click();
    await page.clock.runFor(2400);
    assert.equal(await page.locator('#explodeValue').textContent(), '100%');
    assert.match(await page.locator('#deviceExplodeBtn').textContent(), /一键组装/);
    assert.ok(await page.evaluate(() => (NEG.store.get().modes.device.exploded || 0) >= 1));
    await page.keyboard.press('d');
    await page.clock.runFor(2400);
    assert.equal(await page.locator('#explodeValue').textContent(), '0%');
    await page.keyboard.press('l');
    assert.ok(await page.locator('#deviceLabels').evaluate((el) => el.classList.contains('is-hidden')));
    await page.keyboard.press('l');
    assert.ok(!(await page.locator('#deviceLabels').evaluate((el) => el.classList.contains('is-hidden'))));
    await page.locator('#deviceExplodeRange').evaluate((el) => {
      el.value = '50';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.clock.runFor(400);
    assert.equal(await page.locator('#explodeValue').textContent(), '50%');
    await page.locator('[data-action="sources"]').click();
    await page.waitForSelector('.overlay .modal');
    assert.match(await page.locator('.overlay .modal-title').textContent(), /关于这枚核装置/);
    await page.locator('.overlay .modal-close').click();
    await capture(page, 'device-desktop', '#deviceStage');
    ok('3D device: seven layers, pick, explode / assemble, slider, sources and keyboard');
    for (const [id, selector] of [['home', '.home-pager'], ['rumor', '.answer-card'], ['city', '.plant-svg'], ['china', '.china-viewport'], ['dose', '#doseRows'], ['console', '#consoleTrend'], ['device', '#deviceStage']]) {
      await route(page, id, selector);
      if (['dose', 'console'].includes(id)) assert.ok(!(await page.locator('body').getAttribute('class') || '').includes('mode-full-'));
      if (id === 'device') assert.ok((await page.locator('body').getAttribute('class') || '').includes('mode-full-device'));
    }
    ok('all seven routes work with latest upstream full-page shell');
    await page.goto('file://' + path.join(base, 'index.html') + '#/dose');
    await page.waitForSelector('#annualDoseForm');
    await page.fill('#annual-head-ct', '1');
    assert.match(await page.locator('#annualDoseTotal').textContent(), /2 /);
    await route(page, 'console', '#consoleTrend');
    await route(page, 'device', '#deviceStage');
    assert.equal(await page.locator('#deviceCanvas').count(), 1);
    ok('file:// standalone launch supports new modules and local 3D');

    const retryPage = await browser.newPage();
    let block = true;
    retryPage.on('pageerror', (e) => errors.push(e.message));
    await retryPage.route('**/console-trends.js*', (r) => block ? r.abort() : r.continue());
    await retryPage.goto(url + '/#/console');
    await retryPage.waitForSelector('#bootGuard:not([hidden])');
    assert.match(await retryPage.locator('#bootGuard').textContent(), /运行趋势/);
    block = false;
    await retryPage.locator('[data-bg-retry]').click();
    await retryPage.waitForSelector('#consoleTrend');
    ok('failed trend resource is detected and restored by retry');
    assert.deepEqual(errors, []);
    ok('zero uncaught browser errors');
    if (shots) fs.writeFileSync(path.join(shots, 'results.json'), JSON.stringify({ checks, errors }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
