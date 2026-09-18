// Dependency-free WCAG check for leicht's semantic tokens. No browser needed:
// oklch() -> OKLab -> linear sRGB -> relative luminance -> contrast ratio.
// Validated against Chromium: --l-primary light is 4.86:1, the figure the README publishes.
//
// This script reports ~0.03 higher than a canvas pixel readback for the saturated tokens (error
// 5.03 vs 5.01, success 5.06 vs 5.02). That is the readback quantising to 8-bit sRGB, not an
// error here: rounding these values through 8 bits reproduces the browser's numbers exactly.
// Float is the more accurate answer, so do not "correct" it towards the browser.
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

// The neutrals and the primary are all built on var(--l-hue), so the hue has to be substituted
// before any of them is a literal. Only --l-error and --l-success carry their hue inline.
const resolveHue = (str, hue) =>
  str.replace(/var\(\s*--l-hue\s*(?:,[^)]*)?\)/g, hue);

// --name: light-dark(<light>, <dark>)  ->  { light, dark }
const readTokens = file => {
  const css = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
  const hue = css.match(/--l-hue:\s*([\d.]+)\s*;/)?.[1];
  if (!hue) throw new Error(`no --l-hue literal found in src/${file}`);
  const out = {};
  for (const [, name, pair] of css.matchAll(/--l-([a-z-]+):\s*light-dark\((.+?)\);/g)) {
    const halves = resolveHue(pair, hue).split(/,(?![^(]*\))/).map(s => s.trim());
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
