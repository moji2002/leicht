import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/test/fixtures/chrome.html'); });

test('the avatar is a round box that takes --size', async ({ page }) => {
  await expect(page.locator('#av')).toHaveCSS('border-radius', '50%');
  expect((await page.locator('#av').boundingBox()).width).toBeCloseTo(32, 0);
  expect((await page.locator('#av-sm').boundingBox()).width).toBeCloseTo(24, 0);
});

test('the status dot inherits the variant colour', async ({ page }) => {
  const [dot, plain] = await Promise.all([
    page.locator('#dot').evaluate(e => getComputedStyle(e).backgroundColor),
    page.locator('#idle-btn').evaluate(e => getComputedStyle(e).backgroundColor),
  ]);
  expect(dot).not.toBe('rgba(0, 0, 0, 0)');
  // .success repointed --l-primary, so the dot must not match an untouched primary button
  expect(dot).not.toBe(plain);
  expect((await page.locator('#dot').boundingBox()).width).toBeCloseTo(8, 0);
});

test('.truncate ellipsises instead of wrapping', async ({ page }) => {
  const t = page.locator('#trunc');
  await expect(t).toHaveCSS('text-overflow', 'ellipsis');
  const m = await t.evaluate(e => ({
    scrollW: e.scrollWidth, clientW: e.clientWidth, lines: e.getClientRects().length,
  }));
  expect(m.scrollW).toBeGreaterThan(m.clientW);
  expect(m.lines).toBe(1);
});

test('.field is a row that owns the border and the focus ring', async ({ page }) => {
  const f = page.locator('#field');
  await expect(f).toHaveCSS('display', 'flex');
  await expect(f).toHaveCSS('border-top-width', '1px');
  // the input inside must not draw its own box
  await expect(page.locator('#amt')).toHaveCSS('border-top-width', '0px');

  await page.locator('#amt').focus();
  await expect(f).not.toHaveCSS('box-shadow', 'none');
  // and the inner input must not double the ring up
  await expect(page.locator('#amt')).toHaveCSS('box-shadow', 'none');

  // the adornments sit either side of the input
  const [prefix, input, suffix] = await Promise.all([
    page.locator('#field > span').first().boundingBox(),
    page.locator('#amt').boundingBox(),
    page.locator('#field > span').last().boundingBox(),
  ]);
  expect(prefix.x).toBeLessThan(input.x);
  expect(suffix.x).toBeGreaterThan(input.x);
});

test('.sm and .lg resize the whole control, not just the text', async ({ page }) => {
  const [sm, lg] = await Promise.all([
    page.locator('#btn-sm').boundingBox(),
    page.locator('#btn-lg').boundingBox(),
  ]);
  expect(sm.height).toBeLessThan(lg.height);
  // em padding is what makes one declaration enough
  const [smPad, lgPad] = await Promise.all([
    page.locator('#btn-sm').evaluate(e => parseFloat(getComputedStyle(e).paddingLeft)),
    page.locator('#btn-lg').evaluate(e => parseFloat(getComputedStyle(e).paddingLeft)),
  ]);
  expect(smPad).toBeLessThan(lgPad);
});

test('.between justifies a flex row apart', async ({ page }) => {
  await expect(page.locator('#bar')).toHaveCSS('justify-content', 'space-between');
});

test('the field survives dark mode and RTL', async ({ page }) => {
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  const bg = await page.locator('#field').evaluate(e => getComputedStyle(e).backgroundColor);
  expect(bg).not.toBe('rgb(255, 255, 255)');

  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  const [prefix, input] = await Promise.all([
    page.locator('#field > span').first().boundingBox(),
    page.locator('#amt').boundingBox(),
  ]);
  // in RTL the $ prefix sits to the right of the input: logical properties throughout
  expect(prefix.x).toBeGreaterThan(input.x);
});
