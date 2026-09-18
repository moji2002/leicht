import { test, expect } from '@playwright/test';

test('the stylesheet loads and its tokens resolve', async ({ page }) => {
  await page.goto('/index.html');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  // a resolved token, not the initial value: proves dist/leicht.css applied
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
});
