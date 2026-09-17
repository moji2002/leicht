# Launch kit

Everything here is drafted for you to post. Nothing has been posted — these go out under your
name, so they need you.

Links: <https://moji2002.github.io/leicht/> · <https://www.npmjs.com/package/leicht> ·
<https://github.com/moji2002/leicht>

## Do this first (5 minutes, it can't be automated)

- **Social preview image.** GitHub's API can't upload one; it's web UI only.
  Settings → General → Social preview → upload `logo/og.png`. Without it, every shared repo link
  is a grey placeholder.
- **Check the og image renders.** Paste the site URL into
  [opengraph.xyz](https://www.opengraph.xyz/) or post it in a DM to yourself.

## Order to post in

Hacker News first, on a weekday morning US time (roughly 14:00–16:00 EEST). It's the one that
can carry the rest — if it lands, the others amplify; if you post everywhere at once you get one
thin day instead of a week of traffic. Reddit the next day, then dev.to, then the awesome lists
(those are slow-merge and don't depend on timing).

---

## Hacker News — Show HN

Title (80 char limit, no emoji, no "Introducing"):

```
Show HN: Leicht – a 5.6 kB classless CSS library built on 2026 CSS
```

First comment (post it immediately after submitting):

```
I write a lot of small internal pages and kept re-styling the same <table>, <form> and <dialog>.
Leicht is the stylesheet I ended up with: link one file, write ordinary HTML, and it looks
finished. 5.6 kB gzipped, no build step, no dependencies.

Two things make it different from the other classless sheets:

Cascade layers. Everything ships inside @layer, so your own CSS always wins on specificity
grounds — there is no !important anywhere in the file, and you never need one to override it.

It leans on new CSS hard, as progressive enhancement. Squircle corners (corner-shape), a
specular rim painted with background-clip: border-area, anchored popover menus, tooltips whose
tail follows when they flip sides, customizable <select>, ::scroll-marker carousels, syntax
colours through the CSS Custom Highlight API, and Apple-style liquid glass — the refraction is an
SVG displacement filter carried in a data URI, so it ships inside the stylesheet with no inline
<svg>. Every one of those degrades to the plain look where it isn't supported.

Also the boring things nobody ships: a real print stylesheet, forced-colors support, a skip link
that needs no class, and RTL through logical properties.

Things I got wrong along the way that might be useful to someone:
- feImage does not work under backdrop-filter from any non-inline source — data URI, external
  file, or href="#id" all silently drop the map. It works fine under plain filter.
- `box-shadow: none, 3px 3px 0 …` is invalid, so a theme that set a "none" shadow token silently
  voided every shadow on the element.
- Because OKLCH holds lightness perceptually fixed, re-tinting the whole palette by hue can't
  break contrast — it measures 4.86:1 at every hue. A raw brand hex is the thing that can fail.

Docs and live demos: https://moji2002.github.io/leicht/
```

Then: don't vote-beg, stay in the thread for the first two hours, answer every question.

---

## Reddit

**r/webdev** (largest, most forgiving) — title:

```
I built a 5.6 kB classless CSS library on top of 2026-era CSS — cascade layers, squircles, liquid glass
```

**r/css** — title:

```
Leicht: a classless stylesheet that uses corner-shape, border-shape, anchor positioning and the Custom Highlight API as progressive enhancement
```

Body for both (Reddit hates link-only posts — lead with substance):

```
Link one file, write plain HTML, and it's styled: headings, tables, forms, <dialog> as a modal,
[popover] menus that anchor to their button. 5.6 kB gzipped, no build step, no dependencies.

The part I think is actually interesting is that it's a testbed for new CSS. Everything is
progressive enhancement, so it degrades to a plain look:

- corner-shape: squircle for the rounding, border-shape for the tag's luggage-label shape
- background-clip: border-area for the specular rim on glass
- anchor positioning for menus, plus anchored container queries so a tooltip's tail follows when
  it flips sides
- appearance: base-select with a styled ::picker(select)
- ::scroll-marker for a carousel with dots and no JavaScript
- the CSS Custom Highlight API for syntax colours with no <span>s
- liquid glass: an SVG displacement filter carried in a data URI, so it lives in the stylesheet

Six optional skins (cyber, terminal, brutal, nord, mono, sunset) in another 1.6 kB, and the whole
thing is tokens, so one variable re-tints it.

Demos: https://moji2002.github.io/leicht/
Source: https://github.com/moji2002/leicht
```

Sort your own comments by new and reply to everything for the first few hours. Both subs allow
self-promotion of your own work; check each sub's rule about a flair before posting.

---

## X / Bluesky / Mastodon

Post 1 (attach a screen recording of the skin switcher — it's the thing that reads in 2 seconds):

```
leicht — a 5.6 kB classless CSS library.

Link one file, write ordinary HTML, get a finished page. No build step, no dependencies, no
!important (cascade layers mean your CSS always wins).

npm i leicht
https://moji2002.github.io/leicht/
```

Post 2 (thread, attach the liquid glass playground):

```
The glass is real refraction, not a blur: an SVG displacement filter carried in a data URI, so it
ships inside the stylesheet with no inline <svg>.

Chromium refracts it; Safari and Firefox fall back to vibrancy.
```

Post 3:

```
Six skins in 1.6 kB. Same markup, different tokens — cyber, terminal, brutal, nord, mono, sunset.
Each is a block of variable overrides plus a few lines of character.
```

---

## dev.to / Hashnode article

Title: **"What I learned shipping a CSS library on bleeding-edge CSS"**

Don't rewrite the README as an article — write the findings, they're the original part:

1. `feImage` is unusable under `backdrop-filter` from any non-inline source (with the test matrix).
2. Building an edge-lens displacement map from `SourceAlpha` alone, no `feImage`, no JS.
3. Why `box-shadow: none, …` silently voids a shadow list.
4. Why OKLCH means a hue knob can't break contrast, but a brand hex can.
5. Why the build ships no CSS parser: lightningcss couldn't parse `::picker(select):popover-open`.

Canonical-link it back to the docs site.

## Awesome lists

Each is a PR against a README. Keep the entry to one line in their existing format, and read
their CONTRIBUTING first — most require alphabetical order and a specific description style.

- **awesome-css-frameworks** (`troxler/awesome-css-frameworks`) — the important one; it has a
  "Classless" section that is exactly this library's shelf.
- **awesome-css** (`awesome-css-group/awesome-css`)
- **awesome-ui-component-library** (`anubhavsrivastava/awesome-ui-component-library`)
- **dohliam/dropin-minimal-css** — a comparison harness of drop-in classless sheets; being in it
  means people can switch to leicht live and compare. High value for this specific library.

Suggested entry line:

```
- [leicht](https://github.com/moji2002/leicht) - Classless-first stylesheet in modern CSS (cascade layers, `light-dark()`, squircles, glass); 5.6 kB, no build step.
```

## Directories worth a submission

- [CSS Design Awards / SiteInspire](https://www.siteinspire.com/) — only if the docs site stands on its own.
- [Product Hunt](https://www.producthunt.com/) — dev tools do modestly; needs the recording and a launch-day presence.
- [Hacker Newsletter](https://hackernewsletter.com/), [JavaScript Weekly](https://javascriptweekly.com/),
  [CSS Weekly](https://css-weekly.com/) — CSS Weekly is the best fit; submit the docs URL with one sentence.
- [Frontend Focus](https://frontendfoc.us/) — same pitch as CSS Weekly.

## Before any of it

- [ ] Upload `logo/og.png` as the GitHub social preview (see top).
- [ ] Record a 10-second screen capture of the skin switcher and the liquid glass playground.
      Every channel above wants it and it's the single most persuasive asset.
- [ ] Re-read the docs site on a phone — most HN traffic is mobile.
