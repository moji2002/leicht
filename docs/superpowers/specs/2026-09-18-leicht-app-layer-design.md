# leicht 0.2 — the application layer

**Date:** 2026-09-18
**Goal:** a user can build an admin console — app shell, data table, tabs, toasts, forms — writing
only HTML. No custom CSS.
**Source of the gap list:** `docs/production-gaps.md`, produced by building `lab-console.html`
with leicht 0.1.1 and recording every rule that had to be hand-written.

## Decisions taken before this spec

| Decision | Choice | Why |
|---|---|---|
| Packaging | **All in core `leicht.css`** | One file, one link. Accepted cost: ~5.6 → ~7.8 kB gzipped, badge and README change. |
| Selector style | **Semantic / ARIA first**, classes only where HTML offers no hook | Keeps the classless promise and pushes users toward accessible markup. `figure:has(> table)`, `[role=tablist]`, `aside nav`, `body > output`. |
| Mobile sidebar | **`aside[popover]`** — static column ≥60rem, off-canvas drawer below | One markup, both behaviours, no JS: the drawer is opened by a `popovertarget` button and leicht already styles popovers, light-dismiss and the transition. |
| `--l-warning` | AA-safe lightness, same as `.error` / `.success` | Preserves the invariant that a variant is one repointed variable. A warning needing its own `--l-on-primary` would be the first exception. |
| `--l-table-max` | Default `none` | A document-shaped page must not get inner scrollports it did not ask for. |

## Verified constraints

Measured in Chromium via `scratchpad/probe.html` on 2026-09-18. These are not assumptions.

1. **`body > main`'s `margin-inline: auto` defeats grid stretch.** In a grid shell the auto margins
   override `justify-self: stretch`, and the content column collapsed to 64px inside a 945px
   track. The shell rules MUST set `margin-inline: 0`, and `inline-size: auto` on the header
   (whose `inline-size: min(var(--l-width), 100% - 1rem)` becomes invalid, and therefore `auto`,
   once `--l-width` is `none`).
2. **`aside[popover]` can be a static column.** Author `display: block; position: static` beats the
   UA's `display: none` for a closed popover. Confirmed computed values in flow.
3. **A sticky `thead` and a horizontal scroll wrapper are mutually exclusive without a height
   cap.** Setting `overflow-x: auto` forces `overflow-y` from `visible` to `auto`, so the figure
   becomes the scrollport and a page-sticky `thead` cannot work. Sticky headers are therefore
   gated on `--l-table-max` being set.

## Non-goals

Deliberately excluded, to be re-argued only if a real page needs them:

- `--l-info`. `--l-warning` plus `.neutral` covers the states a console actually shows.
- A z-index scale. `body > header` is `1`; the toast region takes `2`; documented, not tokenised.
- A margin/padding *utility class* scale (`.mt-4`, `.p-2`). §7 adds spacing **tokens**, which is a
  different thing: the rhythm stays automatic and per-instance overrides go through `--gap`.
  Fixing `article > header` and field help spacing removes most of the demand for utilities.
- A drawer for anything other than `aside`. Users have `[popover]` already.
- Any JavaScript. The library remains one stylesheet.

---

## §1 Bug fixes

No new API. All three are wrong today, independent of the new work.

### 1.1 A bare `.row` never stacks

`src/components.css`. `.row` is `grid-auto-flow: column`; the `@container (width < 40rem)` rule
only re-spans children matching `[class*=col-]` / `[data-span]`. A bare `.row` has none, so four
KPI cards stay four columns at phone width — measured `81.75px × 4` in a 625px viewport.

```css
@container (width < 40rem) {
  .row:not(:has(> :is([class*=col-], [data-span]))) { grid-auto-flow: row }
}
```

Keep `grid-auto-flow: column` as the wide-viewport default rather than switching the bare case to
`auto-fit`/`minmax`: `auto-fit` would silently drop the documented "splits evenly" guarantee and
rewrap a 5-item row unevenly.

### 1.2 `nav > ol` is not reset

`nav { & ul { … } }` names only `ul`, so a breadcrumb — semantically an `<ol>` — keeps
`list-style: decimal` and `padding-inline-start: 40px` and renders as "1. 2. 3.". Change to
`& :is(ul, ol)`.

### 1.3 `[popover]` captures every popover as a menu

Today `[popover]` imposes `min-inline-size: 12rem`, `padding: .35rem`, invoker anchoring, and
forces every descendant `a`/`button` to `inline-size: 100%; justify-content: start; --_bg: #0000`.
A filter panel's Cancel/Apply footer renders as two full-width left-aligned menu rows with the
primary button's fill stripped, and the author's `.flex.end` cannot win because the
`[popover] button` rule sits in the same layer at higher specificity.

Split it:

- `[popover]` keeps: the glass material, radius, `corner-shape`, the enter/exit transition,
  `transform-origin`, `position-try-fallbacks`.
- A new `[popover]:has(> :is(menu, ul))` carries: the compact padding, `min-inline-size`,
  `position-area` anchoring, the full-width row styling, and the `sibling-index()` cascade.

`popover="hint"` keeps its own block unchanged. `<dialog>` used as a popover stops inheriting
menu geometry, which is the same bug seen from the other side.

## §2 The shell

```html
<body>
  <aside id="nav" popover>…</aside>   <!-- static column ≥60rem, drawer below -->
  <header>…</header>                  <!-- still body > header: still the glass toolbar -->
  <main>…</main>
  <footer>…</footer>
</body>
```

Because the shell is made of `body`'s own children, every existing `body > …` rule keeps
matching. This is the point: it fixes the structural coupling identified in
`docs/production-gaps.md` §2 without adding a seam to reach through a wrapper `<div>`.

```css
body:has(> aside) {
  --l-width: none;
  display: grid;
  grid-template-columns: var(--l-aside, 15rem) 1fr;
  grid-template-rows: auto 1fr auto;
}
body:has(> aside) > aside { grid-area: 1 / 1 / -1 / 2 }
body:has(> aside) > :is(header, main, footer) {
  grid-column: 2;
  max-inline-size: none;
  margin-inline: 0;          /* constraint 1 */
}
body:has(> aside) > header { grid-row: 1; inline-size: auto }  /* constraint 1 */
```

- `--l-aside` (default `15rem`) sizes the column.
- `--l-width: none` must also work on an ordinary page as the documented full-bleed escape hatch.
  Requires auditing every `var(--l-width)` use for `min()` invalidation — `body > header` is the
  one known case.
- `aside nav` goes vertical: `display: grid` rows, padded rows with `--l-radius`, hover tint,
  `[aria-current]` filled with `color-mix(in oklab, var(--l-primary) 14%, #0000)`.
- Below 60rem: one column, and `aside[popover]` becomes `position: fixed; inset-block: 0;` a
  16rem / 80vw drawer with a square inline edge. Above 60rem, `display: block; position: static`
  and the popover material, shadow and transition are all unset (constraint 2).
- A page with no `<aside>` is completely unaffected — `:has()` gates every rule here.

## §3 Data tables

```html
<figure>
  <table>…</table>
  <figcaption>Recent invoices</figcaption>
</figure>
```

- `figure:has(> table)`: `overflow: auto`, 1px border, `--l-radius`, `corner-shape`, and
  `> table { margin: 0 }`. `figcaption` becomes the caption row — muted, bordered off the table.
- `tbody tr:hover { background: var(--l-surface) }`.
- `--l-table-max` (default `none`) sets `max-block-size`. When set, `thead th` becomes
  `position: sticky; inset-block-start: 0` with a `--l-bg` background (constraint 3). Implement
  as `@supports` -free plain CSS; a browser without `:has()` simply gets an unwrapped table,
  which is the current behaviour.
- Numeric alignment: `.num` on `th` and `td`. Additionally `td:has(> data)` right-aligns for
  anyone using `<data value="…">`, at no extra cost. CSS cannot infer a column's alignment from
  its header, so per-cell marking is unavoidable; document it as the one place a class is typed
  repeatedly.

## §4 Application chrome

| Component | Selector | Notes |
|---|---|---|
| Tabs | `[role=tablist]`, `button[role=tab][aria-selected=true]` | Flex row, bottom hairline, 2px indicator on the selected tab, muted label otherwise. Overflow-x scrolls. |
| Toasts | `body > output`, or `body > [role=status]` | `position: fixed`, bottom-inline-end, `display: grid`, `z-index: 2`, `max-inline-size: 22rem`. Children are ordinary `.alert`s given the top-layer material (`--l-glass-top`) and `--l-shadow`. |
| Skeleton | `[aria-busy=true]` | Shimmer gradient, transparent text colour, `--l-surface` base. Respects `prefers-reduced-motion` via the existing global transition reset — add an explicit `animation: none` there. |
| Spinner | `button[aria-busy=true]::before` | 1em ring, `pointer-events: none`, reduced opacity. Also `animation: none` under reduced motion. |
| Pagination | `nav[aria-label] > ol` | Centred row; reuses `.group`; `[aria-current]` marks the page. |
| Key/value | `dl` | Two-column grid (`auto 1fr`), muted `dt`, end-aligned `dd`, `.9375rem`. Invoice totals, metadata panels. |

`aria-busy` and `aria-selected` are load-bearing here: the styling and the accessibility come
from the same attribute, which is the whole argument for the semantic-first choice.

## §5 Small pieces

New classes, each one line or two:

`.avatar` · `.dot` (status dot inheriting `--l-primary`) · `.field` (flex wrapper for input
adornments — icons, `$`, unit suffixes — which `input { display: block; inline-size: 100% }`
otherwise makes impossible) · `.sm` / `.lg` control sizes · `.truncate` · `.between` / `.end` on
`.flex`.

Two changes that *delete* user CSS rather than adding vocabulary:

- **`article > header` / `.card > header` becomes a flex row** with `justify-content: space-between`
  and headings' margins zeroed inside it. A card title with a trailing action or menu is the most
  common card there is; this removed most `.mb-0` uses in the test page on its own.
- **Field help text gets spacing.** `:is(input, select, textarea) + small` gets
  `margin-block-end: var(--l-space)` and `display: block`, so a hint stops colliding with the
  next label. The existing `:user-invalid + small` colouring is unchanged.

## §6 Tokens

| Token | Default | Purpose |
|---|---|---|
| `--l-warning` | `light-dark(oklch(54% .13 75), oklch(80% .15 80))` | Third semantic state. **Measured 2026-09-18:** 5.01:1 against the page in light mode, matching `--l-error` (5.01) and `--l-success` (5.02); 10.41:1 in dark. The harness was validated by reproducing the README's 4.86:1 for `--l-primary`. No `--l-on-primary` exception needed. |
| `--l-focus` | `0 0 0 3px color-mix(in oklab, var(--l-primary) 25%, #0000)` | Extracted from the inline value in `forms.css` so skins can re-point the focus ring. |
| `--l-aside` | `15rem` | Shell sidebar width. |
| `--l-table-max` | `none` | Table height cap; enables the sticky `thead`. |

Plus variant classes `.warning` and `.neutral`, each `{ --l-primary: var(--l-…) }`, which
automatically recolour `.alert`, `.tag`, `.dot`, `.text-primary`, buttons and links.

## §7 Spacing, margin and padding

Added to scope 2026-09-18 on the user's instruction: the defaults must be right, not just
present.

### The problem

`--l-space` (1rem) is used in ~12 places. Roughly 20 further values are hardcoded and answer to
nothing: `.35rem` (popover padding), `.5rem` (toolbar inset, dialog footer gap, scroll markers),
`.75rem` (card header), `.85em 1em` (alert), `.9rem`, `1.25rem` (card padding), `1.5rem` (dialog
padding), `.6em .75em` (table cells). The consequence is that **`--l-space` does not actually
resize the UI** — it moves the gaps it happens to own and leaves the component interiors fixed.
For a console, where density is the single most important visual decision, that is the defect.

### The scale

```css
--l-space:     1rem;                              /* the one knob */
--l-space-xs:  calc(var(--l-space) * .25);
--l-space-sm:  calc(var(--l-space) * .5);
--l-space-md:  calc(var(--l-space) * .75);
--l-space-lg:  calc(var(--l-space) * 1.5);
--l-space-xl:  calc(var(--l-space) * 2);
```

Every hardcoded layout value snaps to the nearest rung. Where a value lands between rungs, it
moves to the rung — visual shifts up to ~.15rem are accepted, and §Acceptance covers how they are
verified rather than assumed.

### rem rungs vs em: the rule

Not everything should join the scale, and getting this wrong is how libraries end up with
buttons whose padding ignores their font size.

- **Layout spacing uses the rem scale** — gaps between cards, sections, rows, dialog and card
  padding, sidebar rows, toast stack. These should not change when a font size nearby changes.
- **Component-internal padding stays in `em`** — buttons, `.tag`, `code`, table cells, form
  controls. These must scale with their own font size, which is exactly what makes `.sm` / `.lg`
  (§5) work with one declaration instead of three.

This distinction is why `--l-space` alone was never enough, and it should be stated in the docs,
not just the source.

### Rhythm fixes

Concrete defects observed while building `lab-console.html`:

1. **Doubled bottom margins.** `.row` carries `margin-block-end: var(--l-space)` and so does every
   `article` inside it, so a row of cards ends with 2rem of dead space. Zero the last child's
   margin inside a `.row`, the way `article > :last-child` already is.
2. **Asymmetric page padding.** `body > main` is `padding: var(--l-space) clamp(1rem, 4vw, 2rem)`
   — 1rem vertical against up to 2rem horizontal. Vertical padding should use the same clamp, or
   `--l-space-lg`, so a page's top edge isn't visibly tighter than its sides.
3. **Field help text.** `<small>` after a control has no `display: block` and no bottom margin, so
   a hint collides with the next label (§5).
4. **Heading margins next to components.** `h1…h6` use `margin-block: 1.6em .5em`, correct in
   prose and too large after a card or a table in an app layout. Scope the 1.6em to headings that
   follow flow content, and use `--l-space-lg` after a component.
5. **`.stack` and `.flex` gap** already read `--gap` with an `--l-space` fallback. Keep, and
   document `--gap` as the per-instance override so no margin utilities are needed.

### The payoff, as a test

After this section, setting `--l-space: .75rem` on `:root` must visibly and *uniformly* compact
every component — cards, dialogs, alerts, sidebar, toasts, table density — and `1.25rem` must
loosen them. That single behaviour is the acceptance test for §7, and it is worth documenting as
a feature: one token for density, which is what a console actually needs.

## Acceptance criteria

1. `lab-console.html` renders correctly with its entire `<style>` block **deleted**. This is the
   test. Any rule that has to survive is a gap this spec failed to close, and must be recorded in
   `docs/production-gaps.md` as a known limitation rather than quietly left in the page.
2. The console works at 1440px, 1024px and 375px; in light and dark; with `data-skin` applied.
3. The drawer opens and light-dismisses below 60rem with no JavaScript.
4. `index.html` (the docs site) renders unchanged apart from intended additions — it is the
   regression test for the `[popover]`, `.row` and `nav` changes, since it exercises menus,
   tooltips, `select` pickers and grids on one page.
5. `prefers-reduced-motion`, `forced-colors`, `prefers-reduced-transparency` and print paths still
   hold for every new component.
6. `--l-space: .75rem` uniformly compacts every component and `1.25rem` uniformly loosens them,
   with no component left at a fixed size (§7).
7. **No unintended visual change to the existing docs site.** `index.html` and `skins.html` are
   screenshotted before and after and diffed pixel-by-pixel; every difference must be traceable to
   a rung change listed in §7, and anything else is a regression. This is the guard that lets §7
   touch 20 hardcoded values safely.
8. Gzipped size stays under 8 kB. Badge, README and `llms.txt` updated to the measured number.
9. `node build.js` output committed; `dist/` regenerated.

## Risks

- **`:has()` everywhere.** The shell, the table wrapper and the popover split all depend on it.
  Baseline since 2023-12, and leicht already uses `:has()` in `.row` and `label:has()`, so this
  is consistent rather than new — but it means the shell degrades to a plain stacked document in
  an older browser. That is an acceptable, legible failure mode, and worth stating in the README.
- **`--l-width: none` audit.** Any `min(var(--l-width), …)` becomes invalid-at-computed-value.
  One known case (`body > header`); the audit must be exhaustive, not spot-checked.
- **Uncommitted skin revisions.** `src/themes.css` and the themes `dist/` files carry changes from
  a previous session (the cyber skin retuned) that predate this work. They must be committed or
  stashed separately so the 0.2 diff stays readable.
- **`aside[popover]` unset list.** Making a popover behave as a static column requires unsetting
  material, shadow, transition, opacity and scale. If a future change adds another property to
  `[popover]`, the desktop column silently inherits it. Keep the unset block adjacent to the
  `[popover]` block in the source with a comment tying them together.
