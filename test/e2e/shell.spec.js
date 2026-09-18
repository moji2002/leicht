import { test, expect } from '@playwright/test';

// popovers animate scale: .96 -> 1, so geometry uses layout metrics, not boundingBox()
const layout = (page, sel) => page.evaluate(s => {
  const e = document.querySelector(s);
  return { w: e.offsetWidth, h: e.offsetHeight, x: e.getBoundingClientRect().x };
}, sel);

test.describe('desktop shell', () => {
  // 60rem is the shell's breakpoint; skip on the viewport fixture, not the project name
  test.skip(({ viewport }) => viewport.width < 960, 'needs a viewport at or above 60rem');
  test.beforeEach(async ({ page }) => { await page.goto('/test/fixtures/shell.html'); });

  test('the aside is a static column, not a hidden popover', async ({ page }) => {
    const aside = page.locator('#nav');
    await expect(aside).toBeVisible();
    await expect(aside).toHaveCSS('position', 'static');
    expect((await layout(page, '#nav')).w).toBeCloseTo(240, 0);   // 15rem
  });

  test('the content column fills the rest — the auto-margin trap', async ({ page }) => {
    const main = await layout(page, '#main');
    const vw = page.viewportSize().width;
    // body > main sets margin-inline: auto, and auto margins beat justify-self: stretch.
    // Without margin-inline: 0 this collapses to its min-content width (~64px).
    expect(main.w).toBeGreaterThan(vw - 260);
  });

  test('the glass toolbar survives the shell', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(250);
    const header = page.locator('body > header');
    await expect(header).toHaveCSS('position', 'sticky');
    const bg = await header.evaluate(e => getComputedStyle(e).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('the sidebar nav is vertical with a marked current item', async ({ page }) => {
    await expect(page.locator('#nav nav ul')).toHaveCSS('display', 'grid');
    const current = await page.locator('#nav-current').evaluate(e => getComputedStyle(e).backgroundColor);
    const other = await page.locator('#nav-other').evaluate(e => getComputedStyle(e).backgroundColor);
    expect(current).not.toBe('rgba(0, 0, 0, 0)');
    expect(other).toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('mobile drawer', () => {
  test.skip(({ viewport }) => viewport.width >= 960, 'needs a viewport below 60rem');
  test.beforeEach(async ({ page }) => { await page.goto('/test/fixtures/shell.html'); });

  test('the aside is hidden until the menu button opens it', async ({ page }) => {
    await expect(page.locator('#nav')).toBeHidden();
    await page.locator('#menu-btn').click();
    const aside = page.locator('#nav');
    await expect(aside).toBeVisible();
    await expect(aside).toHaveCSS('position', 'fixed');
    const box = await layout(page, '#nav');
    expect(box.x).toBeCloseTo(0, 0);
    expect(box.w).toBeLessThanOrEqual(375 * 0.8 + 1);
    // a drawer is full height. The UA gives [popover] height: fit-content, which silently
    // defeats `inset: 0 auto 0 0` and leaves a box floating at the top.
    expect(box.h).toBeCloseTo(page.viewportSize().height, -1);
  });

  test('it light-dismisses and closes on Escape, with no script', async ({ page }) => {
    await page.locator('#menu-btn').click();
    await expect(page.locator('#nav')).toBeVisible();
    // a point genuinely outside the drawer: it is 16rem wide, so #main's content sits under it
    await page.mouse.click(350, 500);
    await expect(page.locator('#nav')).toBeHidden();

    await page.locator('#menu-btn').click();
    await expect(page.locator('#nav')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#nav')).toBeHidden();
  });

  test('the shell is one column', async ({ page }) => {
    const cols = await page.evaluate(() =>
      getComputedStyle(document.body).gridTemplateColumns.split(' ').length);
    expect(cols).toBe(1);
  });
});

test('a page with no aside is untouched', async ({ page }) => {
  await page.goto('/test/fixtures/row.html');
  await expect(page.locator('body')).toHaveCSS('display', 'block');
});
