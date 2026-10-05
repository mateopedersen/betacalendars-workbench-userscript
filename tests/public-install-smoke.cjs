const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const listingUrl = 'https://greasyfork.org/en/scripts/598838-beta-calendars-workbench-grid-inspector-print-lab-local-planner';
const betaUrl = 'https://www.betacalendars.com/';
const screenshotDir = path.resolve(__dirname, '../docs/screenshots');

async function waitForWorkbench(page) {
  const heading = page.getByRole('heading', { name: 'Workbench' });
  if (!await heading.isVisible().catch(() => false)) {
    const launcher = page.getByRole('button', { name: 'Open Beta Calendars Workbench' });
    await launcher.waitFor({ timeout: 30_000 });
    await launcher.click();
  }
  await heading.waitFor({ state: 'visible', timeout: 10_000 });
}

async function main() {
  const extensionPath = process.env.VIOLENTMONKEY_EXTENSION_PATH;
  assert.ok(extensionPath, 'VIOLENTMONKEY_EXTENSION_PATH must point to the pinned official Violentmonkey MV3 release');
  await fs.mkdir(screenshotDir, { recursive: true });

  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'bcw-public-install-'));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    let worker = context.serviceWorkers().find(item => item.url().startsWith('chrome-extension://'));
    if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 30_000 });
    const extensionId = new URL(worker.url()).host;

    const settings = await context.newPage();
    await settings.goto(`chrome://extensions/?id=${extensionId}`);
    const allowScripts = settings.getByText('Allow User Scripts', { exact: true });
    await allowScripts.waitFor({ timeout: 15_000 });
    await allowScripts.click();
    await settings.waitForTimeout(1500);
    await settings.close();

    worker = context.serviceWorkers().find(item => item.url().startsWith(`chrome-extension://${extensionId}/`)) || worker;
    const userScriptsEnabled = await worker.evaluate(() => Boolean(chrome.userScripts));
    assert.equal(userScriptsEnabled, true, 'Violentmonkey must have Chrome’s Allow User Scripts permission enabled');

    const listing = await context.newPage();
    await listing.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    assert.match(await listing.locator('body').innerText(), /Version\s*1\.0\.1/);
    const installLink = listing.getByRole('link', { name: 'Install this script', exact: true });
    const installUrl = await installLink.getAttribute('href');
    assert.match(installUrl, /^https:\/\/update\.greasyfork\.org\/scripts\/598838\//);
    await installLink.click();
    await listing.waitForTimeout(3000);

    let pages = context.pages();
    let installer = pages.find(page => page.url().startsWith(`chrome-extension://${extensionId}/`));
    if (!installer) installer = pages.find(page => /update\.greasyfork\.org/.test(page.url()));
    assert.ok(installer, `Greasy Fork should hand the public .user.js to Violentmonkey; open pages: ${pages.map(page => page.url()).join(', ')}`);

    const installerText = await installer.locator('body').innerText({ timeoutMs: 10_000 });
    if (/install|confirm|add script/i.test(installerText)) {
      const confirm = installer.getByRole('button', { name: /install|confirm|add script/i }).first();
      if (await confirm.count()) await confirm.click();
    }
    await installer.waitForTimeout(1500);

    const page = await context.newPage();
    await page.goto(betaUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await waitForWorkbench(page);
    await page.screenshot({ path: path.join(screenshotDir, '01-workbench-overview.png'), fullPage: false });

    await page.getByRole('button', { name: 'Month Grid', exact: true }).click();
    await page.getByLabel('Month').selectOption('2');
    await page.getByLabel('Year').fill('2027');
    await page.getByLabel('Year').dispatchEvent('change');
    assert.match(await page.locator('.bcw-grid caption').innerText(), /February 2027/);
    assert.match(await page.locator('.bcw-grid caption').innerText(), /4 rows/);
    assert.match(await page.locator('.bcw-pass').first().innerText(), /PASS/);
    await page.screenshot({ path: path.join(screenshotDir, '02-month-grid-february-2027.png'), fullPage: false });

    await page.getByLabel('Week starts').selectOption('sunday');
    assert.match(await page.locator('.bcw-grid caption').innerText(), /5 rows/);
    await page.getByLabel('Month').selectOption('8');
    assert.match(await page.locator('.bcw-grid caption').innerText(), /August 2027/);
    assert.match(await page.locator('.bcw-grid caption').innerText(), /5 rows/);

    await page.getByRole('button', { name: 'Planner', exact: true }).click();
    const xssPayload = '<img src=x onerror=alert(1)><script>alert("xss")</script>';
    await page.getByRole('textbox', { name: 'Note' }).fill(xssPayload);
    await page.getByRole('button', { name: 'Add note' }).click();
    assert.equal(await page.locator('.bcw-note img,.bcw-note script').count(), 0);
    assert.equal(await page.locator('.bcw-note strong').innerText(), xssPayload);
    await page.screenshot({ path: path.join(screenshotDir, '03-local-planner.png'), fullPage: false });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForWorkbench(page);
    await page.getByRole('button', { name: 'Planner', exact: true }).click();
    assert.equal(await page.locator('.bcw-note strong').innerText(), xssPayload);
    await page.getByRole('button', { name: 'Print Lab', exact: true }).click();
    await page.screenshot({ path: path.join(screenshotDir, '04-print-lab.png'), fullPage: false });

    console.log(JSON.stringify({
      result: 'PASS',
      installSource: installUrl,
      extension: `Violentmonkey ${await worker.evaluate(() => chrome.runtime.getManifest().version)}`,
      installedPage: betaUrl,
      checks: ['public Greasy Fork install handoff', 'launcher and Workbench', 'February 2027 four-to-five-row switch', 'August 2027 Sunday-first five rows', 'XSS-safe local note', 'note persistence after reload'],
      screenshots: ['01-workbench-overview.png', '02-month-grid-february-2027.png', '03-local-planner.png', '04-print-lab.png'],
    }, null, 2));
  } finally {
    await context.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
