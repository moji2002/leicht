# What a production UI needs that leicht doesn't have

> **Status: closed in 0.2, except where noted.** This document is the evidence that produced the
> 0.2 application layer. Its findings were implemented per
> `docs/superpowers/specs/2026-09-18-leicht-app-layer-design.md`, and the console that produced
> them now renders with **no custom CSS at all** — see `test/console.html`, with
> `test/e2e/console.spec.js` asserting there is no `<style>` block and no inline property.
>
> What 0.2 closed: §1.1 (`.row`), §1.2 (`nav > ol`), §1.3 (`[popover]`), §2 (the `body >` coupling,
> via `body:has(> aside)` built from body's own children), §3 (`--l-warning`, `--l-focus`), §4
> (tables, tabs, avatar, dot, sidebar nav, `.field`, skeletons, toasts, breadcrumbs, pagination,
> sizes, dense `<dl>`), §5 (spacing utilities, truncation, `article > header`, field help text).
>
> **Still open after 0.2** is at the bottom of this file.


Method: I built a real SaaS admin console — now `test/console.html` — using only
leicht's vocabulary, and wrote custom CSS *only* where the library could not express the thing.
Every hand-written rule is tagged `GAP-n` in that file's `<style>` block. Sidebar, sticky
toolbar, breadcrumb, KPI cards, tabs, filter bar, an 8-column data table, row menus, pagination,
an invoice detail card, a settings form, a modal, a toast, an empty state, dark mode, 375px.

Verdict: **the classless layer holds up. The application layer is where it runs out.** ~70 lines
of custom CSS covered it — leicht is 890 — but three of those lines are fixing leicht, not
extending it.

---

## 1. Bugs — these are wrong, not missing

### 1.1 A bare `.row` never stacks (most severe)

`components.css`: `.row` uses `grid-auto-flow: column`, and the `@container (width < 40rem)`
rule only re-spans children matching `[class*=col-]` / `[data-span]`. A bare `.row` — the
documented "splits evenly" case, and what anyone reaches for for a KPI strip — has no children
that match, so four cards stay four columns at 375px. Measured: `81.75px 81.75px 81.75px
81.75px` in a 625px viewport, `$48,920` clipped to `$48,9`.

```css
@container (width < 40rem) {
  .row:not(:has(> :is([class*=col-], [data-span]))) { grid-auto-flow: row }
}
```

Worth considering `grid-template-columns: repeat(auto-fit, minmax(min(14rem, 100%), 1fr))` for
the bare case instead — it degrades continuously rather than at one breakpoint.

### 1.2 `nav > ol` is not reset — every breadcrumb renders as "1. 2. 3."

`nav { & ul { … list-style: none; padding: 0 } }` names only `ul`. A breadcrumb is semantically
an `<ol>`, so it keeps `list-style: decimal` and `padding-inline-start: 40px`. Confirmed in the
computed style. One-character fix: `& :is(ul, ol)`.

### 1.3 `[popover]` assumes "menu" and mangles every popover that isn't one

A filter panel, a date picker, a share sheet: all get `min-inline-size: 12rem`,
`padding: .35rem`, anchoring under the invoker, and — the destructive part — every `a`/`button`
inside is forced to `inline-size: 100%; justify-content: start; --_bg: #0000`. In the test page
the panel's Cancel/Apply footer renders as two full-width left-aligned menu rows and the primary
button loses its fill. `.flex.end` in the footer cannot win, because the `[popover] button` rule
is in the same layer and more specific.

Menu styling should be opted into — `[popover][role=menu]`, a `menu` element child, or a
`.menu` class — not applied to the `[popover]` attribute itself.

---

## 2. Structural assumption: everything is keyed to `body > …`

`body > header` is the glass toolbar. `body > :is(header, main, footer)` is the 72rem centred
column. `body > footer` is the muted small print. The moment there's an app shell —
`body > aside` + `body > div > header/main` — all of it silently stops applying. Measured on the
test page: the sticky header's computed `background-color` is `rgba(0,0,0,0)` and its
`box-shadow` is `none`, so the breadcrumb scrolls transparently over the content behind it.

That's not a bug — it's the classless premise — but it means "link one file and it's styled"
stops at document-shaped pages. Two ways out, either would do:

- Reach through one level: `:where(body, body > *) > header`, or
- Give the pieces classes as an alternative selector, the way `.card` backs up `article` and
  `.container` backs up `body > main`. `.toolbar`, `.appbar`, `.sidebar` cost ~3 lines each.

There is also no documented way to opt a page out of `max-inline-size: var(--l-width)`. A
`--l-width: none` escape hatch would be free.

---

## 3. Missing tokens

| | |
|---|---|
| `--l-warning` | `.error` and `.success` exist; there is no third state. Expiring cards, quota warnings, "overdue" — every console needs it, and `.warning` must currently be minted by hand. An `--l-info` / `.neutral` pairing is the next one after that. |
| A focus-ring token | `0 0 0 3px color-mix(in oklab, var(--l-primary) 25%, #0000)` is inlined in `forms.css` and cannot be re-pointed by a skin. |
| A z-index scale | `body > header` is `z-index: 1`, toasts and drawers have to guess above it. |

## 4. Missing components (ranked by how often I actually needed them)

1. **Table affordances** — an overflow wrapper, sticky `thead`, row hover, numeric column
   alignment (the `tabular-nums` is there, `text-align: end` isn't), a compact density. An
   8-column table overflows a 1440px laptop with a sidebar. This is the single biggest
   value-per-line addition.
2. **Tabs** — `[role=tablist]` / `[role=tab][aria-selected]`. Classless, ARIA-keyed, ~8 lines.
3. **Avatar** — `.avatar`. In the header, the member list, every table row.
4. **Status dot** — `.dot`, inheriting the semantic colour. `.tag` is too heavy for a status cell.
5. **Vertical nav** — `nav` is horizontal and `space-between` by design; a sidebar is a rewrite.
   `.sidenav` or `aside nav` would cover it.
6. **Input adornments** — `input` is forced to `display: block; inline-size: 100%`, so a currency
   field, a search field with a leading icon, or a unit suffix all need a wrapper that doesn't
   exist. A `.field` wrapper is ~6 lines and unlocks a whole category.
7. **Skeleton + spinner + `[aria-busy]`** — every async surface needs one.
8. **Toast region** — `.alert` is already the right visual; what's missing is a fixed,
   live-region stack. `.toasts` is 4 lines and reuses `.alert` entirely.
9. **Breadcrumb** — after fixing 1.2, separators are one `::before`.
10. **Pagination** — mostly free once `.group` exists; needs the container and an active state.
11. **Control sizes** — `.sm` / `.lg`. `padding: .5em 1.1em` is the only size a button has, and a
    dense toolbar needs smaller.
12. **Dense `<dl>`** — a two-column key/value grid. Invoice totals, metadata panels, spec sheets.

## 5. Smaller things

- **No spacing or alignment utilities at all.** `.flex` hard-codes `align-items: center` and
  offers no justify; `.stack` takes `--gap` but nothing takes a margin. Half my custom lines were
  `.mb-0`, `.between`, `.end`, `.gap-sm`. A dozen classes, or document `--gap` as the escape
  hatch and add `justify-*`.
- **No truncation utility.** Long customer names and emails blow out every table column.
- **`article > header` isn't a flex row**, so a card title with a trailing action or menu — the
  most common card in existence — needs a one-off rule each time.
- **Field help text has no spacing.** `<small>` after an input gets `:user-invalid` colouring but
  no `margin-block-end`, so the hint collides with the next label.
- **`.hide-sm` loses to any unlayered author `display`.** That's the layer design working as
  intended, but it makes the display utilities specifically unreliable in exactly the projects
  that also write their own CSS. Worth a line in the docs.

## 6. What held up, and is worth saying out loud

- Dark mode: zero work, including a hand-minted warning token that used `light-dark()` correctly
  by copying the pattern.
- The variant-repointing trick (`.error { --l-primary: var(--l-error) }`) is the best thing in
  the library. `.warning` and `.neutral` cost one line each *because* of it, and they immediately
  worked on `.tag`, `.alert`, `.dot` and `.text-primary` with no extra rules.
- `<dialog>` with `showModal()` — backdrop blur, entrance transition, footer alignment — is
  production-ready as shipped. Nothing to add.
- The `role="switch"` checkbox, `<meter>` with `low`/`high`/`optimum`, `[data-empty]` empty
  states, `.group`, `<details>`, `<fieldset>`, `.alert`, and the `select` picker all worked
  first try in a dense layout.
- The container query on `.col-*` is genuinely better than a media query: the `col-4` settings
  form reflows on its own width, in a sidebar, with no breakpoint bookkeeping.


---

## Still open after 0.2

Found while building the acceptance test. None needs custom CSS to *work around* — they are
either a markup discipline the docs must teach, or a deliberate non-goal.

### A big number has no styling of its own

A KPI tile's value is the one thing on the page that wants to be large, tabular and optically
tight. `<strong>` inside a `.card` renders at body size, so the four tiles in
`test/console.html` read as labels rather than figures. The spec's non-goals exclude a typography
scale, and inventing one for a single component would be worse — but the consequence is real, and
a `.stat` (or a documented `--l-stat-size`) is the obvious candidate if a second use case appears.

### A breadcrumb has no separators

`nav > ol` is now reset (§1.2), so a breadcrumb is a clean inline row — but "Workspace Billing
Invoices" with nothing between the items is ambiguous. The custom rule in the 0.1.1 console was
`li + li::before { content: "/" }`. Adding that to the library would impose a separator character
on every `nav > ol`, including pagination, which is why it was not done. Worth revisiting with a
narrower hook.

### A bare `<table>` still overflows its container, silently

`figure:has(> table)` gives a table a scrollport, but only if you remember the `<figure>`. A bare
`<table>` in a narrow container still pushes the page sideways — this bit the acceptance test
itself: the invoice line-items table overflowed the viewport by 39px at 375px until it was
wrapped. The library cannot fix this without making every table a scroll container, so it is a
documentation duty: **a data table goes in a figure.**

### `min-inline-size: max(12rem, anchor-size(width))` collapses without an anchor

Pre-existing, not a 0.2 regression, and filed separately. In `src/edge.css` the anchored menu
width is invalid-at-computed-value-time when the popover has no anchor, so the whole declaration
is dropped and the 12rem floor with it. Measured on the docs site, whose menus are opened with
`commandfor` and have no `anchor-name`: `#skin-menu` computes `min-inline-size: 0px` and renders
98px wide. A menu that *does* have an anchor correctly computes `192px`.
