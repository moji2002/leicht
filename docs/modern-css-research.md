# leicht — research notes (2026-09-17)

Evidence grades: **[measured]** checked by us in Chrome 152 · **[primary]** vendor release
notes / MDN / WebKit blog · **[secondary]** blog, unverified · **[inference]** our reasoning.

## Reference libraries

| | chota | wing | fertig v5 (own) | leicht |
|---|---|---|---|---|
| gzip | ~3 KB [docs] | 5 KB [docs] | core 9.7 KB [measured] | 5.0 KB [measured] |
| Dark mode | `body.dark` via JS | — | `light-dark()` | `light-dark()` |
| Nesting | no | no | no | yes |

Sources: https://jenil.github.io/chota/ · https://kbrsh.github.io/wing/ · https://github.com/moji2002/fertig

The landing page copies chota's structure: nav → short hero → feature list → getting started →
one section per component, each a live demo with its markup underneath (generated from the demo
by a small script, so the example can't drift from the demo).

## Tiers

**Floor (no fallback needed):** `@layer`, `color-mix()`, `light-dark()`, container queries,
native nesting [secondary: widely available mid-2026], `:has()`, `backdrop-filter`.

**Enhancements (`src/edge.css` + a few `@supports` blocks). Degrade to the floor look.**

| Feature | Chrome | Safari | Firefox | Used for | Grade |
|---|---|---|---|---|---|
| `corner-shape: squircle` | 139 | — | — | all rounded surfaces | [primary] MDN; Chromium-only |
| `border-shape` + `shape()`, `polygon(round …)` | 147 / 150 | — | `shape()` 148 | tag label, tooltip tail | [primary] https://developer.chrome.com/release-notes/147 |
| `background-clip: border-area` | 150 | — | pref | glass rim | [primary] https://developer.chrome.com/release-notes/150 |
| `appearance: base-select`, `::picker(select)` | yes | 27 (broken with our styles) | pref | glass select dropdown | [primary] + [user report] |
| scroll-driven animations | yes | 26.0 | **pref only** | toolbar turns to glass on scroll | [primary] https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ |
| `@container scroll-state(scrolled)` | 144 | — | — | toolbar hides while scrolling down | [primary] https://developer.chrome.com/release-notes/144 |
| `popover=hint` + `interestfor` | 142 | hint in STP only | hint 149 | tooltips | [primary] |
| position-area / anchor | yes | 26.0 | 147 | anchored menus | [primary] |
| `sibling-index()` | yes | 26.2 | 154 | staggered menu items | [primary] |
| typed `attr()` | yes | STP | 155 | `data-span="N"` | [primary] |
| `contrast-color()` | 147 | 26.0 | 146 | text on primary | [primary] |
| `text-box: trim-both` | yes | yes | 154 | heading leading | [primary]; **does not trim flex containers** [measured] |
| `flex-wrap: balance` | 150 | — | — | `.flex` rows | [primary] |
| `::details-content` + `interpolate-size` | yes | ? | 143 (no interpolate-size) | details height animation | [primary] |
| `@view-transition` | yes | 18.2 | same-document only | page transitions | [primary] |

Full per-engine list: Chrome https://developer.chrome.com/release-notes/139 … /152,
Safari https://webkit.org/blog/17640/webkit-features-for-safari-26-2/ ,
https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/ ,
Firefox https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/155 ,
Interop 2026 https://webkit.org/blog/17818/announcing-interop-2026/

## Apple Liquid Glass

Apple's Liquid Glass (WWDC25) is lensing + specular highlights + adaptive tint, and it is a
**native** material: SwiftUI/UIKit and Safari's own chrome. Apple ships **no CSS API** for it, so
a web page cannot ask for the real thing. https://developer.apple.com/videos/play/wwdc2025/219/

Refraction needs an SVG displacement filter. Two ways to apply it, both **[measured, Chrome 152]**:

1. `backdrop-filter: url("data:image/svg+xml,…#id")` — works from a data URI, Chromium only
   (WebKit bug 245510, Firefox declined).
2. **What we ship**: a layer with `backdrop-filter: blur(…)` *and* `filter: url(…)` on the same
   element. The element's own filter distorts the captured backdrop. Verified with a data URI, so
   it still needs no inline `<svg>` — and because WebKit supports `filter: url()`, this path may
   reach Safari, which refuses `url()` inside `backdrop-filter`. **Unverified in Safari.**
   Taken from https://codepen.io/samarkandiy/pen/yyNvNGQ (no JS), adapted onto `::before`/`::after`
   at `z-index: -1` so no extra markup is needed: refraction layer, tint, specular rim.

**Which displacement map looks right** [measured, side by side in a throwaway probe page]:
- `feTurbulence` (baseFrequency .008, scale 70, **blur 0**) reads as Apple's material. Our first
  attempt looked wrong not because of turbulence but because it was over-blurred (5px) and
  under-displaced (scale 26) — it turned to frosted mush.
- An edge-lens map built from `SourceAlpha` (blur → two `feOffset` copies → `feColorMatrix` bias
  computing `0.5·L − 0.5·R + 0.5`) bends only near the rim and rescales itself with no JS. It is
  more physically correct, but at small element sizes it pushes content out of the panel instead
  of looking like glass. Kept as a documented alternative for `--l-refract`.
- `feImage` is unusable under `backdrop-filter` from any non-inline source (data URI, external
  file, or `href="#id"`); it works under plain `filter`. Do not bias with
  `feComposite operator="arithmetic"` — premultiplied alpha turns the map white.

Still impossible without JS/WebGL: an SDF-based map (radially correct rounded corners), adaptive
tint sampled from the backdrop, and a specular highlight that tracks pointer or device motion.

So `.liquid` is opt-in and additive: the plain blur stack is declared first, the `url()` version
second, and engines that ignore it keep the vibrancy. `@supports` can't gate it (Firefox parses
the value fine), which is why order does the work. Turned off under
`prefers-reduced-transparency` and `prefers-contrast: more` — note Safari supports neither of the
former, which is the reason both are listed. [primary] MDN

**Deliberately not used**
- `@function`, `if()`: no graceful degradation. Inside a custom property they poison every
  `var()` that reads it, and next to `var()` they make the declaration invalid at computed-value
  time, which gives `unset`, not the previous declaration. [inference from the spec's
  invalid-at-computed-value-time rule]
- Per-shape edge lensing (a displacement map that follows the border radius): needs `feImage`,
  which did not load from a nested data URI [measured], so it would need a file or inline SVG.

## Rules learned the hard way (all [measured])

- **Never wrap a `<select>` in its `<label>`.** WebKit focuses the select but never opens the
  menu. [secondary] https://medium.com/browserquirks/browserquirk-programmatically-opening-a-select-box-4ca745a8468f
  The library styles the separate label + `for`/`id` pattern to match the wrapping one.
- **`appearance: base-select` needs a second, Chromium-only probe.** Safari 27 reports support but
  the menu does not open with our styles; the feature query can't tell the two apart. [user report]
- **No CSS parser in the build.** lightningcss rejected `::picker(select):popover-open`, so the
  build only inlines imports and strips whitespace.
- **Never put a pseudo-element in a shared selector list.** One unknown `::picker()` voids the
  whole rule, so the glass rim is split into two rules sharing `--l-rim`.
- **A popover's `::backdrop` must be scoped to `dialog`.** Otherwise opening any menu dims the page.
- **`flex-wrap: balance` must live in the utilities layer.** Declared in a lower layer, it loses
  to the utilities' `flex-wrap: wrap`.
- **Icon `<svg>` needs an explicit block-size.** The sprite's `viewBox` is on `<symbol>`, so the
  outer svg has no aspect ratio and defaults to 150px tall.
- **Fill/stroke go on the `<symbol>`.** `<use>` instances don't inherit from the sprite's
  outer `<svg>`. And `hidden` does nothing on an SVG-namespace `<svg>`, so collapse the sprite
  with a zero size instead.

## Skins

`dist/leicht-themes.css` (1.1 KB gz, optional) adds four skins as `[data-skin=…]` token blocks:
cyber, terminal, paper, brutal. They ride on top of light/dark, which stays on `data-theme`, so
the two never collide. Almost every skin is variable overrides; the exceptions are deliberate
character: `corner-shape: bevel` and glow shadows for cyber, `::before` prefixes for terminal,
and 2px borders with a hard offset shadow for brutal. [inference]

Review findings, all [measured]: every skin clears WCAG AA in both modes (lowest pair 4.67:1);
cyber needed its light primary darkened from 52% to 50% lightness to clear 4.5. Two failures were
about signal, not contrast: brutal's ghost button was indistinguishable from outline (both had the
2px border), and mono's destructive button matched its primary, because a hueless palette has no
colour signal — it now uses maximum contrast plus an underline, with primary stepped back to a
mid grey.

Icon-only buttons are matched by `[aria-label]`, not `:has(> svg:only-child)` — `:only-child`
ignores text nodes, so a button with text plus an icon counts as having an only child. [measured]

## RTL

The library is written with logical properties, so `dir="rtl"` mirrors it without a separate
stylesheet. Logical properties do not cover everything, so four things are handled explicitly
[inference, verified by flipping the demo page]:

- `pre` is forced `direction: ltr` and inline `code`/`kbd`/`samp` get `unicode-bidi: isolate`,
  so a snippet never reorders around Arabic or Hebrew text.
- `transform-origin` is physical: the popover menu and the tooltip get a `:dir(rtl)` origin so
  they still scale out of the corner they are anchored to.
- Offset shadows are physical: the brutal skin flips its 4–5px shadow and its pressed translate.
- Directional icons only mirror when marked `[data-flip]` — an arrow should flip, a clock
  should not. `:dir()` is Baseline, so the overrides cost four small rules.

Specular highlights are deliberately *not* flipped: light comes from above-left in both
directions, the way a physical material behaves.

## Colour

A macOS-style system blue: `oklch(55% .2 257)` light, `oklch(72% .15 257)` dark. Error and
success use Apple-like hues (29, 148) at the primary's lightness. Greys are near-neutral zinc
and the dark background is near-black. Measured WCAG contrast on the page background:

| pair | light | dark |
|---|---|---|
| muted text | 6.06 | 6.59 |
| primary text | 4.86 | 7.89 |
| error text | 5.01 | 7.43 |
| success text | 5.02 (was 4.25 at L 56%, so darkened to 52%) | 9.87 |
| button text on primary | 4.99 | 8.37 |

The demo page loads one Unsplash photo as the liquid-glass backdrop — the only external asset on
the page, and only in the demo, never in the library.

Shadows are kept deliberately light (`0 6px 20px -10px #0003`), by request.
