import { test, expect } from '@playwright/test';

// leicht animates popovers with scale: .96 -> 1, and boundingBox() returns the *transformed*
// rect — a 12rem menu measures 184px mid-transition. Every geometry assertion here therefore
// uses offsetWidth, which is the untransformed layout box.
const layoutWidth = (page, sel) =>
  page.evaluate(s => document.querySelector(s).offsetWidth, sel);

test.beforeEach(async ({ page }) => { await page.goto('/test/fixtures/popover.html'); });

test('a panel keeps its buttons as buttons', async ({ page }) => {
  await page.locator('#panel-btn').click();
  const apply = page.locator('#apply');
  await expect(apply).toBeVisible();

  // The primary fill must survive — a menu row would be transparent. Compared against an
  // ordinary button rather than a literal: Chromium serialises a token-derived colour as
  // oklch(), so hardcoding rgb() tests the serialisation, not the styling.
  const [applyBg, plainBg] = await Promise.all([
    apply.evaluate(e => getComputedStyle(e).backgroundColor),
    page.locator('#panel-btn').evaluate(e => getComputedStyle(e).backgroundColor),
  ]);
  expect(applyBg).not.toBe('rgba(0, 0, 0, 0)');
  expect(applyBg).toBe(plainBg);
  await expect(apply).toHaveCSS('justify-content', 'center');

  const panelW = await layoutWidth(page, '#panel-pop');
  const applyW = await layoutWidth(page, '#apply');
  // a menu row stretches to the popover's inline size; a button does not
  expect(applyW).toBeLessThan(panelW * 0.6);
});

test('a panel gets room for a form', async ({ page }) => {
  await page.locator('#panel-btn').click();
  await expect(page.locator('#panel-pop')).toHaveCSS('padding', '16px');
});

test('a menu still gets menu geometry', async ({ page }) => {
  await page.locator('#menu-btn').click();
  await expect(page.locator('#menu-pop')).toBeVisible();

  const menuW = await layoutWidth(page, '#menu-pop');
  const rowW = await layoutWidth(page, '#menu-row');
  expect(menuW).toBeGreaterThanOrEqual(192); // 12rem
  // a menu row fills its menu, minus the .35rem padding either side
  expect(rowW).toBeGreaterThan(menuW - 16);
  await expect(page.locator('#menu-row')).toHaveCSS('justify-content', 'start');
});
