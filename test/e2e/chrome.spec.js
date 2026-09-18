import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/test/fixtures/chrome.html'); });

test('tabs are a row with an indicator on the selected tab', async ({ page }) => {
  const list = page.locator('[role=tablist]');
  await expect(list).toHaveCSS('display', 'flex');
  await expect(list).toHaveCSS('border-bottom-width', '1px');

  const [sel, other] = await Promise.all([
    page.locator('#tab-sel').evaluate(e => getComputedStyle(e).borderBottomColor),
    page.locator('#tab-other').evaluate(e => getComputedStyle(e).borderBottomColor),
  ]);
  expect(sel).not.toBe('rgba(0, 0, 0, 0)');
  expect(other).toBe('rgba(0, 0, 0, 0)');

  // a tab is not a filled button
  await expect(page.locator('#tab-sel')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});

test('the toast region is pinned above the toolbar', async ({ page }) => {
  const out = page.locator('#toasts');
  await expect(out).toHaveCSS('position', 'fixed');
  await expect(out).toHaveCSS('z-index', '2');       // body > header is 1
  const box = await out.boundingBox();
  const vp = page.viewportSize();
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);
  // and it must not span the page
  expect(box.width).toBeLessThanOrEqual(22 * 16 + 1);
});

test('aria-busy draws a skeleton and a spinner', async ({ page }) => {
  await expect(page.locator('#busy-txt')).toHaveCSS('animation-name', 'l-shimmer');
  const spin = await page.locator('#busy-btn').evaluate(e =>
    getComputedStyle(e, '::before').animationName);
  expect(spin).toBe('l-spin');
  await expect(page.locator('#busy-btn')).toHaveCSS('pointer-events', 'none');
  // an idle button is untouched
  await expect(page.locator('#idle-btn')).toHaveCSS('pointer-events', 'auto');
});

test('reduced motion stops both animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('#busy-txt')).toHaveCSS('animation-name', 'none');
  const spin = await page.locator('#busy-btn').evaluate(e =>
    getComputedStyle(e, '::before').animationName);
  expect(spin).toBe('none');
});

test('pagination centres and marks the current page', async ({ page }) => {
  await expect(page.locator('#pager ol')).toHaveCSS('justify-content', 'center');
  const [current, other] = await Promise.all([
    page.locator('#page-current').evaluate(e => getComputedStyle(e).backgroundColor),
    page.locator('#page-other').evaluate(e => getComputedStyle(e).backgroundColor),
  ]);
  expect(current).not.toBe(other);
});

test('a dl is a two-column grid', async ({ page }) => {
  const dl = page.locator('#kv');
  await expect(dl).toHaveCSS('display', 'grid');
  const cols = (await dl.evaluate(e => getComputedStyle(e).gridTemplateColumns)).split(' ');
  expect(cols).toHaveLength(2);
  await expect(page.locator('#kv-dd')).toHaveCSS('text-align', 'end');
  await expect(page.locator('#kv-dd')).toHaveCSS('margin-left', '0px');
});
