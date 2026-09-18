import { test, expect } from '@playwright/test';

const tracks = async (page, sel) =>
  (await page.evaluate(s => getComputedStyle(document.querySelector(s)).gridTemplateColumns, sel))
    .split(' ').length;

test.describe('bare .row', () => {
  test('stacks to one column on a phone', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'width-dependent');
    await page.goto('/test/fixtures/row.html');
    expect(await tracks(page, '#bare')).toBe(1);
  });

  test('splits evenly on a desktop', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'width-dependent');
    await page.goto('/test/fixtures/row.html');
    expect(await tracks(page, '#bare')).toBe(4);
  });

  test('does not disturb a spanned row', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'width-dependent');
    await page.goto('/test/fixtures/row.html');
    // 12 tracks once any .col-N appears
    expect(await tracks(page, '#spanned')).toBe(12);
  });
});

test('nav resets an ol as well as a ul', async ({ page }) => {
  await page.goto('/test/fixtures/row.html');
  const ol = page.locator('#crumbs ol');
  await expect(ol).toHaveCSS('list-style-type', 'none');
  await expect(ol).toHaveCSS('padding-inline-start', '0px');
  await expect(ol).toHaveCSS('display', 'flex');
});
