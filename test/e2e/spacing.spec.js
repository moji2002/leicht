import { test, expect } from '@playwright/test';

// The visual guard for the ~20 hardcoded spacing values §7 converts. Every diff these catch must
// be traceable to a rung change listed in the plan; anything else is a regression.
for (const path of ['/index.html', '/skins.html']) {
  for (const theme of ['light', 'dark']) {
    test(`${path} ${theme} is visually unchanged`, async ({ page }) => {
      await page.goto(path);
      await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
      // the scroll-driven toolbar animation must settle before the shot
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`${path.replace(/\W/g, '')}-${theme}.png`, {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.002,
      });
    });
  }
}

// The acceptance test for §7: --l-space must be the one knob that resizes the whole UI. Every
// entry here is a component whose padding was hardcoded before the conversion.
const PROBES = {
  card: ['#card', 'paddingTop'],
  cardHeader: ['#card > header', 'paddingTop'],
  alert: ['#alert', 'paddingTop'],
  details: ['#details', 'paddingTop'],
  main: ['main', 'paddingTop'],
  header: ['body > header', 'paddingTop'],
  rowGap: ['#row', 'rowGap'],
  rule: ['#rule', 'marginBlockStart'],
};

test('--l-space is the density knob for every component', async ({ page }) => {
  await page.goto('/test/fixtures/density.html');

  const read = () => page.evaluate(probes => {
    const out = {};
    for (const [key, [sel, prop]] of Object.entries(probes)) {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`density fixture is missing ${sel}`);
      out[key] = parseFloat(getComputedStyle(el)[prop]) || 0;
    }
    return out;
  }, PROBES);

  const set = v => page.evaluate(
    val => document.documentElement.style.setProperty('--l-space', val), v);

  const base = await read();
  await set('.75rem');
  const tight = await read();
  await set('1.25rem');
  const loose = await read();

  for (const key of Object.keys(PROBES)) {
    // a value that ignores --l-space is a literal that was missed
    expect(tight[key], `${key} must shrink when --l-space shrinks (was ${base[key]})`)
      .toBeLessThan(base[key]);
    expect(loose[key], `${key} must grow when --l-space grows (was ${base[key]})`)
      .toBeGreaterThan(base[key]);
  }
});

test('a field hint does not collide with the next label', async ({ page }) => {
  await page.goto('/test/fixtures/density.html');
  const gap = await page.evaluate(() => {
    const hint = document.getElementById('hint').getBoundingClientRect();
    const next = document.querySelector('label[for=second]').getBoundingClientRect();
    return next.top - hint.bottom;
  });
  expect(gap).toBeGreaterThan(8);
});

test('a row of cards does not double its bottom margin', async ({ page }) => {
  await page.goto('/test/fixtures/density.html');
  const gap = await page.evaluate(() => {
    const row = document.getElementById('row').getBoundingClientRect();
    // the LAST card: below 40rem the row stacks, so the first card is not the bottom one
    const cards = [...document.querySelectorAll('#row .card')];
    const last = cards[cards.length - 1].getBoundingClientRect();
    // the row's box must end where its last card ends: no extra card margin inside
    return row.bottom - last.bottom;
  });
  expect(gap).toBeLessThan(1);
});
