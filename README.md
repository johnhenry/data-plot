# data-plot

Plots written as HTML, for pages with no build step: the data is a
`<table>` or `<datalist>` you'd write anyway, the marks are elements you
design, and CSS places them. Custom elements, no dependencies.

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

- **`<data-plot>`** is the frame: it holds the data, builds one scale per
  channel its layers use (linear for numbers, banded for anything else,
  categorical or sequential for color), and has every layer draw on them.
- **Layers** draw inside it: `<plot-marks>` (one element per row),
  `<plot-line>` (a line per series), `<plot-axis>`, and `<plot-legend>`.
- **A mark is any element.** `<plot-marks>` copies its `<template>` once
  per row and sets custom properties: `--x` and `--y` (0–1, from the left
  and the bottom), `--color`, `--size`, `--bandwidth`/`--bandheight` on a
  banded scale, and for ranges (`x2`, `y2`) `--x-start`/`--x-length` and
  the same for y. CSS places it. A bar is a mark that CSS stretches down
  to the axis.
- **Two template bindings, both plain HTML:** `:smile="profit"` sets
  `smile` to the row's `profit` scaled 0–1 (on the plot's scale for that
  field, if a channel uses it), and `title="{name}"` (or `{name}` in
  text) fills in the raw value. With `:attr`, any element whose
  attributes are 0–1 numbers becomes a glyph, like `<chernoff-face>`.
- **`repeat="field"`** stamps a row once per unit (`--index`, `--count`):
  waffle and pictogram charts.
- **Updates animate.** Rows keep their element between draws (by `key`,
  else by position), and the position properties are registered, so a
  CSS transition moves them.

## Data

Every element that takes data follows one rule:

1. **`.data`**, set from script, wins, until `src` changes or it's set to
   null.
2. Else **`src="#id"`** names a source in the page.
3. Else a **source inside the element**.
4. Else a layer uses **its plot's rows**. (A layer with its own rows still
   draws on the plot's scales, which cover every layer's rows.)

Sources, all HTML:

- **`<table>`**: the visible, accessible one. A long table (a row per data
  point) is read as is; a grid table (a row per item, a column per
  category, like a heatmap written out) with `column-field="month"
  value-field="mm"`. A cell can show one thing and carry another with
  `data-value`, `<data value>`, or `<time datetime>`.
- **`<datalist>`**: the hidden one. Each `<option>` is a row with `label`,
  `value`, and a field per `data-*` attribute (`data-start-week` is
  `startWeek`).
- **`<script type="application/json">`**: JSON, used as written (tables
  and datalists turn numeric text into numbers).

A source is read once and watched once, however many elements use it,
and editing it (by hand or from script) redraws all of them.

## HTML or script, the same API

- **Every attribute has a matching property**: `marks.x = "rain"`,
  `plot.yDomain = "0 auto"`, `axis.grid = true`.
- **`.data`** puts rows in from script, and reads back the current rows
  whatever their source. Assign a new array to redraw; after changing one
  in place, call **`requestRender()`** (every element has it).
- **`marks.mark = (row, previous) => element`** builds marks in script
  instead of a `<template>`; return `previous` to update it in place.
  Positions and colors are set on whatever it returns.
- **`render`** fires after each draw (on the plot, or on a layer drawing
  alone); **`error`** when a source can't be read, keeping the last
  drawing; **`.scales`** on the plot after a draw.

## Accessibility

It follows the data. When the data is a readable table (inside the plot,
or visible in the page), the drawing only repeats it, so it's hidden from
assistive technology. Otherwise the drawing has to say what it shows:
give it an `aria-label` and it becomes `role="img"`; without one, a
console warning. Set your own `role` (a `group` of labelled figures, say)
and it's left alone.

## Styling

Everything is in the light DOM, and every default rule is wrapped in
`:where()`, so any page CSS overrides it.

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
