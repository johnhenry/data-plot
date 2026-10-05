# Changelog

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
