# Agent playbook

`@johnhenry/data-plot`: plots written as HTML. `<data-plot>` is the frame
(data and scales); `<plot-marks>`, `<plot-line>`, `<plot-axis>`, and
`<plot-legend>` are layers drawn in it; `<chernoff-face>` is a glyph mark.
Shipped as source, no build step, no runtime dependencies. `CLAUDE.md` is
a symlink to this file.

- `src/<element>/`: `index.mjs` (the class, unregistered), `global.mjs`
  (registers it), `readme.md` (with a generated API block). `src/global.mjs`
  registers everything; `src/index.mjs` exports the classes and toolkit.
- `src/source.mjs`: where every element's data comes from (the one rule) and
  the live registry that reads each source once. `src/data.mjs`: reading
  tables, datalists, JSON. `src/scale.mjs`: scales and ticks.
  `src/template.mjs`: `:attr`/`{field}` bindings. `src/layer.mjs`: the
  `PlotLayer`/`DataLayer` bases and `describe()` (accessibility).
  `src/reflect.mjs`: properties that mirror attributes.
- `demo/`: the gallery (each card shows its source beside it);
  `demo/examples/*.html` are the cards. `docs/roadmap.md`: what's next.

## The verification loop (before every push)

1. `npm test`: every `.mjs` parses, every relative reference and
   `@johnhenry/data-plot/<path>` resolves (through `exports`, or as a file
   for jsDelivr `/npm/` URLs), `no-undef` lint, the generated declarations
   type-check through the package's own paths (`test/types`), and the
   scale unit tests.
2. `npm run test:browser`: Playwright in Chromium, Firefox, and WebKit, on
   its own port (4749) so `npm run serve` (4739) can keep running. Firefox
   often can't launch on new macOS; run `--project chromium --project
   webkit` locally and let CI cover Firefox.
3. `npm run manifest` after any JSDoc change, and commit the output (CI
   checks it's current).
4. Look at it: `npm run serve`, then `/demo/`. Check the console for the
   accessibility warning on every example.
5. `npm pack --dry-run`, then a fresh clone:
   `git clone . /tmp/data-plot-verifyN && cd $_ && npm ci && npm test`.

## Repo-specific gotchas

- **The manifest only sees what JSDoc declares.** Properties made by
  `reflect()` exist at runtime only, so each class lists them with `@prop`;
  plumbing the frame calls (`draw`, `channels`, `renderAlone`) is
  `@protected` so it stays out of the types. `observedAttributes` is a
  module constant (`OBSERVED`): written inline, the analyzer documents the
  ARIA attributes it watches as if they were API.
- **Identify the frame by `FRAME`, not by shape.** Layers and the frame both
  have `requestRender()`, so "the parent has requestRender" once made a
  layer inside a standalone `<plot-marks>` treat it as a plot.
- **Every default rule is in `:where()`, and order breaks ties.** A range
  dot's sizes must come after `.plot-dot`'s. Before `:where()`, a demo's
  `.bar` lost to the default placement rule and bars floated.
- **`"" - 0` is 0.** A scale must return NaN for non-numbers, or an empty
  cell plots at the origin (the Gantt milestones did).
- **Banded y reads top to bottom** (the frame flips it), like the table it
  came from; a band scale alone would put the first row at the bottom.
- **A source is shared.** `subscribe()` keys on the element and the table
  shape; the observer disconnects when the last reader leaves. A reader
  connected while disconnected would leak, so `DataBinding` connects only
  when its host is connected.
- **Gallery tests wait for DOM-ready, not `load`.** `load` waits for every
  frame and the CDN stylesheet for `<code-color>`, which timed out under
  parallel load.

## Definition of done

- JSDoc on the class (`@tag`, `@summary`, `@attr`, `@prop`, `@fires`,
  `@cssprop`), `npm run manifest` run and committed.
- A `readme.md` with `## Usage` first, the API markers, `## Notes` last
  (`check-links.mjs` enforces it).
- Browser tests from both sides: markup, and script (properties, `.data`,
  events); the accessibility suite covers it.
- Every default style in `:where()`; a demo card in `demo/examples/` and
  `demo/index.html`; README's element table and CHANGELOG updated.

## Non-goals

- No build step and no runtime dependencies (the roadmap's statistics
  transforms would load `@johnhenry/math` dynamically, only when used).
- No canvas or WebGL rendering in the core: marks are elements. A canvas
  mark for very large data is on the roadmap as an addition.

## Releases

Bump `version` in `package.json` in a PR, add a dated `CHANGELOG.md`
entry, merge, then `gh release create v<version>` (fires
`.github/workflows/publish.yml`, gated on the full suite, with the `npm
view` idempotency guard). The repo's `NPM_TOKEN` secret comes from the
ecosystem repo's short-lived-token procedure (`npm-tokens/README.md`).
