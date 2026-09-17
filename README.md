# leicht

A tiny classless-first CSS library, written in modern CSS. Link one file, write ordinary HTML,
and it's styled. **5.6 kB gzipped**, no build step, no dependencies.

```html
<link rel="stylesheet" href="leicht.min.css">
```

```bash
npm i leicht
```

## What you get without writing a single class

Headings, links, lists, tables, `<code>`/`<pre>`, `<blockquote>`, `<details>`, forms and
fieldsets, `<nav>`, `<article>` as a card, `<dialog>` as a modal, `[popover]` menus anchored to
their button, `popover="hint"` tooltips, `<progress>`, `<meter>`, and a checkbox with
`role="switch"` as a real toggle.

## And a few classes when you need them

| | |
|---|---|
| `.row` / `.col-1`…`.col-12` | 12-column grid on CSS grid; a bare `.row` splits evenly |
| `.card` | what `<article>` already gets, on anything |
| `.button`, `.secondary`, `.outline`, `.ghost`, `.error`, `.success` | variants repoint variables, so they combine |
| `.alert` | callout; takes the same variants |
| `.group` | join buttons into one segmented bar |
| `.tag`, `.carousel`, `.glass`, `.liquid` | badge, scroll-snap list with dots, and the two glass materials |
| `.flex`, `.stack`, `.text-center`, `.text-muted`, `.hide-sm`, `.sr-only`, `.container` | utilities |

## Theming

Everything is a token. Your CSS sits outside leicht's cascade layers, so it always wins — you
never need `!important`.

```css
:root {
  --l-primary: #0a66c2;   /* a brand colour; everything else mixes from it */
  --l-hue: 150;           /* or re-tint neutrals and accent together */
  --l-radius: .25rem;
  --l-corner: round;      /* opt out of squircles */
}
```

Because the palette is OKLCH and holds lightness fixed, changing `--l-hue` measures the same
contrast at every hue — 4.86:1 against the page. A raw brand colour is the one that can fail:
check it if it's light.

Dark mode follows the OS. Force it with `<html data-theme="dark">`.

### Skins

`leicht-themes.css` (1.6 kB gzipped, optional) adds six looks as token blocks — cyber, terminal,
brutal, nord, mono, sunset. They compose with light/dark.

```html
<link rel="stylesheet" href="leicht.min.css">
<link rel="stylesheet" href="leicht-themes.min.css">
<html data-skin="terminal" data-theme="dark">
```

## Modern CSS, degrading quietly

The baseline is cascade layers, native nesting, `light-dark()`, `color-mix()`, `:has()` and
container queries. On top of that, features are used as progressive enhancement and fall back to
the plain look where they're missing: squircle corners, `border-shape`, a specular rim painted
with `background-clip: border-area`, liquid-glass refraction from a data-URI SVG filter, anchor
positioning, customizable `<select>`, scroll-driven animations, `@container scroll-state`,
`::scroll-marker`, the CSS Custom Highlight API, typed `attr()` and `contrast-color()`.

Also included, because nobody ships them: a real print stylesheet, forced-colors and
reduced-transparency support, a skip link that needs no class, and RTL through logical properties.

## Build

No build is needed to *use* leicht. To change it:

```bash
npm run build     # inlines src/ imports, minifies, checks a gzip budget
npm run dev       # rebuild on change
```

The build is plain Node with no dependencies. It deliberately uses no CSS parser — parsers lag
the syntax this library is built on.

## License

MIT © Mojtaba Beheshti
