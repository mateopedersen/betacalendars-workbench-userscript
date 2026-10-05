const assert = require('node:assert/strict');
const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const root = path.resolve(__dirname, '..');
  const html = await readFile(path.join(root, 'fixtures/month.html'));
  const userscript = await readFile(path.join(root, 'dist/betacalendars-workbench.user.js'));
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    response.writeHead(200, { 'content-type': request.url === '/fixture' ? 'text/html; charset=utf-8' : 'text/plain' });
    response.end(request.url === '/fixture' ? html : 'ok');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${origin}/fixture`);
    await page.addScriptTag({ content: userscript.toString() });
    const launcher = page.getByRole('button', { name: 'Open Beta Calendars Workbench' });
    await launcher.waitFor();
    await launcher.click();
    await page.getByRole('heading', { name: 'Workbench' }).waitFor();
    await page.getByRole('button', { name: 'Minimize Workbench' }).click();
    assert.equal(await page.locator('.bcw-panel').evaluate(node => node.classList.contains('bcw-minimized')), true);
    await page.getByRole('button', { name: 'Restore Workbench' }).click();
    await page.getByRole('button', { name: 'Close Workbench' }).click();
    await page.getByRole('button', { name: 'Open Beta Calendars Workbench' }).click();

    await page.getByRole('button', { name: 'Month Grid', exact: true }).click();
    await page.getByLabel('Month').selectOption('2');
    await page.getByLabel('Year').fill('2027');
    await page.getByLabel('Year').dispatchEvent('change');
    assert.match(await page.locator('.bcw-grid caption').innerText(), /February 2027/);
    assert.match(await page.locator('.bcw-pass').first().innerText(), /PASS/);
    await page.getByLabel('Week starts').selectOption('sunday');
    assert.match(await page.locator('.bcw-grid caption').innerText(), /5 rows/);

    await page.getByRole('button', { name: 'Resources', exact: true }).click();
    assert.equal(await page.locator('a[href="https://www.betacalendars.com/august-calendar.html"]').count(), 1);
    assert.equal(await page.locator('a[href="https://www.betacalendars.com/blank-calendar"]').count(), 1);

    await page.getByRole('button', { name: 'Planner', exact: true }).click();
    const payload = '<img src=x onerror=alert(1)><script>alert("xss")</script>';
    await page.getByLabel('Note').fill(payload);
    await page.getByRole('button', { name: 'Add note' }).click();
    assert.equal(await page.locator('.bcw-note img,.bcw-note script').count(), 0);
    assert.equal(await page.locator('.bcw-note strong').innerText(), payload);
    await page.reload();
    await page.addScriptTag({ content: userscript.toString() });
    await page.getByRole('heading', { name: 'Workbench' }).waitFor();
    await page.getByRole('button', { name: 'Planner', exact: true }).click();
    assert.equal(await page.locator('.bcw-note strong').innerText(), payload);

    await page.keyboard.press('Control+Shift+K');
    await page.getByRole('dialog', { name: 'Command palette' }).waitFor();
    await page.getByRole('searchbox', { name: 'Search commands' }).fill('Run Calendar Validation');
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Calendar Validation' }).waitFor();

    await page.getByRole('button', { name: 'Print Lab', exact: true }).click();
    assert.match(await page.locator('.bcw-print-preview').innerText(), /February 2027|January 2027/);
    assert.deepEqual(requests.filter(url => !url.includes('favicon.ico')), ['/fixture']);
    console.log('Browser smoke test passed: launcher, grid, Sunday rows, resource URLs, safe notes, persistence, keyboard palette and Print Lab.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
