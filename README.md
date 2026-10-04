# markable (prototype)

Plots written as HTML, for pages with no build step. A working name: this
is a prototype to judge the API before anything moves out of domkit.

```html
<link rel="stylesheet" href="src/index.css" />
<script type="module" src="src/global.mjs"></script>

<data-plot>
  <table>
    <thead><tr><th>city</th><th>rain</th><th>sun</th></tr></thead>
    <tbody>
      <tr><td>Lisbon</td><td>690</td><td>2800</td></tr>
      <tr><td>Oslo</td><td>760</td><td>1670</td></tr>
    </tbody>
  </table>
  <plot-axis scale="x" label="Rain" grid></plot-axis>
  <plot-axis scale="y" label="Sun" grid></plot-axis>
  <plot-marks x="rain" y="sun"></plot-marks>
</data-plot>
```

## The idea

A plot maps data fields onto a mark's attributes through scales.

- **`<data-plot>`** reads rows (a `<table>` inside it, `data="#id"` naming a
  table or a JSON `<script>`, inline JSON, or the `.data` property) and
  builds one scale per channel its layers use: linear for numbers, banded
  for anything else, categorical or sequential for color.
- **Layers** draw inside it, all on the same scales:
  `<plot-marks>` (one element per row), `<plot-line>` (a line per series),
  `<plot-axis>`, and `<plot-legend>`.
- **A mark is any element.** `<plot-marks>` copies its `<template>` once
  per row and sets custom properties: `--x` and `--y` (0–1, from the left
  and the bottom), `--color`, `--size`, and on a banded scale
  `--bandwidth`/`--bandheight`. CSS places it. A bar is a mark that CSS
  stretches down to the axis, so there's no bar element.
- **Two template bindings, both plain HTML:** `:smile="profit"` sets
  `smile` to the row's `profit` scaled 0–1 across the data, and
  `title="{name}"` (or `{name}` in text) fills in the raw value. With `:attr`,
  any element whose attributes are 0–1 numbers becomes a glyph, like
  `<chernoff-face>` (copied here from domkit for the prototype).
- **Updates animate.** Rows keep their element between draws (by `key`,
  else by position), and `--x`/`--y`/`--size` are registered properties,
  so a CSS transition moves them. Editing the table replots.
- **Accessible by default.** When the data is a readable table, it stays
  available to screen readers and the drawing is hidden from them.
- **Ranges:** `x2`/`y2` give a mark a second end on the same scale
  (`--x-start`, `--x-length`, and the same for y), and the default CSS
  stretches it between them: Gantt bars, dumbbells, error bars.
- **`repeat="field"`** stamps a row once per unit (`--index`, `--count`):
  waffle and pictogram charts.
- **`<plot-marks>` works alone**, with its own `data`: a grid of glyphs,
  laid out by your CSS, with `color` still applied.

## Not yet

Time and log scales, areas, stacking, transforms (histograms, box plots,
density, trends), pies, facets, and layouts for trees, flows, networks,
and maps: see [docs/roadmap.md](docs/roadmap.md). `<scatter-plot>` in
domkit is what `<data-plot>` + `<plot-marks>` replaces.

## Working on it

```bash
npm run serve        # http://localhost:4739/demo/
npm test             # scales
npm run test:browser # elements, in Chromium, Firefox, and WebKit
```
