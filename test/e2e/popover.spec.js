import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/test/fixtures/popover.html'); });

test('a panel keeps its buttons as buttons', async ({ page }) => {
  await page.locator('#panel-btn').click();
  const apply = page.locator('#apply');
  await expect(apply).toBeVisible();
  // the primary fill must survive: a menu row would be transparent
  await expect(apply).toHaveCSS('background-color', 'rgb(0, 107, 227)');
  await expect(apply).toHaveCSS('justify-content', 'center');

  const panelBox = await page.locator('#panel-pop').boundingBox();
  const applyBox = await apply.boundingBox();
  // a menu row stretches to the popover's inline size; a button does not
  expect(applyBox.width).toBeLessThan(panelBox.width * 0.6);
});

test('a panel gets room for a form', async ({ page }) => {
  await page.locator('#panel-btn').click();
  await expect(page.locator('#panel-pop')).toHaveCSS('padding', '16px');
});

test('a menu still gets menu geometry', async ({ page }) => {
  await page.locator('#menu-btn').click();
  const menu = page.locator('#menu-pop');
  await expect(menu).toBeVisible();
  const menuBox = await menu.boundingBox();
  const rowBox = await page.locator('#menu-row').boundingBox();
  // a menu row fills its menu, minus the .35rem padding either side
  expect(rowBox.width).toBeGreaterThan(menuBox.width - 16);
  await expect(page.locator('#menu-row')).toHaveCSS('justify-content', 'start');
  expect(menuBox.width).toBeGreaterThanOrEqual(192); // 12rem
});
