// Inlines src/index.css imports and minifies by whitespace only. No CSS parser on
// purpose: parsers lag bleeding-edge syntax (::picker(select)a etc.).
import { readFileSync, writeFileSync, mkdirSync, watch } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const BUNDLES = [
  { entry: 'index.css', name: 'leicht', budget: 10000 },
  { entry: 'themes.css', name: 'leicht-themes', budget: 2000 },
];
const read = f => readFileSync(`src/${f}`, 'utf8');

const bundle = entry =>
  read(entry).replace(/^@import "([^"]+)";\n/gm, (_, f) => read(f).trimEnd() + '\n\n');

const LAYERS = '@layer leicht.base, leicht.components, leicht.utilities;\n';
// lightningcss dropped the order statement as redundant; keep it so order never hinges on import order.
const withOrder = code => String(code).replace(/^(\/\*![^]*?\*\/\n?)/, `$1${LAYERS}`);

const keepComment = c => c.startsWith('/*!');
const trimAround = new Set(['{', '}', ';', ',', '>']);

function minify(css) {
  let out = '';
  let quote = null;
  let space = false;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      out += c;
      if (c === '\\') out += css[++i];
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) throw new Error('unterminated comment');
      const comment = css.slice(i, end + 2);
      if (keepComment(comment)) out += comment + '\n';
      i = end + 1;
      space = true;
      continue;
    }
    if (/\s/.test(c)) { space = true; continue; }
    if (space) {
      const prev = out.at(-1);
      // never trim before ':' — "nav :is()" and "nav:is()" differ
      if (prev && prev !== '\n' && !trimAround.has(prev) && prev !== ':' && !trimAround.has(c)) out += ' ';
      space = false;
    }
    if (c === '"' || c === "'") quote = c;
    if (c === '}' && out.at(-1) === ';') out = out.slice(0, -1);
    out += c;
  }
  if (quote) throw new Error('unterminated string');
  return out.trim() + '\n';
}

const braces = s => (s.match(/{/g) ?? []).length - (s.match(/}/g) ?? []).length;
const kb = n => `${(n / 1024).toFixed(2)} KB`.padStart(9);

function build() {
  mkdirSync('dist', { recursive: true });
  for (const { entry, name, budget } of BUNDLES) {
    const full = withOrder(bundle(entry));
    const min = withOrder(minify(full));
    if (braces(min) !== 0) throw new Error(`unbalanced braces in ${name}`);
    writeFileSync(`dist/${name}.css`, full);
    writeFileSync(`dist/${name}.min.css`, min);
    const gz = gzipSync(min, { level: 9 }).length;
    console.log(`${(name + '.min.css').padEnd(20)}${kb(min.length)}  gzip ${kb(gz)}  brotli ${kb(brotliCompressSync(min).length)}`);
    if (gz > budget) throw new Error(`${name}: gzip ${gz} B over its ${budget} B budget`);
  }
}

build();

if (process.argv.includes('--watch')) {
  console.log('watching src/ …');
  watch('src', () => { try { build(); } catch (e) { console.error(e.message); } });
}
