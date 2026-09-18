import { test, expect } from '@playwright/test';

test.describe('a wide table in a figure', () => {
  test.beforeEach(async ({ page }) => {
    // 900px is the default here; the overflow test narrows further, see its own comment
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto('/test/fixtures/table.html');
  });

  test('scrolls inside its figure, not the page', async ({ page }) => {
    // 375px, not 900: table cells wrap, so eight columns still fit inside 900px and there is
    // no overflow to test. At phone width the min-content width of eight columns cannot fit.
    await page.setViewportSize({ width: 375, height: 800 });
    const m = await page.locator('#plain').evaluate(f => ({
      scrollW: f.scrollWidth,
      clientW: f.clientWidth,
      overflowX: getComputedStyle(f).overflowX,
      docOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    expect(m.overflowX).toBe('auto');
    expect(m.scrollW).toBeGreaterThan(m.clientW);
    expect(m.docOverflows).toBe(false);
  });

  test('is framed, with the caption under the table', async ({ page }) => {
    await expect(page.locator('#plain')).toHaveCSS('border-top-width', '1px');
    const cap = await page.locator('#plain figcaption').boundingBox();
    const tbl = await page.locator('#plain table').boundingBox();
    expect(cap.y).toBeGreaterThan(tbl.y);
  });

  test('right-aligns numeric cells, by class and by <data>', async ({ page }) => {
    // `text-align: end` computes as "end", not "right" — it is the logical keyword
    await expect(page.locator('#plain td.num').first()).toHaveCSS('text-align', 'end');
    await expect(page.locator('#plain th.num').first()).toHaveCSS('text-align', 'end');
    // the <data> path, in a column with no .num at all
    await expect(page.locator('#plain td:has(> data)').first()).toHaveCSS('text-align', 'end');
  });

  test('highlights a row on hover', async ({ page }) => {
    const row = page.locator('#plain tbody tr').first();
    const before = await row.evaluate(e => getComputedStyle(e).backgroundColor);
    await row.hover();
    await expect(async () => {
      const after = await row.evaluate(e => getComputedStyle(e).backgroundColor);
      expect(after).not.toBe(before);
    }).toPass({ timeout: 2000 });
  });
});

test('--l-table-max caps the height and sticks the header', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/test/fixtures/table.html');

  const capped = page.locator('#capped');
  expect(await capped.evaluate(f => f.clientHeight)).toBeLessThanOrEqual(224); // 14rem
  expect(await capped.evaluate(f => f.scrollHeight)).toBeGreaterThan(224);

  await capped.evaluate(f => { f.scrollTop = 80; });
  const { thTop, figTop, scrolled } = await capped.evaluate(f => ({
    thTop: Math.round(f.querySelector('th').getBoundingClientRect().top),
    figTop: Math.round(f.getBoundingClientRect().top),
    scrolled: f.scrollTop,
  }));
  expect(scrolled).toBe(80);
  // the header stayed put while the body scrolled under it
  expect(Math.abs(thTop - figTop)).toBeLessThan(4);
});

test('a table outside a figure is untouched', async ({ page }) => {
  await page.goto('/test/fixtures/table.html');
  await expect(page.locator('#naked')).toHaveCSS('border-top-width', '0px');
});

test('an image figure is not treated as a table wrapper', async ({ page }) => {
  await page.goto('/test/fixtures/table.html');
  await expect(page.locator('#imagefig')).toHaveCSS('border-top-width', '0px');
  await expect(page.locator('#imagefig')).toHaveCSS('overflow-x', 'visible');
});
