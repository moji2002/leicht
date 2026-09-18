import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/test/console.html'); });

// THE acceptance criterion. Against 0.1.1 this console needed ~70 lines of custom CSS.
test('the console carries no custom CSS at all', async ({ page }) => {
  const custom = await page.evaluate(() => ({
    styleBlocks: document.querySelectorAll('style').length,
    linked: [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.getAttribute('href')),
    // a style attribute is allowed only for token overrides and anchor wiring
    badInline: [...document.querySelectorAll('[style]')]
      .map(e => `${e.tagName.toLowerCase()}: ${e.getAttribute('style')}`)
      .filter(s => !/:\s*(--[\w-]+\s*:|anchor-name\s*:|position-anchor\s*:)/.test(s)),
  }));
  expect(custom.styleBlocks).toBe(0);
  expect(custom.linked).toEqual(['../dist/leicht.css']);
  expect(custom.badInline).toEqual([]);
});

test('nothing overflows the viewport', async ({ page }) => {
  const overflows = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});

test('the shell, table, tabs and toasts are all live', async ({ page }, info) => {
  if (info.project.name === 'desktop') {
    expect(await page.evaluate(() =>
      getComputedStyle(document.body).gridTemplateColumns.split(' ').length)).toBe(2);
    await expect(page.locator('#nav')).toBeVisible();
  } else {
    // on a phone the sidebar is a drawer, closed until asked for
    await expect(page.locator('#nav')).toBeHidden();
  }
  // two now: the invoice list and the line items inside the detail card
  await expect(page.locator('figure:has(> table)').first()).toHaveCSS('overflow-x', 'auto');
  expect(await page.locator('figure:has(> table)').count()).toBe(2);
  await expect(page.locator('[role=tablist]')).toHaveCSS('display', 'flex');
  await expect(page.locator('body > output')).toHaveCSS('position', 'fixed');
  await expect(page.locator('body > header')).toHaveCSS('position', 'sticky');
});

test('the breadcrumb is not a numbered list', async ({ page }) => {
  await expect(page.locator('header ol')).toHaveCSS('list-style-type', 'none');
});

test('the KPI row stacks on a phone and splits on a desktop', async ({ page }, info) => {
  const tracks = await page.evaluate(() =>
    getComputedStyle(document.querySelector('main .row')).gridTemplateColumns.split(' ').length);
  expect(tracks).toBe(info.project.name === 'desktop' ? 4 : 1);
});

test('the modal opens and closes', async ({ page }) => {
  await page.getByRole('button', { name: 'New invoice' }).click();
  await expect(page.locator('#new-invoice')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#new-invoice')).toBeHidden();
});

test('the filter panel keeps its buttons as buttons', async ({ page }) => {
  await page.getByRole('button', { name: 'More filters' }).click();
  const apply = page.getByRole('button', { name: 'Apply' });
  await expect(apply).toBeVisible();
  const [applyBg, plainBg] = await Promise.all([
    apply.evaluate(e => getComputedStyle(e).backgroundColor),
    page.locator('#reconcile-btn').evaluate(e => getComputedStyle(e).backgroundColor),
  ]);
  expect(applyBg).toBe(plainBg);
});

test('the drawer opens on a phone with no script', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'drawer only exists below 60rem');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('#nav')).toBeVisible();
  await expect(page.locator('#nav')).toHaveCSS('position', 'fixed');
  await page.keyboard.press('Escape');
  await expect(page.locator('#nav')).toBeHidden();
});

for (const theme of ['light', 'dark']) {
  test(`renders correctly in ${theme}`, async ({ page }) => {
    await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot(`console-${theme}.png`, {
      fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.002,
    });
  });
}
