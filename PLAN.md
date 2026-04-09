# PLAN.md

## Goal

Fix the broken mobile marketing header by adding a hamburger icon that opens
a side drawer containing all nav links and the CTA button.

## Approach

The `<nav>` in `src/layouts/MarketingLayout.astro` has no responsive behaviour —
all links and the CTA are always rendered in a single horizontal flex row, which
overflows on small screens. The fix adds:

- **Desktop (md+):** existing layout unchanged.
- **Mobile (<md):** only the wordmark and a hamburger button are visible in the
  header bar. The nav links and CTA are moved into a right-side drawer.
- **Drawer**: slides in from the right using a CSS `translate-x` transition, with
  a semi-transparent backdrop behind it. Clicking the backdrop or the close (X)
  button dismisses the drawer.
- **Hamburger icon**: three SVG lines that animate into an X when the drawer is
  open via CSS class toggling.
- **State management**: a small inline `<script>` in `MarketingLayout.astro`
  toggles a CSS class (`nav-open`) on the `<body>` element. No SolidJS island
  needed — shipping the full SolidJS runtime for a single toggle on a marketing
  page is unnecessary overhead.

## Steps

1. **Restructure the `<header>` markup in `MarketingLayout.astro`**
   - Add `md:hidden` hamburger `<button>` with animated three-line → X SVG icon.
   - Wrap the existing nav links + CTA in a `hidden md:flex` div so they stay
     visible on desktop and are removed from the header bar on mobile.

2. **Add the side drawer markup**
   - A full-height `<div>` fixed to the right edge, initially off-screen
     (`translate-x-full`), transitioning to `translate-x-0` when `nav-open` is
     active.
   - Contents: close button (×), then Features, Changelog, About, GitHub ↗, and
     the Open Editor → CTA button — all using the existing link/button styles.

3. **Add the backdrop markup**
   - A fixed full-screen `<div>` with `bg-black/40` opacity, invisible by default,
     that appears alongside the drawer. Clicking it closes the drawer.

4. **Write the inline `<script>` for the toggle**
   - `openBtn` click → add `nav-open` class to `<body>`.
   - `closeBtn` click and `backdrop` click → remove `nav-open`.
   - ESC keydown → remove `nav-open`.
   - Closing the drawer on internal link click (so navigation dismisses the menu).

5. **Add the CSS transitions via Tailwind utility classes**
   - Drawer: `translate-x-full` → `translate-x-0` controlled by `.nav-open` on
     `<body>` (use a `body.nav-open` selector in a `<style>` block or `data-open`
     attribute toggled by the script — whichever keeps markup clean).
   - Backdrop: `opacity-0 pointer-events-none` → `opacity-100 pointer-events-auto`.
   - Hamburger icon lines: rotate/translate into X shape.

6. **Run `bun run verify`** to confirm no type, lint, or build errors.

## Current Step

<!-- Leave blank until build begins -->
