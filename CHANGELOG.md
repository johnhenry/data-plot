# Changelog

## 0.2.0 — band and categorical overrides, themeable ramp (2026-10-20)

- `x-type` / `y-type` on `<data-plot>`: `band` makes numeric codes (years as
  labels, ids, groups) a banded scale instead of a linear one, so no
  invisible-character workaround is needed; `linear` plots only the numbers.
  `position()` takes the same as a fourth argument. Fixes #6.
- `color-type`: `categorical` gives each distinct number its own palette
  color (`color()` takes `{ type }`). Fixes #6.
- `color-low` / `color-high` set the sequential ramp's ends (any CSS color,
  `var(...)` included); the legend's gradient is themeable with
  `--plot-ramp-low`, `--plot-ramp-high`, or a whole `--plot-ramp`. Fixes #7.

## 0.1.0 — properties set before define (2026-10-09)

- Fix: a property assigned to an element before its class was defined (a
  lazily imported `data-plot`) was ignored after the upgrade, because the
  own property shadowed the class's accessor: `plotMarks.mark = fn` rendered
  default `plot-dot` spans. Every element now moves such values back through
  its setters when it upgrades. Covers every public property of
  `<data-plot>`, `<plot-marks>`, `<plot-line>`, `<plot-axis>`,
  `<plot-legend>`, and `<chernoff-face>` (including `data`, `mark`, and
  `features`). Fixes #4.
- This is a minor bump because `^0.0.0` matches only 0.0.0: a consumer
  declaring `^0.0.0` will not pick this up and must move to `^0.1.0`.

## 0.0.0 — first version (2026-10-04)

The first version: plots written as HTML.

- `<data-plot>`, the frame: data, one scale per channel (linear, banded,
  categorical and sequential color), and the layers drawn in it.
- `<plot-marks>` (template marks placed by `--x`/`--y`, ranges with
  `x2`/`y2`, `repeat`), `<plot-line>`, `<plot-axis>`, `<plot-legend>`.
- Data from a `<table>` (long or grid), a `<datalist>`, a JSON `<script>`,
  or `.data`, read once and watched once per source.
- `:attr` and `{field}` template bindings; `.mark` builds marks from script.
- `<chernoff-face>`, moved here from
  [`@johnhenry/domkit`](https://github.com/johnhenry/domkit) with its
  history. Its CSS properties are now `--chernoff-face-fill` and
  `--chernoff-face-stroke`, and it no longer reads domkit's
  `--domkit-accent`.
- Replaces domkit's `<scatter-plot>` (its history is here too):
  `<data-plot>` with `<plot-marks>` does what it did, on real scales.
  Pull request numbers in the carried-over history refer to
  johnhenry/domkit.
