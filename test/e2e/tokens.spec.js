import { test, expect } from '@playwright/test';

// Colours are compared against a reference element rather than a literal: Chromium serialises a
// token-derived colour as oklch(), so hardcoding rgb() would test the serialisation.
const bg = (page, sel) => page.locator(sel).evaluate(e => getComputedStyle(e).backgroundColor);
const fg = (page, sel) => page.locator(sel).evaluate(e => getComputedStyle(e).color);

// Real sRGB channels for a computed colour, whatever colour space it serialises in: paint it to
// a 1x1 canvas and read the pixel back. Parsing the string would read oklch's L/C/H as r/g/b.
const channels = (page, sel, prop) => page.locator(sel).evaluate((e, p) => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const cx = cv.getContext('2d');
  cx.fillStyle = getComputedStyle(e)[p];
  cx.fillRect(0, 0, 1, 1);
  return [...cx.getImageData(0, 0, 1, 1).data].slice(0, 3);
}, prop);

test.beforeEach(async ({ page }) => { await page.goto('/test/fixtures/row.html'); });

test('one repointed variable recolours every component', async ({ page }) => {
  const [warn, plain] = [await bg(page, '#warn-btn'), await bg(page, '#plain-btn')];
  expect(warn).not.toBe('rgba(0, 0, 0, 0)');
  // .warning repointed --l-primary, so the fill must differ from an ordinary button
  expect(warn).not.toBe(plain);

  // the alert border and the tag colour both derive from --l-primary, so neither may still
  // match the untouched primary
  const alertBorder = await page.locator('#warn-alert').evaluate(e => getComputedStyle(e).borderTopColor);
  expect(alertBorder).not.toBe(plain);
  expect(await fg(page, '#warn-tag')).not.toBe(plain);

  // and the warning tag must agree with the warning button: one token, two components
  const tagColor = await fg(page, '#warn-tag');
  expect(tagColor).toBe(warn);
});

test('.neutral is grey and .warning is amber', async ({ page }) => {
  const [nr, , nb] = await channels(page, '#neutral-tag', 'color');
  // grey means the channels sit close together
  expect(Math.abs(nr - nb)).toBeLessThan(30);

  // amber is the opposite: a wide red-over-blue spread
  const [wr, , wb] = await channels(page, '#warn-btn', 'backgroundColor');
  expect(wr - wb).toBeGreaterThan(60);
});

test('--l-focus resolves instead of poisoning the ring', async ({ page }) => {
  const ring = page.locator('#ring');
  await ring.focus();
  // toHaveCSS auto-retries, which matters: the ring transitions over .15s, and a one-shot read
  // catches it mid-flight at ~2.78px of its eventual 3px spread.
  await expect(ring).toHaveCSS('box-shadow', /0px 0px 0px 3px$/);
  // a poisoned var() would leave the property at "none" rather than a partial value
  await expect(ring).not.toHaveCSS('box-shadow', 'none');
});
