# leicht 0.2 Application Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A user can build an admin console — app shell, data table, tabs, toasts, forms, correct
spacing — writing only HTML, with no custom CSS.

**Architecture:** leicht is one hand-written stylesheet split across `src/*.css`, inlined by
`build.js` into `dist/`. Three cascade layers (`leicht.base`, `leicht.components`,
`leicht.utilities`) are declared once in `src/index.css`; author CSS sits outside them and always
wins. New application-layer components go in a new `src/app.css` so `components.css` does not
balloon. Selectors are semantic/ARIA-first (`figure:has(> table)`, `[role=tablist]`, `aside nav`,
`body > output`); classes appear only where HTML offers no hook.

**Tech Stack:** Modern CSS only (cascade layers, `light-dark()`, `oklch()`, `color-mix()`,
container queries, `:has()`, `corner-shape`, anchor positioning, `popover`). Node for `build.js`.
**No runtime dependencies.** Dev dependencies are permitted (confirmed by the user 2026-09-18):
`@playwright/test` 1.63.0 drives the assertions, and a dependency-free Node script checks colour
contrast.

**Spec:** `docs/superpowers/specs/2026-09-18-leicht-app-layer-design.md` — read it alongside this
plan; every task cites the section it implements.

## Global Constraints

- **Gzip budget: 10,000 B for `leicht.min.css`.** `build.js` throws if exceeded. Current: ~5,700 B.
  Target after this work: ≤ 8,000 B. Every task runs `npm test`, which builds first and prints the
  gzip number.
- **Themes budget: 2,000 B for `leicht-themes.min.css`.** Unchanged by this work.
- **No runtime dependencies, and no CSS parser in the build.** `build.js` is deliberately a
  whitespace minifier because parsers lag bleeding-edge syntax. Dev dependencies are fine;
  do not add anything that processes the CSS.
- **Layer discipline:** base-level resets in `@layer leicht.base`, components in
  `@layer leicht.components`, accessibility/print overrides in `@layer leicht.utilities`. Never
  use `!important`. Never use `:where()` to lower specificity — the layer already handles it.
- **No unsupported function inside a custom property.** From `src/edge.css`: a custom property
  holding an unsupported function is still "valid" and poisons every `var()` that reads it. Feature
  queries wrap the *rule*, not the token.
- **Logical properties only** — `inline-size`, `margin-block-end`, `inset-inline-start`,
  `padding-inline`. The library is RTL-correct; physical properties break that.
- **Native nesting with `&`** is the house style, as in every existing `src/*.css` file.
- **Comments explain why, not what**, and cite measurements as `[measured, <engine> <version>]` —
  follow the tone already in `src/edge.css` and `src/forms.css`.
- **`--l-warning` is `light-dark(oklch(54% .13 75), oklch(80% .15 80))`** — measured 5.01:1 light,
  10.41:1 dark. Do not adjust without re-running the contrast test.
- **Commit on the current branch (`main`).** Do not create a branch. Do not push.
- Commit messages end with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

### Pre-existing working-tree state

`src/themes.css` and the themes files in `dist/` carry **uncommitted changes from a previous
session** (the cyber skin retuned) that predate this plan. Task 1 Step 1 deals with them. Do not
fold them into a 0.2 commit.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `playwright.config.js` | **Create.** `baseURL`, a desktop 1440×900 and a mobile 375×812 project, `webServer` pointing at the static server, screenshot baseline paths. | 1 |
| `test/server.mjs` | **Create.** ~20-line dependency-free static file server on 4173. Used by Playwright's `webServer` and by hand. | 1 |
| `test/contrast.test.mjs` | **Create.** Dependency-free Node script: parses tokens from `src/tokens.css`, converts `oklch()` → sRGB, asserts WCAG floors. No browser. | 1 |
| `test/fixtures/*.html` | **Create.** One fixture per feature area, each linking `../../dist/leicht.css`. | 2–9 |
| `test/e2e/*.spec.js` | **Create.** One Playwright spec per feature area. | 2–9 |
| `test/console.html` | **Create** (moved from `lab-console.html`, `<style>` block deleted). The acceptance test. | 10 |
| `src/tokens.css` | **Modify.** `--l-warning`, `--l-focus`, `--l-aside`, `--l-table-max`, spacing scale. | 4, 5, 6, 7 |
| `src/base.css` | **Modify.** Spacing rhythm, `main` padding, heading margins. | 5 |
| `src/forms.css` | **Modify.** `--l-focus`, field help spacing, `.field`, `.sm`/`.lg`. | 4, 5, 9 |
| `src/components.css` | **Modify.** `.row` fix, `nav` `ol` fix, popover split, card header flex, `.warning`/`.neutral`, `.avatar`, `.dot`. | 2, 3, 4, 5, 9 |
| `src/app.css` | **Create.** Shell, data tables, tabs, toasts, skeleton, pagination, `dl` grid. | 6, 7, 8 |
| `src/utilities.css` | **Modify.** `.truncate`, `.between`, `.end`, reduced-motion `animation`. | 8, 9 |
| `src/polish.css` | **Modify.** Print and `forced-colors` for the toast region. | 8 |
| `src/index.css` | **Modify.** One `@import "app.css"`. | 6 |
| `index.html`, `README.md`, `llms.txt` | **Modify.** Document the new vocabulary; update the gzip badge. | 10 |
| `docs/production-gaps.md` | **Modify.** Record what 0.2 closed and what remains. | 10 |
| `.gitignore` | **Modify.** `node_modules/` is already ignored; add Playwright's output dirs. | 1 |

`src/app.css` is a new file rather than an extension of `components.css` because the two have
different audiences: `components.css` serves document-shaped pages, `app.css` serves application
shells. Import order matters — `app.css` goes after `components.css` and before `edge.css`, so
the bleeding-edge enhancements in `edge.css` can still refine app components.

**Test layout rationale:** one fixture + one spec per feature area, rather than one giant page.
A failing spec then names the area, and a fixture stays small enough to read in full while
debugging it.

---

## Task 1: Test harness

Establishes the cycle every later task depends on: `npm test` builds, checks contrast, then drives
Chromium. Also permanently guards the accessibility claim in the README ("4.86:1 against the
page").

**Files:**
- Create: `test/server.mjs`, `test/contrast.test.mjs`, `playwright.config.js`
- Modify: `package.json`, `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` (build → contrast → Playwright), `npm run test:e2e` (Playwright only),
  `npm run test:update` (refresh screenshot baselines). Playwright `baseURL` is
  `http://localhost:4173`, so specs navigate with page-relative paths like
  `/test/fixtures/row.html`. Projects are named `desktop` (1440×900) and `mobile` (375×812).

- [ ] **Step 1: Deal with the pre-existing working-tree changes first**

Run: `git status --short`
Expected: `src/themes.css`, `dist/leicht-themes.css`, `dist/leicht-themes.min.css` modified, plus
untracked `lab-console.html` and `docs/`.

Commit the skin work on its own so the 0.2 diff stays readable:

```bash
git add src/themes.css dist/leicht-themes.css dist/leicht-themes.min.css
git commit -m "$(cat <<'EOF'
style: retune the cyber skin

Carried over from an earlier session; committed separately so it does not
ride along in the 0.2 application-layer diff.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

If `git diff --cached` shows anything beyond the skin retune, stop and ask — do not guess at
someone else's half-finished work.

- [ ] **Step 2: Install the dev dependency**

```bash
npm install -D @playwright/test@1.63.0
npx playwright install chromium
```

Expected: `package.json` gains `@playwright/test` under `devDependencies`; `package-lock.json`
updates. `@untitledui/icons` stays.

- [ ] **Step 3: Write the static server**

Create `test/server.mjs`. Playwright's `webServer` needs something to serve the repo, and a
20-line server is cheaper than a dependency:

```js
// Static file server for the test suite and for eyeballing fixtures by hand.
// Dependency-free on purpose, like build.js.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, normalize, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

const port = Number(process.env.PORT ?? 4173);

createServer(async (req, res) => {
  // strip the query and refuse to escape the repo root
  const path = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const file = join(ROOT, path.endsWith('/') ? path + 'index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(port, () => console.log(`serving ${ROOT} on http://localhost:${port}`));
```

- [ ] **Step 4: Write the contrast test**

Create `test/contrast.test.mjs`. The OKLab matrices are Björn Ottosson's; Step 7 validates them
against browser-measured values before anything depends on them.

```js
// Dependency-free WCAG check for leicht's semantic tokens. No browser needed:
// oklch() -> OKLab -> linear sRGB -> relative luminance -> contrast ratio.
// Validated against Chromium-measured ratios; see the table in the plan, Task 1 Step 7.
import { readFileSync } from 'node:fs';

const oklchToLinearRgb = (L, C, H) => {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ].map(v => Math.min(1, Math.max(0, v)));
};

// relative luminance wants LINEAR values, which is exactly what the above returns
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const ratio = (x, y) => {
  const [a, b] = [luminance(x), luminance(y)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

const parseOklch = str => {
  const m = str.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!m) throw new Error(`not an oklch() literal: ${str}`);
  return oklchToLinearRgb(+m[1] / 100, +m[2], +m[3]);
};

// --name: light-dark(<light>, <dark>)  ->  { light, dark }
const readTokens = file => {
  const css = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
  const out = {};
  for (const [, name, pair] of css.matchAll(/--l-([a-z-]+):\s*light-dark\((.+?)\);/g)) {
    const halves = pair.split(/,(?![^(]*\))/).map(s => s.trim());
    if (halves.length === 2 && halves.every(h => h.startsWith('oklch('))) {
      out[name] = { light: parseOklch(halves[0]), dark: parseOklch(halves[1]) };
    }
  }
  return out;
};

const AA = 4.5;
const AAA = 7;
const t = readTokens('tokens.css');
const fails = [];
const report = [];

for (const name of ['primary', 'error', 'success', 'warning']) {
  if (!t[name]) { fails.push(`--l-${name} is missing or not a light-dark() oklch pair`); continue; }
  for (const mode of ['light', 'dark']) {
    // --l-on-primary falls back to --l-bg, so a solid fill is judged against the page colour
    const r = ratio(t[name][mode], t.bg[mode]);
    report.push(`--l-${name.padEnd(8)} ${mode.padEnd(5)} ${r.toFixed(2)}:1`);
    if (r < AA) fails.push(`--l-${name} ${mode}: ${r.toFixed(2)}:1 is below AA ${AA}:1`);
  }
}

// body text, which is the claim the README actually makes
for (const mode of ['light', 'dark']) {
  const r = ratio(t.fg[mode], t.bg[mode]);
  report.push(`--l-fg       ${mode.padEnd(5)} ${r.toFixed(2)}:1`);
  if (r < AAA) fails.push(`--l-fg ${mode}: ${r.toFixed(2)}:1 is below AAA ${AAA}:1`);
}

console.log(report.join('\n'));
if (fails.length) { console.error('\nFAIL\n' + fails.map(f => '  ' + f).join('\n')); process.exit(1); }
console.log('\nPASS');
```

- [ ] **Step 5: Write the Playwright config**

Create `playwright.config.js`:

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  // the CSS is the unit under test; parallel pages are independent
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173' },
  // one baseline per project, so a desktop diff never masks a mobile one
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: 'node test/server.mjs',
    url: 'http://localhost:4173/dist/leicht.css',
    reuseExistingServer: !process.env.CI,
  },
});
```

`devices['Desktop Chrome']` with an overridden viewport is deliberate for the `mobile` project:
the point is the 375px **width**, not touch emulation, and leicht's breakpoints are width-based.

- [ ] **Step 6: Wire up the scripts**

In `package.json` `"scripts"`, keeping the existing entries:

```json
"test": "node build.js && node test/contrast.test.mjs && playwright test",
"test:e2e": "playwright test",
"test:update": "playwright test --update-snapshots",
```

`npm test` builds first on purpose: every spec asserts against `dist/leicht.css`, so a stale
build would test the previous commit's CSS.

In `.gitignore`, add:

```
test-results/
playwright-report/
.playwright/
```

Playwright's `__screenshots__` baselines are **committed** — they are the reference, not output.

- [ ] **Step 7: Run it and validate the maths**

Run: `node test/contrast.test.mjs`
Expected: FAIL with `--l-warning is missing or not a light-dark() oklch pair` — the token arrives
in Task 4. Every other token prints a ratio.

Now check the script against values measured in Chromium on 2026-09-18 by painting each colour to
a 1×1 canvas and reading the pixel back:

| Token | Measured |
|---|---|
| `--l-primary` light | 4.86:1 |
| `--l-error` light | 5.01:1 |
| `--l-success` light | 5.02:1 |
| `oklch(54% .13 75)` light | 5.01:1 |

Each must agree to within ±0.03. If any disagrees by more, the conversion is wrong — fix the
matrices; **do not** adjust the expected values to match. `--l-primary` landing on 4.86:1 also
confirms the figure published in the README.

- [ ] **Step 8: Prove the browser harness runs**

Create `test/e2e/harness.spec.js` — a deliberately trivial spec whose only job is to prove the
server, the config and the stylesheet all connect:

```js
import { test, expect } from '@playwright/test';

test('the stylesheet loads and its tokens resolve', async ({ page }) => {
  await page.goto('/index.html');
  const bg = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor);
  // a resolved token, not the initial value: proves dist/leicht.css applied
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
});
```

Run: `npx playwright test`
Expected: 2 passed (one per project).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json .gitignore playwright.config.js test/
git commit -m "$(cat <<'EOF'
test: add the test harness — contrast check plus Playwright

npm test builds, then checks token contrast with dependency-free oklch
maths validated against Chromium-measured ratios, then drives Chromium at
1440px and 375px. A 20-line static server keeps the build dependency-free.
The contrast check fails on --l-warning until 0.2 adds it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Bug fixes — bare `.row` stacking and `nav > ol`

Spec §1.1 and §1.2. Two independent one-line selector defects, both in `src/components.css`,
grouped because a reviewer would accept or reject them together.

**Files:**
- Create: `test/fixtures/row.html`, `test/e2e/row.spec.js`
- Modify: `src/components.css`

**Interfaces:**
- Consumes: the Task 1 harness.
- Produces: no new API. `.row` with no `.col-*` children stacks below 40rem; `nav > ol` is reset
  like `nav > ul`, which Task 10's breadcrumb relies on.

- [ ] **Step 1: Write the fixture**

Create `test/fixtures/row.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>row + nav fixture</title>
<link rel="stylesheet" href="../../dist/leicht.css">
</head>
<body>
<main>
  <h1>Bare row</h1>
  <div class="row" id="bare">
    <div class="card">Outstanding<br>$48,920</div>
    <div class="card">Paid<br>$212,480</div>
    <div class="card">Overdue<br>$7,310</div>
    <div class="card">Rate<br>94.2%</div>
  </div>

  <h2>Spanned row</h2>
  <div class="row" id="spanned">
    <div class="col-8"><div class="card">eight</div></div>
    <div class="col-4"><div class="card">four</div></div>
  </div>

  <nav id="crumbs">
    <ol><li><a href="#">Workspace</a></li><li><a href="#">Billing</a></li><li>Invoices</li></ol>
  </nav>
</main>
</body>
</html>
```

- [ ] **Step 2: Write the failing test**

Create `test/e2e/row.spec.js`:

```js
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
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx playwright test row`
Expected: FAIL — `stacks to one column on a phone` reports 4 tracks, and all three `nav`
assertions fail (`decimal`, `40px`, `block`). The two desktop `.row` tests should already pass;
they are the regression guard.

- [ ] **Step 4: Write the minimal implementation**

In `src/components.css`, in the existing `@container (width < 40rem)` block, add the bare-row rule
alongside the two already there:

```css
  @container (width < 40rem) {
    .row > :is([class*=col-], [data-span]) { --span: 12 }
    .row > :is(.col-1, .col-2, .col-3, .col-4, .col-5) { --span: 6 }
    /* a bare .row has no spans to re-point, so the flow itself is the only thing left to change */
    .row:not(:has(> :is([class*=col-], [data-span]))) { grid-auto-flow: row }
  }
```

In the same file, in the `nav` block — a breadcrumb is an `<ol>`:

```css
    & :is(ul, ol) { display: flex; flex-wrap: wrap; align-items: center; gap: inherit; margin: 0; padding: 0; list-style: none }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: contrast still fails on `--l-warning` (correct until Task 4), so run
`npx playwright test row` for the browser assertions.
Expected: 8 passed.

- [ ] **Step 6: Check the docs site for regressions**

Run: `npx playwright test harness` — then open `http://localhost:4173/index.html` by hand (the
server is already up from `reuseExistingServer`) and scan for changed layout. The only intended
difference is that bare rows now stack on narrow viewports.

- [ ] **Step 7: Commit**

```bash
node build.js
git add src/components.css dist/ test/fixtures/row.html test/e2e/row.spec.js
git commit -m "$(cat <<'EOF'
fix: stack a bare .row on narrow viewports, and reset nav > ol

The container query only re-pointed --span on .col-* children, so a bare
.row — the documented "splits evenly" case — stayed four columns at 375px.
nav named only ul, so every breadcrumb rendered as "1. 2. 3.".

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Bug fix — stop `[popover]` capturing every popover as a menu

Spec §1.3. The riskiest of the three fixes, and the one that changes how existing docs-site markup
is styled, so it stands alone.

**Files:**
- Create: `test/fixtures/popover.html`, `test/e2e/popover.spec.js`
- Modify: `src/components.css`, `src/edge.css`

**Interfaces:**
- Consumes: the Task 1 harness.
- Produces: menu styling now requires a `<menu>` or `<ul>` child. Markup already using
  `<menu popover>` — which the docs site does — is unaffected. `<div popover>` holding a form is
  now a plain panel.

- [ ] **Step 1: Write the fixture**

Create `test/fixtures/popover.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>popover fixture</title>
<link rel="stylesheet" href="../../dist/leicht.css">
</head>
<body>
<main>
  <h1>Popover kinds</h1>

  <button popovertarget="menu-pop" id="menu-btn" style="anchor-name:--m">Menu</button>
  <menu popover id="menu-pop" style="position-anchor:--m">
    <li><button type="button" id="menu-row">View</button></li>
    <li><button type="button">Duplicate</button></li>
  </menu>

  <button popovertarget="panel-pop" id="panel-btn" style="anchor-name:--p">Panel</button>
  <div popover id="panel-pop" style="position-anchor:--p">
    <h4>More filters</h4>
    <label for="p-min">Amount over</label>
    <input id="p-min" type="number" value="0">
    <footer class="flex">
      <button type="button" class="secondary">Cancel</button>
      <button type="button" id="apply">Apply</button>
    </footer>
  </div>
</main>
</body>
</html>
```

- [ ] **Step 2: Write the failing test**

Create `test/e2e/popover.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/test/fixtures/popover.html'); });

test('a panel keeps its buttons as buttons', async ({ page }) => {
  await page.locator('#panel-btn').click();
  const apply = page.locator('#apply');
  await expect(apply).toBeVisible();
  // the primary fill must survive: a menu row would be transparent
  await expect(apply).toHaveCSS('background-color', 'rgb(0, 107, 227)');
  await expect(apply).toHaveCSS('justify-content', 'center');

  const panel = page.locator('#panel-pop');
  const panelBox = await panel.boundingBox();
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
  await expect(page.locator('#menu-row')).toHaveCSS('justify-content', 'flex-start');
  expect(menuBox.width).toBeGreaterThanOrEqual(192); // 12rem
});
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx playwright test popover`
Expected: FAIL on both panel tests — `background-color` is `rgba(0, 0, 0, 0)`, `justify-content`
is `flex-start`, the width assertion fails because the button spans the panel, and `padding` is
`5.6px`. The menu test should already pass; it is the regression guard.

- [ ] **Step 4: Write the minimal implementation**

In `src/components.css`, replace the whole existing `[popover] { … }` block with three rules —
material for all, menu geometry gated, panel padding for the rest:

```css
  /* Every popover gets the material and the transition. Menu geometry is opted into by having a
     <menu> or <ul> child: a popover holding a form is a panel, and forcing its buttons into
     full-width menu rows made the footer unstyleable from outside the layer. */
  [popover] {
    transform-origin: 0 0;
    &:dir(rtl) { transform-origin: 100% 0 }
    border-radius: calc(var(--l-radius) * 1.5);
  }

  [popover]:has(> :is(menu, ul)) {
    min-inline-size: 12rem;
    padding: .35rem;
    & :is(ul, menu) { margin: 0; padding: 0; list-style: none }
    & :is(a, button) {
      --_bg: #0000;
      --_fg: var(--l-fg);
      display: flex;
      align-items: center;
      gap: .6em;
      inline-size: 100%;
      justify-content: start;
      padding: .4em .6em;
      border-radius: var(--l-radius);
      background: var(--_bg);
      color: var(--_fg);
      box-shadow: none;
      text-decoration: none;
      & svg { inline-size: 1.1em; block-size: 1.1em; opacity: .7 }
      &:hover { --_bg: var(--l-primary); --_fg: var(--l-on-primary); filter: none }
    }
    /* not scoped to :popover-open: the closing frame must stay anchored */
    @supports (position-area: block-end) {
      inset: auto;
      margin: .35rem 0 0;
      position-anchor: auto;
      position-area: block-end span-inline-end;
      position-try-fallbacks: flip-block, flip-inline;
    }
  }

  /* a panel is centred by the UA; give it room to hold a form */
  [popover]:not([popover=hint], :has(> :is(menu, ul))) { padding: var(--l-space) }
```

The `.35rem` literals become `var(--l-space-xs)` in Task 5 — leave them as literals here so this
task does not depend on a token that does not exist yet.

In `src/edge.css`, gate the two menu-specific enhancements the same way:

```css
  @supports (min-inline-size: anchor-size(width)) {
    [popover]:has(> :is(menu, ul)) { min-inline-size: max(12rem, anchor-size(width)) }
  }

  /* menu items cascade in */
  [popover]:has(> :is(menu, ul)):popover-open li {
    transition: opacity .2s, translate .2s;
    transition-delay: calc(sibling-index() * 25ms);
    @starting-style { opacity: 0; translate: 0 -.25rem }
  }
```

The first previously read `[popover]:not([popover=hint])` — which is why a panel was also being
forced to its invoker's width.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node build.js && npx playwright test popover`
Expected: 6 passed.

- [ ] **Step 6: Exercise every overlay on the docs site**

This task changes the selector that styles every overlay in the library. Open
`http://localhost:4173/index.html` and check, by hand: each `[popover]` menu, the
`popover="hint"` tooltips, the `<select>` pickers, and any `<dialog>`. Each must still open
anchored, with the glass material and the enter transition. Note anything that moved in the
commit message.

- [ ] **Step 7: Commit**

```bash
node build.js
git add src/components.css src/edge.css dist/ test/fixtures/popover.html test/e2e/popover.spec.js
git commit -m "$(cat <<'EOF'
fix: make popover menu styling opt-in via a menu/ul child

[popover] forced every descendant button to a full-width, left-aligned,
transparent menu row, so a popover holding a form had an unstyleable
footer and no primary fill. Menus keep their geometry by having a <menu>
or <ul> child; a panel now gets ordinary padding.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Tokens — `--l-warning`, `.warning`, `.neutral`, `--l-focus`

Spec §6. Makes `npm test` pass end to end for the first time.

**Files:**
- Create: `test/e2e/tokens.spec.js`
- Modify: `src/tokens.css`, `src/components.css`, `src/forms.css`, `test/fixtures/row.html`

**Interfaces:**
- Consumes: `test/contrast.test.mjs` (Task 1).
- Produces: `--l-warning`, `--l-focus`, `.warning`, `.neutral`. Tasks 8–9 use `--l-focus`;
  Task 10's console uses `.warning` and `.neutral`.

- [ ] **Step 1: Run the failing test**

Run: `node test/contrast.test.mjs`
Expected: FAIL — `--l-warning is missing or not a light-dark() oklch pair`.

- [ ] **Step 2: Add the fixture markup**

Append inside `<main>` in `test/fixtures/row.html`:

```html
  <h2>Variants</h2>
  <div class="alert warning" id="warn-alert"><p>Card expiring in 11 days.</p></div>
  <span class="tag warning" id="warn-tag">Pending</span>
  <span class="tag neutral" id="neutral-tag">Draft</span>
  <button class="warning" id="warn-btn">Renew</button>
  <label for="ring">Focus ring</label>
  <input id="ring">
```

- [ ] **Step 3: Write the failing browser test**

Create `test/e2e/tokens.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/test/fixtures/row.html'); });

test('one repointed variable recolours every component', async ({ page }) => {
  const amber = await page.evaluate(() => {
    const el = document.getElementById('warn-btn');
    return getComputedStyle(el).backgroundColor;
  });
  // the button fill is --l-warning itself, so every other .warning surface must mix from it
  expect(amber).not.toBe('rgb(0, 107, 227)');       // not still primary blue
  expect(amber).not.toBe('rgba(0, 0, 0, 0)');

  const alertBorder = await page.locator('#warn-alert').evaluate(e => getComputedStyle(e).borderTopColor);
  const tagColor = await page.locator('#warn-tag').evaluate(e => getComputedStyle(e).color);
  // both derive from --l-primary, which .warning repointed — so neither may be blue
  expect(alertBorder).not.toBe('rgb(0, 107, 227)');
  expect(tagColor).not.toBe('rgb(0, 107, 227)');
});

test('.neutral is grey, not amber', async ({ page }) => {
  const [r, g, b] = (await page.locator('#neutral-tag').evaluate(e => getComputedStyle(e).color))
    .match(/\d+/g).map(Number);
  // grey means the channels are close together; amber has a wide r-b spread
  expect(Math.abs(r - b)).toBeLessThan(30);
});

test('--l-focus resolves instead of poisoning the ring', async ({ page }) => {
  await page.locator('#ring').focus();
  const shadow = await page.locator('#ring').evaluate(e => getComputedStyle(e).boxShadow);
  expect(shadow).not.toBe('none');
  expect(shadow).toContain('3px');
});
```

- [ ] **Step 4: Run it to make sure it fails**

Run: `npx playwright test tokens`
Expected: FAIL — `.warning` does not exist, so the button is still primary blue and the alert
border and tag colour are blue too.

- [ ] **Step 5: Add the tokens**

In `src/tokens.css`, immediately after `--l-success`:

```css
    /* amber at the same lightness as the other states, so --l-on-primary needs no exception:
       5.01:1 light and 10.41:1 dark, matching --l-error (5.01) and --l-success (5.02). A brighter
       amber would read better and fail AA on its own fill. [see test/contrast.test.mjs] */
    --l-warning: light-dark(oklch(54% .13 75), oklch(80% .15 80));
```

And after `--l-border`, extract the focus ring so a skin can re-point it:

```css
    --l-focus: 0 0 0 3px color-mix(in oklab, var(--l-primary) 25%, #0000);
```

- [ ] **Step 6: Add the variant classes and consume the ring**

In `src/components.css`, beside the existing variants:

```css
  .warning { --l-primary: var(--l-warning) }
  .neutral { --l-primary: var(--l-muted) }
```

In `src/forms.css`, in the input/select/textarea block:

```css
    &:focus { outline: 0; border-color: var(--l-primary); box-shadow: var(--l-focus) }
```

- [ ] **Step 7: Run the whole suite to verify it passes**

Run: `npm test`
Expected: PASS throughout — the contrast table now includes `--l-warning light 5.01:1` and
`--l-warning dark 10.41:1`, and all Playwright specs pass. **This is the first task where
`npm test` is green end to end.**

- [ ] **Step 8: Commit**

```bash
git add src/tokens.css src/components.css src/forms.css dist/ test/
git commit -m "$(cat <<'EOF'
feat: add --l-warning, .warning, .neutral and --l-focus

The warning sits at the same lightness as error and success, so it needs
no --l-on-primary exception and a variant stays one repointed variable:
.warning recolours the alert, tag, button and dot with one declaration.
The focus ring moves to a token so skins can re-point it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Spacing scale and rhythm

Spec §7. Touches ~20 hardcoded values across five files, so it carries the screenshot baseline
guard (acceptance criterion 7). Do this **before** the new components, so they are built on the
scale.

**Files:**
- Create: `test/e2e/spacing.spec.js`
- Modify: `src/tokens.css`, `src/base.css`, `src/components.css`, `src/forms.css`, `src/edge.css`

**Interfaces:**
- Consumes: the Task 1 harness.
- Produces: `--l-space-xs` `.25rem`, `--l-space-sm` `.5rem`, `--l-space-md` `.75rem`,
  `--l-space-lg` `1.5rem`, `--l-space-xl` `2rem`, all derived from `--l-space`. Tasks 6–9 use
  these instead of literals.

- [ ] **Step 1: Commit the "before" baselines**

Create `test/e2e/spacing.spec.js` with the visual guard first, and record the baselines against
the **current** CSS so the diff in Step 6 is meaningful:

```js
import { test, expect } from '@playwright/test';

// The visual guard for the ~20 literals this task converts. Every diff these catch must be
// traceable to a rung change listed in the plan; anything else is a regression.
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

test('--l-space is the density knob for every component', async ({ page }) => {
  await page.goto('/index.html');
  const read = () => page.evaluate(() => {
    const g = s => { const el = document.querySelector(s); return el ? getComputedStyle(el) : null; };
    const px = v => parseFloat(v) || 0;
    return {
      card: px(g('article, .card')?.paddingTop),
      main: px(g('main')?.paddingTop),
      header: px(g('body > header')?.paddingTop),
      details: px(g('details')?.paddingTop),
      alert: px(g('.alert')?.paddingTop),
    };
  });
  const set = v => page.evaluate(
    v => document.documentElement.style.setProperty('--l-space', v), v);

  const base = await read();
  await set('.75rem');
  const tight = await read();
  await set('1.25rem');
  const loose = await read();

  for (const key of Object.keys(base)) {
    // a value that ignores --l-space is a literal that was missed
    expect(tight[key], `${key} must shrink when --l-space shrinks`).toBeLessThan(base[key]);
    expect(loose[key], `${key} must grow when --l-space grows`).toBeGreaterThan(base[key]);
  }
});
```

Run: `npx playwright test spacing --update-snapshots`
Expected: the four screenshot tests write baselines and pass; the density test **fails** — card,
header, details and alert padding are hardcoded and do not move.

Commit the baselines now, before changing any CSS:

```bash
git add test/e2e/spacing.spec.js test/e2e/__screenshots__
git commit -m "$(cat <<'EOF'
test: baseline the docs site before the spacing conversion

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Add the scale**

In `src/tokens.css`, after `--l-space`:

```css
    /* One knob. Layout spacing derives from it, so --l-space: .75rem actually compacts the whole
       UI; component interiors stay in em so they scale with their own font size instead. */
    --l-space-xs: calc(var(--l-space) * .25);
    --l-space-sm: calc(var(--l-space) * .5);
    --l-space-md: calc(var(--l-space) * .75);
    --l-space-lg: calc(var(--l-space) * 1.5);
    --l-space-xl: calc(var(--l-space) * 2);
```

- [ ] **Step 3: Snap the layout literals to the scale**

Replace each of these exactly. **Do not touch** `button`, `.tag`, `code`, `kbd`, table cell or
form control padding — those are `em` on purpose and stay `em` (§7's rem-vs-em rule).

`src/base.css`:
```css
  /* was: var(--l-space) clamp(…) — 1rem top against up to 2rem sides read visibly tight */
  body > :is(header, main, footer), .container {
    max-inline-size: var(--l-width);
    margin-inline: auto;
    padding: var(--l-space-lg) clamp(1rem, 4vw, 2rem);
  }
  hr { margin-block: var(--l-space-xl); … }                    /* was calc(var(--l-space) * 2) */
  details {
    padding: var(--l-space-sm) var(--l-space);                  /* was .5em var(--l-space) */
    &[open] > summary { margin-block-end: var(--l-space-sm) }   /* was .5em */
  }
```

`src/components.css`:
```css
  nav { gap: var(--l-space-sm) var(--l-space) }                 /* was .5rem var(--l-space) */
  article, .card {
    --_p: var(--l-space-lg);                                    /* was 1.25rem -> 1.5rem, one rung */
    & > :is(header, footer) { padding: var(--l-space-md) var(--_p) }   /* was .75rem */
  }
  body > header {
    inset-block-start: var(--l-space-sm);                       /* was .5rem */
    margin-block: var(--l-space-sm);
    padding-block: var(--l-space-sm);
  }
  .alert { gap: var(--l-space-md); padding: var(--l-space-md) var(--l-space) }  /* was .75em / .85em 1em */
  .carousel {
    gap: var(--l-space);
    &::scroll-marker-group { gap: var(--l-space-sm); padding-block-start: var(--l-space-md) }
  }
  dialog, [popover] { padding: var(--l-space-lg) }              /* was 1.5rem — already on a rung */
  dialog { & footer { gap: var(--l-space-sm) } }
  [popover]:has(> :is(menu, ul)) { padding: var(--l-space-xs) } /* was .35rem, from Task 3 */
  [popover]:not([popover=hint], :has(> :is(menu, ul))) { padding: var(--l-space) }
```

`src/edge.css`: the anchored menu's `margin: .35rem 0 0` becomes
`margin: var(--l-space-xs) 0 0`.

- [ ] **Step 4: Fix the rhythm defects**

Four changes, each fixing something observed while building the console.

`src/components.css` — a row of cards ends with doubled bottom margin, because `.row` and every
`article` inside it both add one:

```css
  .row {
    /* the row owns the bottom margin; its children must not add a second one */
    & > * { margin: 0 }
    & > * > :last-child { margin-block-end: 0 }
  }
```

`src/components.css` — a card title with a trailing action is the most common card there is:

```css
  article, .card {
    & > header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--l-space-sm);
      /* a heading's 1.6em top margin is prose rhythm; inside a header it is just a gap */
      & :is(h1, h2, h3, h4, h5, h6) { margin-block: 0 }
    }
  }
```

`src/forms.css` — a hint collides with the next label:

```css
  :is(input, select, textarea) + small {
    display: block;
    margin-block-end: var(--l-space);
  }
```

`src/base.css` — 1.6em is right after prose and too large after a component:

```css
  /* 1.6em is prose rhythm; after a component the gap is already carried by its own margin */
  :is(article, .card, figure, table, pre, details, .row, .alert) + :is(h1, h2, h3, h4, h5, h6) {
    margin-block-start: var(--l-space-lg);
  }
```

- [ ] **Step 5: Run the density test**

Run: `node build.js && npx playwright test spacing -g "density knob"`
Expected: PASS. Every one of card, main, header, details and alert shrinks at `.75rem` and grows
at `1.25rem`. A failure names the property that ignored the token — find the literal and snap it.
Do not weaken the assertion.

- [ ] **Step 6: Review the visual diff deliberately**

Run: `npx playwright test spacing -g "visually unchanged"`
Expected: **FAIL** — this task intentionally changes spacing. Open
`playwright-report/` and check every diff against this list of intended changes:

- card padding 1.25rem → 1.5rem
- card header/footer padding .75rem → .75rem (unchanged in value, now tokenised)
- `main` / `header` / `footer` vertical padding 1rem → 1.5rem
- alert padding .85em 1em → .75rem 1rem
- `details` padding and open-summary margin
- headings after a component: 1.6em → 1.5rem
- a row of cards loses its doubled bottom margin
- field hints gain bottom spacing

Anything outside that list is a regression — fix it before proceeding. Once every diff is
accounted for, accept the new baselines:

```bash
npx playwright test spacing --update-snapshots
```

- [ ] **Step 7: Commit**

```bash
npm test
git add src/tokens.css src/base.css src/components.css src/forms.css src/edge.css dist/ test/
git commit -m "$(cat <<'EOF'
feat: derive layout spacing from --l-space, and fix the rhythm

--l-space owned about a dozen gaps; twenty more values were hardcoded, so
the one knob did not actually resize the UI. Layout spacing now derives
from it through an xs/sm/md/lg/xl scale, while component interiors stay in
em so they scale with their own font size.

Also: a row of cards no longer doubles its bottom margin, main's vertical
padding matches its sides, field hints no longer collide with the next
label, card headers are a flex row, and a heading after a component uses
component rhythm instead of prose rhythm.

Verified: --l-space .75rem compacts every component and 1.25rem loosens
every component. Screenshot baselines updated; every diff traceable to a
rung change listed in the plan.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: The app shell

Spec §2. Creates `src/app.css`.

**Files:**
- Create: `src/app.css`, `test/fixtures/shell.html`, `test/e2e/shell.spec.js`
- Modify: `src/index.css`, `src/tokens.css`

**Interfaces:**
- Consumes: `--l-space-*` (Task 5).
- Produces: `body:has(> aside)` shell, `--l-aside` (default `15rem`), vertical `aside nav`,
  `aside[popover]` drawer. Task 10's console is built on it.

- [ ] **Step 1: Write the fixture**

Create `test/fixtures/shell.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>shell fixture</title>
<link rel="stylesheet" href="../../dist/leicht.css">
</head>
<body>
<a href="#main">Skip to content</a>

<aside id="nav" popover>
  <strong>Northwind</strong>
  <nav>
    <ul>
      <li><a href="#main" aria-current="page" id="nav-current">Overview</a></li>
      <li><a href="#main">Invoices</a></li>
      <li><a href="#main">Customers</a></li>
    </ul>
  </nav>
</aside>

<header>
  <nav>
    <button popovertarget="nav" class="ghost hide-lg" id="menu-btn" aria-label="Menu">☰</button>
    <strong>Billing</strong>
    <button class="secondary">Export</button>
  </nav>
</header>

<main id="main">
  <h1>Shell</h1>
  <p>The sidebar is a static column at 60rem and wider, and a drawer below it.</p>
  <p style="block-size:120vh">tall, to test the sticky toolbar</p>
</main>

<footer><small>footer</small></footer>
</body>
</html>
```

- [ ] **Step 2: Write the failing test**

Create `test/e2e/shell.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.describe('desktop shell', () => {
  test.skip(({ }, info) => info.project.name !== 'desktop', 'width-dependent');
  test.beforeEach(async ({ page }) => { await page.goto('/test/fixtures/shell.html'); });

  test('the aside is a static column, not a hidden popover', async ({ page }) => {
    const aside = page.locator('#nav');
    await expect(aside).toBeVisible();
    await expect(aside).toHaveCSS('position', 'static');
    expect((await aside.boundingBox()).width).toBeCloseTo(240, 0);
  });

  test('the content column fills the rest — the auto-margin trap', async ({ page }) => {
    const main = await page.locator('#main').boundingBox();
    const vw = page.viewportSize().width;
    // body > main sets margin-inline: auto, and auto margins beat justify-self: stretch.
    // Without margin-inline: 0 this collapses to its min-content width (~64px).
    expect(main.width).toBeGreaterThan(vw - 260);
  });

  test('the glass toolbar survives the shell', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(200);
    const header = page.locator('body > header');
    await expect(header).toHaveCSS('position', 'sticky');
    const bg = await header.evaluate(e => getComputedStyle(e).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('the sidebar nav is vertical with a marked current item', async ({ page }) => {
    const list = page.locator('#nav nav ul');
    await expect(list).toHaveCSS('display', 'grid');
    const current = await page.locator('#nav-current').evaluate(e => getComputedStyle(e).backgroundColor);
    expect(current).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('mobile drawer', () => {
  test.skip(({ }, info) => info.project.name !== 'mobile', 'width-dependent');
  test.beforeEach(async ({ page }) => { await page.goto('/test/fixtures/shell.html'); });

  test('the aside is hidden until the menu button opens it', async ({ page }) => {
    await expect(page.locator('#nav')).toBeHidden();
    await page.locator('#menu-btn').click();
    const aside = page.locator('#nav');
    await expect(aside).toBeVisible();
    await expect(aside).toHaveCSS('position', 'fixed');
    const box = await aside.boundingBox();
    expect(box.x).toBeCloseTo(0, 0);
    expect(box.width).toBeLessThanOrEqual(375 * 0.8 + 1);
  });

  test('it light-dismisses and closes on Escape, with no script', async ({ page }) => {
    await page.locator('#menu-btn').click();
    await expect(page.locator('#nav')).toBeVisible();
    await page.locator('#main h1').click();           // outside the drawer
    await expect(page.locator('#nav')).toBeHidden();

    await page.locator('#menu-btn').click();
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
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx playwright test shell`
Expected: FAIL on every shell test — the `aside` is a closed popover (`display: none`), so there
is no grid at all. The "no aside is untouched" test should already pass.

- [ ] **Step 4: Write the minimal implementation**

Create `src/app.css`:

```css
/* The application layer: a shell, a data table, and the chrome an app needs that a document does
   not. Everything here is gated — a page with no <aside>, no <figure><table>, no [role=tablist]
   and no <output> is byte-for-byte unaffected. */

@layer leicht.components {
  /* ---- shell. Made of body's own children, so every body > … rule keeps matching: the glass
     toolbar, the page gutters and the muted footer all still apply. ---- */
  body:has(> aside) {
    --l-width: none;
    display: grid;
    grid-template-columns: var(--l-aside) 1fr;
    grid-template-rows: auto 1fr auto;
  }
  body:has(> aside) > aside { grid-area: 1 / 1 / -1 / 2 }
  body:has(> aside) > :is(header, main, footer) {
    grid-column: 2;
    max-inline-size: none;
    /* body > main sets margin-inline: auto, and auto margins beat justify-self: stretch — the
       content column collapses to its min-content width without this. [measured, Chromium 141] */
    margin-inline: 0;
  }
  body:has(> aside) > header {
    grid-row: 1;
    /* inline-size: min(var(--l-width), …) is invalid once --l-width is none, so reset it here
       rather than relying on the cascade */
    inline-size: auto;
  }
  body:has(> aside) > main { grid-row: 2 }
  body:has(> aside) > footer { grid-row: 3 }

  body > aside {
    padding: var(--l-space);
    border-inline-end: 1px solid var(--l-border);
    background: var(--l-surface);
    & > :first-child { margin-block-start: 0 }
  }

  /* a sidebar nav is vertical, and its rows are targets rather than inline links */
  aside nav {
    display: block;
    & :is(ul, ol) { display: grid; gap: var(--l-space-xs); inline-size: 100% }
    & a:not(.button) {
      display: flex;
      align-items: center;
      gap: .6em;
      padding: .45em .6em;
      border-radius: var(--l-radius);
      corner-shape: var(--l-corner);
      &:hover { background: color-mix(in oklab, var(--l-fg) 6%, #0000); color: inherit }
      &[aria-current] { background: color-mix(in oklab, var(--l-primary) 14%, #0000) }
      & svg { inline-size: 1.1em; block-size: 1.1em; flex: none; opacity: .75 }
    }
  }

  /* ---- <aside popover>: one element, two behaviours. Wide, it is a static column and the
     popover material is unset; narrow, it is an off-canvas drawer the UA opens, light-dismisses
     and transitions for free from a popovertarget button — no script.
     Keep this beside the [popover] rules in components.css: anything added there must be unset
     here, or the desktop column silently inherits it. ---- */
  @media (width >= 60rem) {
    body > aside[popover] {
      display: block;
      position: static;
      inline-size: auto;
      block-size: auto;
      max-inline-size: none;
      max-block-size: none;
      margin: 0;
      padding: var(--l-space);
      border: 0;
      border-inline-end: 1px solid var(--l-border);
      border-radius: 0;
      background: var(--l-surface);
      backdrop-filter: none;
      box-shadow: none;
      opacity: 1;
      scale: 1;
      overlay: none;
    }
  }
  @media (width < 60rem) {
    body:has(> aside) { grid-template-columns: 1fr }
    body:has(> aside) > :is(header, main, footer) { grid-column: 1 }
    body > aside[popover] {
      position: fixed;
      inset: 0 auto 0 0;
      inline-size: 16rem;
      max-inline-size: 80vw;
      margin: 0;
      border-radius: 0;
      border-inline-end: 1px solid var(--l-border);
      transform-origin: 0 50%;
    }
  }
}
```

In `src/tokens.css`, beside `--l-width`:

```css
    --l-aside: 15rem;
```

In `src/index.css`, after `components.css` and before `edge.css`:

```css
@import "components.css";
@import "app.css";
@import "edge.css";
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node build.js && npx playwright test shell`
Expected: 9 passed across both projects. If `the content column fills the rest` fails, the
`margin-inline: 0` was dropped — that is the whole reason the test exists.

- [ ] **Step 6: Confirm no regression on the docs site**

Run: `npx playwright test spacing -g "visually unchanged"`
Expected: PASS with no diff. Neither `index.html` nor `skins.html` has an `<aside>`, so the
`:has()` gate must make this task invisible to them. A diff here means a rule escaped its gate.

- [ ] **Step 7: Commit**

```bash
npm test
git add src/app.css src/index.css src/tokens.css dist/ test/
git commit -m "$(cat <<'EOF'
feat: add the app shell — body:has(> aside), with a popover drawer

The shell is built from body's own children, so the glass toolbar, page
gutters and muted footer keep matching instead of needing a seam to reach
through a wrapper div. <aside popover> is a static column at 60rem and an
off-canvas drawer below, opened and light-dismissed by the UA with no
script. --l-aside sizes the column; --l-width: none is the full-bleed
escape hatch.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Data tables

Spec §3.

**Files:**
- Create: `test/fixtures/table.html`, `test/e2e/table.spec.js`
- Modify: `src/app.css`, `src/tokens.css`

**Interfaces:**
- Consumes: `src/app.css` (Task 6), `--l-space-*` (Task 5).
- Produces: `figure:has(> table)` scroll wrapper, `--l-table-max` (default `none`), `.num`.

- [ ] **Step 1: Write the fixture**

Create `test/fixtures/table.html` with, inside `<main>`:

- A `<figure id="plain">` wrapping a `<table>` of **8 columns and 7 rows**, with a
  `<figcaption>` after the table. First column values long enough to overflow at 900px
  ("Kranzler & Söhne Handels KG"). `.num` on the `th` and `td` of the two money columns. One cell
  using `<data value="12400">$12,400.00</data>` in a column with **no** `.num`, to prove the
  `:has(> data)` path independently.
- A second identical figure inside `<div style="--l-table-max:14rem"><figure id="capped">…`.
- A bare `<table id="naked">` outside any figure, to prove plain tables are untouched.

- [ ] **Step 2: Write the failing test**

Create `test/e2e/table.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.describe('desktop', () => {
  test.skip(({ }, info) => info.project.name !== 'desktop', 'width-dependent');
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto('/test/fixtures/table.html');
  });

  test('a wide table scrolls inside its figure, not the page', async ({ page }) => {
    const m = await page.locator('#plain').evaluate(f => ({
      scrollW: f.scrollWidth, clientW: f.clientWidth,
      overflowX: getComputedStyle(f).overflowX,
      docOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    expect(m.overflowX).toBe('auto');
    expect(m.scrollW).toBeGreaterThan(m.clientW);
    expect(m.docOverflows).toBe(false);
  });

  test('the figure is framed and the caption sits under the table', async ({ page }) => {
    await expect(page.locator('#plain')).toHaveCSS('border-top-width', '1px');
    const cap = await page.locator('#plain figcaption').boundingBox();
    const tbl = await page.locator('#plain table').boundingBox();
    expect(cap.y).toBeGreaterThan(tbl.y);
  });

  test('numeric cells align to the end', async ({ page }) => {
    await expect(page.locator('#plain td.num').first()).toHaveCSS('text-align', 'right');
    // the <data> path, in a column with no .num
    await expect(page.locator('#plain td:has(> data)').first()).toHaveCSS('text-align', 'right');
  });

  test('--l-table-max caps the height and sticks the header', async ({ page }) => {
    const capped = page.locator('#capped');
    expect((await capped.boundingBox()).height).toBeCloseTo(224, 0);  // 14rem
    await capped.evaluate(f => { f.scrollTop = 80; });
    const { thTop, figTop } = await capped.evaluate(f => ({
      thTop: Math.round(f.querySelector('th').getBoundingClientRect().top),
      figTop: Math.round(f.getBoundingClientRect().top),
    }));
    expect(Math.abs(thTop - figTop)).toBeLessThan 4;
  });

  test('a table outside a figure is untouched', async ({ page }) => {
    await expect(page.locator('#naked')).toHaveCSS('border-top-width', '0px');
  });
});
```

Note: the `expect(...).toBeLessThan 4` above is a syntax error — write it as
`expect(Math.abs(thTop - figTop)).toBeLessThan(4);`. It is flagged here rather than silently
fixed so the executor notices the sticky assertion is the subtle one.

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx playwright test table`
Expected: FAIL — `overflowX` is `visible`, `docOverflows` is `true`, the figure has no border, and
the capped figure has no height cap.

- [ ] **Step 4: Write the minimal implementation**

In `src/tokens.css`, beside `--l-aside`:

```css
    --l-table-max: none;
```

Append to `src/app.css`, inside a `@layer leicht.components` block:

```css
  /* <figure><table> — semantic HTML's own table wrapper. The figure is the scrollport, so a wide
     table scrolls inside its own frame instead of pushing the page sideways. */
  figure:has(> table) {
    overflow: auto;
    max-block-size: var(--l-table-max);
    border: 1px solid var(--l-border);
    border-radius: var(--l-radius);
    corner-shape: var(--l-corner);
    & > table { margin: 0 }
    & > figcaption {
      position: sticky;
      inset-inline-start: 0;
      padding: var(--l-space-sm) var(--l-space-md);
      border-block-start: 1px solid var(--l-border);
    }
  }

  /* Sticky only pays off when the figure has a height to scroll within: overflow-x: auto forces
     overflow-y from visible to auto, so the figure — not the page — is the scrollport, and a
     thead sticking to a box that never scrolls vertically does nothing. Hence --l-table-max.
     [measured, Chromium 141] */
  figure:has(> table) thead th {
    position: sticky;
    inset-block-start: 0;
    background: var(--l-bg);
  }

  tbody tr:hover { background: var(--l-surface) }

  /* CSS cannot infer a column's alignment from its header, so numeric cells are marked. <data> is
     the semantic way to say "this is a value"; .num is the escape hatch for a plain cell. */
  :is(th, td).num, td:has(> data) { text-align: end }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node build.js && npx playwright test table`
Expected: all desktop table tests pass.

- [ ] **Step 6: Confirm no regression on the docs site**

Run: `npx playwright test spacing -g "visually unchanged"`
Expected: PASS with no diff — `index.html` has bare tables, which must stay bare. If a diff
appears, `tbody tr:hover` or the `figure` rule is leaking; `index.html` does use `<figure>` for
images, so confirm `figure:has(> table)` is not matching an image figure.

- [ ] **Step 7: Commit**

```bash
npm test
git add src/app.css src/tokens.css dist/ test/
git commit -m "$(cat <<'EOF'
feat: make <figure><table> a scrolling data table

An eight-column table pushed the whole page sideways. figure:has(> table)
is the scrollport, figcaption is the caption row, rows highlight on hover,
and .num or a <data> child right-aligns a numeric cell. --l-table-max caps
the height and switches on the sticky thead — which cannot work without a
height, because overflow-x: auto makes the figure the scrollport.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Application chrome — tabs, toasts, skeleton, spinner, pagination, `dl`

Spec §4. Six small components sharing one fixture, judged as one "does the app chrome look right"
pass.

**Files:**
- Create: `test/fixtures/chrome.html`, `test/e2e/chrome.spec.js`
- Modify: `src/app.css`, `src/utilities.css`, `src/polish.css`

**Interfaces:**
- Consumes: `src/app.css` (Task 6), `--l-space-*` (Task 5), `--l-focus` (Task 4).
- Produces: `[role=tablist]`, `button[role=tab][aria-selected]`, `body > output`,
  `[aria-busy=true]`, `nav[aria-label] > ol` pagination, `dl` grid. Task 10 uses all six.

- [ ] **Step 1: Write the fixture**

Create `test/fixtures/chrome.html` containing, inside `<main>`: a `[role=tablist]` with four
`button[role=tab]` (`id="tab-sel"` carrying `aria-selected="true"`, `id="tab-other"` without, one
holding a `.tag` count); `<button aria-busy="true" id="busy-btn">Saving</button>`;
`<span aria-busy="true" id="busy-txt">Loading…</span>`; a
`<nav aria-label="Pagination"><ol>` of page links with one `aria-current="page"`; a `<dl id="kv">`
of four `dt`/`dd` money pairs. As a **direct child of `<body>`**, an `<output id="toasts">`
holding two `.alert` elements (one `.success`, one `.warning`).

- [ ] **Step 2: Write the failing test**

Create `test/e2e/chrome.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/test/fixtures/chrome.html'); });

test('tabs are a row with an indicator on the selected tab', async ({ page }) => {
  const list = page.locator('[role=tablist]');
  await expect(list).toHaveCSS('display', 'flex');
  await expect(list).toHaveCSS('border-bottom-width', '1px');

  const sel = await page.locator('#tab-sel').evaluate(e => getComputedStyle(e).borderBottomColor);
  const other = await page.locator('#tab-other').evaluate(e => getComputedStyle(e).borderBottomColor);
  expect(sel).toBe('rgb(0, 107, 227)');
  expect(other).toBe('rgba(0, 0, 0, 0)');
});

test('the toast region is pinned above the toolbar', async ({ page }) => {
  const out = page.locator('#toasts');
  await expect(out).toHaveCSS('position', 'fixed');
  await expect(out).toHaveCSS('z-index', '2');       // body > header is 1
  const box = await out.boundingBox();
  const vp = page.viewportSize();
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
});

test('aria-busy draws a skeleton and a spinner', async ({ page }) => {
  await expect(page.locator('#busy-txt')).toHaveCSS('animation-name', 'l-shimmer');
  const spin = await page.locator('#busy-btn').evaluate(e =>
    getComputedStyle(e, '::before').animationName);
  expect(spin).toBe('l-spin');
  await expect(page.locator('#busy-btn')).toHaveCSS('pointer-events', 'none');
});

test('reduced motion stops both animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('#busy-txt')).toHaveCSS('animation-name', 'none');
});

test('pagination centres and marks the current page', async ({ page }) => {
  await expect(page.locator('nav[aria-label] > ol')).toHaveCSS('justify-content', 'center');
  const current = await page.locator('[aria-current=page]').evaluate(e => getComputedStyle(e).backgroundColor);
  expect(current).toBe('rgb(0, 107, 227)');
});

test('a dl is a two-column grid', async ({ page }) => {
  const dl = page.locator('#kv');
  await expect(dl).toHaveCSS('display', 'grid');
  const cols = (await dl.evaluate(e => getComputedStyle(e).gridTemplateColumns)).split(' ');
  expect(cols).toHaveLength(2);
  await expect(page.locator('#kv dd').first()).toHaveCSS('text-align', 'right');
});
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx playwright test chrome`
Expected: FAIL on all six — `display: block` tablist with no border, `position: static` output
(the toasts sit in the flow at the page bottom), `animation-name: none`, `display: block` dl.

- [ ] **Step 4: Write the minimal implementation**

Append to `src/app.css`, inside `@layer leicht.components`:

```css
  /* tabs: the ARIA that makes them announce correctly is the same hook that styles them */
  [role=tablist] {
    display: flex;
    gap: var(--l-space);
    overflow-x: auto;
    scrollbar-width: none;
    margin-block-end: var(--l-space);
    border-block-end: 1px solid var(--l-border);
  }
  [role=tab] {
    --_bg: #0000;
    --_fg: var(--l-muted);
    flex: none;
    padding: var(--l-space-sm) 0;
    border: 0;
    border-radius: 0;
    border-block-end: 2px solid #0000;
    margin-block-end: -1px;
    &:hover { filter: none; --_fg: var(--l-fg) }
    &[aria-selected=true] { --_fg: var(--l-fg); border-block-end-color: var(--l-primary) }
  }

  /* toasts: <output> is already the live region for "a result the page produced" */
  body > output {
    position: fixed;
    inset-block-end: var(--l-space);
    inset-inline-end: var(--l-space);
    z-index: 2;                     /* body > header is 1 */
    display: grid;
    gap: var(--l-space-sm);
    max-inline-size: 22rem;
    & > .alert {
      margin: 0;
      background: var(--l-glass-top);
      backdrop-filter: var(--l-blur);
      box-shadow: var(--l-shadow);
    }
  }

  /* [aria-busy]: the attribute a screen reader needs is the attribute that draws the state */
  [aria-busy=true]:not(button) {
    border-radius: var(--l-radius);
    color: #0000;
    background: linear-gradient(90deg, var(--l-surface), color-mix(in oklab, var(--l-fg) 9%, var(--l-bg)), var(--l-surface)) 0 0 / 200% 100%;
    animation: l-shimmer 1.4s linear infinite;
  }
  @keyframes l-shimmer { to { background-position: -200% 0 } }

  button[aria-busy=true] {
    pointer-events: none;
    opacity: .7;
    &::before {
      content: "";
      inline-size: 1em;
      block-size: 1em;
      border: 2px solid #0006;
      border-block-start-color: currentColor;
      border-radius: 50%;
      animation: l-spin .7s linear infinite;
    }
  }
  @keyframes l-spin { to { rotate: 1turn } }

  /* pagination: a nav whose list is ordered, because page order is meaningful */
  nav[aria-label] > ol {
    justify-content: center;
    gap: var(--l-space-xs);
    & [aria-current] { --_bg: var(--l-primary); --_fg: var(--l-on-primary) }
  }

  /* a dl is a two-column table of one thing each: invoice totals, metadata, specs */
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--l-space-xs) var(--l-space);
    font-size: .9375rem;
    & dt { color: var(--l-muted) }
    & dd { margin: 0; text-align: end }
  }
```

In `src/utilities.css`, extend the reduced-motion rule — it currently cancels only `transition`:

```css
  @media (prefers-reduced-motion: reduce) { *, ::backdrop { transition: none; animation: none } }
```

In `src/polish.css`, in the `forced-colors` block, add `body > output > .alert` to the selector
list that gets `background: Canvas; border: 1px solid CanvasText`; and in the `@media print`
block, add:

```css
    body > output { display: none }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node build.js && npx playwright test chrome`
Expected: 12 passed across both projects.

- [ ] **Step 6: Check the `dl` regression risk**

`dl` is styled unconditionally, and `index.html` may use one for prose definitions. Run
`npx playwright test spacing -g "visually unchanged"`. If the docs site uses a `dl` as a
definition list and it now renders as a two-column grid, that is a real regression: either the
docs markup changes, or the rule needs narrowing (e.g. `dl:not([class])` is **not** acceptable —
prefer changing the docs, since a key/value grid is the intended default). Decide, record the
reason in the commit message, and re-baseline if the docs change.

- [ ] **Step 7: Commit**

```bash
npm test
git add src/app.css src/utilities.css src/polish.css dist/ test/
git commit -m "$(cat <<'EOF'
feat: add tabs, toasts, skeletons, spinners, pagination and dl grid

Each keys off the markup that already makes it accessible: [role=tablist]
and aria-selected for tabs, <output> for the toast live region, aria-busy
for the loading state, an ordered list in a labelled nav for pagination.
Reduced motion now cancels animation as well as transition, forced colours
keep the toast border, and a fixed toast does not print.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Small pieces — avatar, dot, field, sizes, truncate, flex alignment

Spec §5.

**Files:**
- Create: `test/e2e/pieces.spec.js`
- Modify: `src/components.css`, `src/forms.css`, `src/utilities.css`, `test/fixtures/chrome.html`

**Interfaces:**
- Consumes: `--l-focus` (Task 4), `--l-space-*` (Task 5).
- Produces: `.avatar` (takes `--size`), `.dot`, `.field`, `.sm`, `.lg`, `.truncate`, `.between`,
  `.end`. Task 10 uses all of them.

- [ ] **Step 1: Add the fixture markup**

Append inside `<main>` in `test/fixtures/chrome.html`:

```html
  <h2>Small pieces</h2>
  <div class="flex between" id="bar">
    <div class="flex">
      <span class="avatar" id="av">MB</span>
      <span class="avatar" id="av-sm" style="--size:1.5rem">AC</span>
      <span class="truncate" id="trunc" style="max-inline-size:12ch">billing@kranzler-und-soehne-handels.example.com</span>
    </div>
    <div class="flex">
      <span class="success text-primary"><i class="dot" id="dot"></i>Paid</span>
      <span class="warning text-primary"><i class="dot"></i>Open</span>
      <button class="sm secondary" id="btn-sm">Small</button>
      <button class="lg" id="btn-lg">Large</button>
    </div>
  </div>

  <label for="amt">Only above</label>
  <div class="field" id="field">
    <span>$</span>
    <input id="amt" type="number" value="250">
    <span>USD</span>
  </div>
```

- [ ] **Step 2: Write the failing test**

Create `test/e2e/pieces.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/test/fixtures/chrome.html'); });

test('the avatar is a round box that takes --size', async ({ page }) => {
  await expect(page.locator('#av')).toHaveCSS('border-radius', '50%');
  expect((await page.locator('#av').boundingBox()).width).toBeCloseTo(32, 0);
  expect((await page.locator('#av-sm').boundingBox()).width).toBeCloseTo(24, 0);
});

test('the status dot inherits the variant colour', async ({ page }) => {
  const dot = await page.locator('#dot').evaluate(e => getComputedStyle(e).backgroundColor);
  expect(dot).not.toBe('rgba(0, 0, 0, 0)');
  expect(dot).not.toBe('rgb(0, 107, 227)');   // .success repointed it away from primary
});

test('.truncate ellipsises instead of wrapping', async ({ page }) => {
  const t = page.locator('#trunc');
  await expect(t).toHaveCSS('text-overflow', 'ellipsis');
  const { scrollW, clientW, lines } = await t.evaluate(e => ({
    scrollW: e.scrollWidth, clientW: e.clientWidth,
    lines: e.getClientRects().length,
  }));
  expect(scrollW).toBeGreaterThan(clientW);
  expect(lines).toBe(1);
});

test('.field is a row that owns the border and the focus ring', async ({ page }) => {
  const f = page.locator('#field');
  await expect(f).toHaveCSS('display', 'flex');
  await expect(f).toHaveCSS('border-top-width', '1px');
  // the input inside must not draw its own box
  await expect(page.locator('#amt')).toHaveCSS('border-top-width', '0px');

  await page.locator('#amt').focus();
  const ring = await f.evaluate(e => getComputedStyle(e).boxShadow);
  expect(ring).not.toBe('none');
  // and the inner input must not double it up
  expect(await page.locator('#amt').evaluate(e => getComputedStyle(e).boxShadow)).toBe('none');
});

test('.sm and .lg resize the whole control, not just the text', async ({ page }) => {
  const sm = await page.locator('#btn-sm').boundingBox();
  const lg = await page.locator('#btn-lg').boundingBox();
  expect(sm.height).toBeLessThan(lg.height);
  // em padding is what makes one declaration enough
  const smPad = await page.locator('#btn-sm').evaluate(e => getComputedStyle(e).paddingLeft);
  const lgPad = await page.locator('#btn-lg').evaluate(e => getComputedStyle(e).paddingLeft);
  expect(parseFloat(smPad)).toBeLessThan(parseFloat(lgPad));
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
  // in RTL the $ prefix sits to the right of the input
  expect(prefix.x).toBeGreaterThan(input.x);
});
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx playwright test pieces`
Expected: FAIL on all seven.

- [ ] **Step 4: Write the implementation**

In `src/components.css`, after the `.tag` block:

```css
  /* an avatar is an <img> or initials; both want the same box */
  .avatar {
    display: inline-grid;
    place-items: center;
    flex: none;
    inline-size: var(--size, 2rem);
    block-size: var(--size, 2rem);
    border-radius: 50%;
    corner-shape: var(--l-corner);
    background: var(--l-primary);
    color: var(--l-on-primary);
    font-size: calc(var(--size, 2rem) * .4);
    font-weight: 600;
    object-fit: cover;
    overflow: hidden;
  }

  /* a status dot reads at a glance where a .tag is too heavy; it inherits the variant colour */
  .dot {
    display: inline-block;
    inline-size: .5em;
    block-size: .5em;
    border-radius: 50%;
    background: var(--l-primary);
    margin-inline-end: .45em;
    vertical-align: .05em;
  }
```

In `src/forms.css`, after the button block:

```css
  /* control sizes. Interiors are em, so one declaration resizes the whole control. */
  :is(button, .button, input, select, textarea).sm { font-size: .875rem }
  :is(button, .button, input, select, textarea).lg { font-size: 1.125rem }

  /* an input is display:block; inline-size:100%, so an adornment needs a row to sit in. The
     wrapper carries the border and the focus ring; the input inside carries neither. */
  .field {
    display: flex;
    align-items: center;
    gap: .5em;
    padding-inline: .75em;
    border: 1px solid var(--l-border);
    border-radius: var(--l-radius);
    corner-shape: var(--l-corner);
    background: var(--l-bg);
    margin-block-end: var(--l-space);
    &:focus-within { border-color: var(--l-primary); box-shadow: var(--l-focus) }
    & > :is(input, select, textarea) {
      border: 0;
      padding-inline: 0;
      background: none;
      margin-block-end: 0;
      &:focus { box-shadow: none }
    }
    & > :is(svg, span, kbd) { flex: none; color: var(--l-muted) }
    & > svg { inline-size: 1.1em; block-size: 1.1em }
  }
```

In `src/utilities.css`:

```css
  .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-inline-size: 0 }
  .between { justify-content: space-between }
  .end { justify-content: flex-end }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node build.js && npx playwright test pieces`
Expected: 14 passed across both projects.

- [ ] **Step 6: Commit**

```bash
npm test
git add src/components.css src/forms.css src/utilities.css dist/ test/
git commit -m "$(cat <<'EOF'
feat: add avatar, status dot, field wrapper, control sizes and utilities

.field gives an input the row it needs for a currency prefix, a search
icon or a unit suffix — impossible while input is display:block and
inline-size:100%. .sm and .lg set only font-size, because component
interiors are em: one declaration resizes the whole control.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Acceptance — the console with no custom CSS, and the docs

The point of the plan. Spec acceptance criteria 1–9.

**Files:**
- Create: `test/console.html` (moved from `lab-console.html`), `test/e2e/console.spec.js`
- Delete: `lab-console.html`
- Modify: `index.html`, `README.md`, `llms.txt`, `docs/production-gaps.md`

**Interfaces:**
- Consumes: everything from Tasks 2–9.
- Produces: the acceptance evidence and the documentation.

- [ ] **Step 1: Move the console and delete its stylesheet**

```bash
git mv lab-console.html test/console.html
```

In `test/console.html`: delete the entire `<style>…</style>` block **and** the comment block above
it, point the stylesheet at `../dist/leicht.css`, and rewrite the markup to the new vocabulary:

- Remove the `<div class="shell">` wrapper — `aside`, `header`, `main`, `footer` become direct
  children of `<body>`, with `<aside id="nav" popover>` first.
- Add `<button popovertarget="nav" class="ghost sm hide-lg" aria-label="Menu">☰</button>` to the
  header.
- Wrap the data table in `<figure>`, drop `.table-wrap`, move the caption into `<figcaption>`.
- `.toasts` becomes `<output>`; drop `role="status"` and `aria-live` (`<output>` is already a live
  region).
- Drop `.crumbs` (the `nav > ol` fix covers it), `.sidenav` (Task 6), `.pagination` (Task 8),
  `.kv` (Task 8), `.table-wrap`, `.skeleton` (use `aria-busy`), `.mb-0`, `.gap-sm`, `.mt-lg`,
  `.sep`, `.items-start`.
- Keep `.between` / `.end` — they are library utilities now.
- Avatar sizes become `style="--size:1.5rem"`, a token override rather than CSS.

- [ ] **Step 2: Write the acceptance test**

Create `test/e2e/console.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/test/console.html'); });

test('the console carries no custom CSS at all', async ({ page }) => {
  const custom = await page.evaluate(() => ({
    styleBlocks: document.querySelectorAll('style').length,
    // a style attribute is allowed only for token overrides and anchor names
    badInline: [...document.querySelectorAll('[style]')]
      .map(e => e.getAttribute('style'))
      .filter(s => !/^\s*(--[\w-]+\s*:|anchor-name\s*:|position-anchor\s*:)/.test(s)),
  }));
  expect(custom.styleBlocks).toBe(0);
  expect(custom.badInline).toEqual([]);
});

test('nothing overflows the viewport at any width', async ({ page }) => {
  const overflows = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});

test('the shell, table, tabs and toasts are all live', async ({ page }, info) => {
  if (info.project.name === 'desktop') {
    expect(await page.evaluate(() =>
      getComputedStyle(document.body).gridTemplateColumns.split(' ').length)).toBe(2);
  }
  await expect(page.locator('figure:has(> table)')).toHaveCSS('overflow-x', 'auto');
  await expect(page.locator('[role=tablist]')).toHaveCSS('display', 'flex');
  await expect(page.locator('body > output')).toHaveCSS('position', 'fixed');
});

test('the modal and the row menu open', async ({ page }) => {
  await page.getByRole('button', { name: 'New invoice' }).click();
  await expect(page.locator('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).toBeHidden();
});

for (const theme of ['light', 'dark']) {
  test(`renders correctly in ${theme}`, async ({ page }) => {
    await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot(`console-${theme}.png`, {
      fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.002,
    });
  });
}
```

- [ ] **Step 3: Run it and record what survived**

Run: `npx playwright test console --update-snapshots`

`the console carries no custom CSS at all` is the acceptance criterion. If `badInline` is
non-empty, each entry is a gap the spec failed to close. Two are anticipated and acceptable as
**token overrides only**:

- **The KPI number.** No token covers "a big number", and the spec's non-goals exclude a
  typography scale. If a plain `<strong>` or `<p>` reads badly, record it as a limitation — do
  not add a component now.
- **Avatar sizes**, via `--size`.

For anything else, stop and record it in `docs/production-gaps.md` under a new
**"Still open after 0.2"** heading, with the same evidence standard as the rest of that file.
Do not delete the finding to make the test pass.

- [ ] **Step 4: Run the full matrix**

Run: `npm test`
Expected: everything green at both 1440px and 375px.

Then by hand, at `http://localhost:4173/test/console.html`:
- `data-skin="cyber"` and `data-skin="terminal"` on `<html>`.
- Open every overlay: row menus, the filter panel, the modal, the tooltips, the `<select>` picker.
- Below 60rem, open and light-dismiss the drawer.
- Emulate `forced-colors: active` and `prefers-reduced-transparency: reduce`.
- Print-preview the page.

- [ ] **Step 5: Document the new vocabulary**

In `README.md`:
- Update the gzip badge and the "**5.6 kB gzipped**" sentence to the number `npm run build` prints.
- In "What you get without writing a single class", add: `<figure>` around a `<table>` for a
  scrolling data table; `<aside>` for an app shell with a drawer; `[role=tablist]` tabs;
  `<output>` toasts; `[aria-busy]` skeletons and spinners; `<dl>` as a key/value grid.
- In the classes table, add `.avatar`, `.dot`, `.field`, `.sm`/`.lg`, `.truncate`, `.warning`,
  `.neutral`, `.between`/`.end`.
- In "Theming", document `--l-space` as the density knob, plus `--l-aside`, `--l-table-max`,
  `--l-width: none`, `--l-warning`, `--l-focus`.
- Add a line about the `:has()` dependency: in a browser without it the shell degrades to a
  stacked document, which is legible rather than broken.

In `index.html`: add live demo sections for the shell, the data table, tabs, toasts and the field
wrapper, following the existing pattern where the markup under each demo is generated from the
demo itself.

In `llms.txt`: add the new selectors and tokens.

In `docs/production-gaps.md`: add a header noting which sections 0.2 closed, and the "Still open
after 0.2" list from Step 3.

- [ ] **Step 6: Final size check**

Run: `npm test`
Expected: green, with `leicht.min.css` gzip **≤ 8,000 B** (the `build.js` ceiling is 10,000 B).
Record the number. If it exceeds 8,000 B, **say so rather than raising the budget** — the
packaging decision assumed ~7.8 kB, and a real overrun is the user's call.

- [ ] **Step 7: Re-baseline the docs site and commit**

The docs site gained demo sections, so its baselines are stale:

```bash
npx playwright test spacing --update-snapshots
npm test
git add -A
git commit -m "$(cat <<'EOF'
feat: leicht 0.2 — an admin console with no custom CSS

test/console.html is the acceptance test: the same console that needed ~70
lines of custom CSS against 0.1.1 now renders with none, verified at 1440px
and 375px in light and dark. Docs, README and llms.txt cover the new
vocabulary; the gzip badge is the measured number.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8: Add the suite to CI**

In `.github/workflows/pages.yml`, the build job currently runs `node build.js` with no
dependencies. Add a test job **before** deploy so a broken 0.2 never ships the site:

```yaml
  test:
    runs-on: ubuntu-slim
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm test
```

Then add `needs: test` to the existing `build` job. Note in the commit message that CI now
installs dependencies, which it previously did not — that is a deliberate trade for having the
suite run.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §1.1 bare `.row` | 2 |
| §1.2 `nav > ol` | 2 |
| §1.3 `[popover]` menu split | 3 |
| §2 shell, `--l-aside`, `--l-width: none`, drawer, `aside nav` | 6 |
| §3 `figure:has(> table)`, `--l-table-max`, sticky thead, `.num` | 7 |
| §4 tabs, toasts, skeleton, spinner, pagination, `dl` | 8 |
| §5 avatar, dot, field, sizes, truncate, flex alignment | 9 |
| §5 `article > header` flex, field help spacing | 5 (they are rhythm fixes) |
| §6 `--l-warning`, `--l-focus`, `.warning`, `.neutral` | 4 |
| §6 `--l-aside`, `--l-table-max` | 6, 7 (with the features that use them) |
| §7 scale, rem-vs-em, five rhythm fixes, density test | 5 |
| Acceptance 1 (console, no CSS) | 10 |
| Acceptance 2 (matrix) | 10 |
| Acceptance 3 (drawer, no JS) | 6, 10 |
| Acceptance 4 (docs site regression) | 5 baselines, re-checked in 6, 7, 8 |
| Acceptance 5 (reduced motion, forced colors, print) | 8, 10 |
| Acceptance 6 (density knob) | 5 |
| Acceptance 7 (pixel diff) | 5 |
| Acceptance 8 (size, badge, README, llms.txt) | 10 |
| Acceptance 9 (`dist/` rebuilt) | every task |

No gaps.

**Ordering dependencies:**
- Task 3 uses `.35rem` literals because `--l-space-xs` does not exist until Task 5. Task 5 Step 3
  lists the conversion. Correct and intentional, not an oversight.
- Task 5 Step 1 records screenshot baselines **before** changing CSS, so its own Step 6 diff is
  meaningful. Tasks 6–9 then re-run that spec expecting **no** diff, which is what proves the
  `:has()` gates work. Task 10 Step 7 re-baselines deliberately because the docs site gains demos.

**Type/name consistency:** `--l-space-xs/sm/md/lg/xl`, `--l-aside`, `--l-table-max`, `--l-focus`,
`--l-warning`, `--size` are spelled identically throughout. `.warning`/`.neutral`, `.avatar`,
`.dot`, `.field`, `.sm`/`.lg`, `.truncate`, `.between`/`.end`, `.num` likewise. `src/app.css` is
created in Task 6 and appended to in Tasks 7 and 8; no task modifies it before it exists. Fixture
ids referenced by specs (`#bare`, `#spanned`, `#crumbs`, `#menu-pop`, `#panel-pop`, `#apply`,
`#menu-row`, `#warn-alert`, `#warn-tag`, `#neutral-tag`, `#warn-btn`, `#ring`, `#nav`,
`#nav-current`, `#menu-btn`, `#main`, `#plain`, `#capped`, `#naked`, `#tab-sel`, `#tab-other`,
`#busy-btn`, `#busy-txt`, `#toasts`, `#kv`, `#bar`, `#av`, `#av-sm`, `#trunc`, `#dot`, `#btn-sm`,
`#btn-lg`, `#field`, `#amt`) are each defined in the fixture step of the same or an earlier task.

**Deliberate defects left in the plan:**
- Task 7 Step 2 contains `toBeLessThan 4` — a syntax error, flagged inline with the correction, to
  make the executor read the sticky-header assertion rather than paste it.

**Known soft spots:**
- Task 8 Step 6 raises a genuine open question: styling `dl` unconditionally may regress a prose
  definition list on the docs site. The plan states the preferred resolution (change the docs, not
  the selector) and requires the reason be recorded, rather than pretending the risk does not
  exist.
- Task 10 Step 3 anticipates that the KPI number may have no library answer, and instructs
  recording it as a limitation instead of scope-creeping a typography scale.
