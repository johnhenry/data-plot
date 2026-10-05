# data-plot

[![npm version](https://img.shields.io/npm/v/%40johnhenry%2Fdata-plot.svg)](https://www.npmjs.com/package/@johnhenry/data-plot)
[![CI](https://github.com/johnhenry/data-plot/actions/workflows/ci.yml/badge.svg)](https://github.com/johnhenry/data-plot/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/%40johnhenry%2Fdata-plot.svg)](LICENSE)

Full documentation: [opensource.johnhenry.me/data-plot](https://opensource.johnhenry.me/data-plot/)

Plots written as HTML. The data is a `<table>` or `<datalist>` you'd write
anyway, the marks are elements you design, and CSS places them:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnhenry/data-plot/src/global.mjs"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@johnhenry/data-plot/src/index.css" />

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

Before the script loads, or for a screen reader after it does, the table
is the table. Edit it and the plot follows. Custom elements, shipped as
source: no build step, no dependencies.

## Contents

- [Install](#install)
- [Elements](#elements)
- [The idea](#the-idea)
- [Data](#data)
- [HTML or script, the same API](#html-or-script-the-same-api)
- [Accessibility](#accessibility)
- [Styling](#styling)
- [Adding a new layer](#adding-a-new-layer)
- [Not yet](#not-yet)
- [Family](#family)
- [License](#license)

## Install

No install is needed: load it from a CDN, as above. `global.mjs` registers
every element; each element also has its own
(`@johnhenry/data-plot/plot-marks/global.mjs`). With npm:

```bash
npm install @johnhenry/data-plot
```

```js
import "@johnhenry/data-plot/global.mjs"; // registers every element
import { DataPlot, PlotMarks, linear, band } from "@johnhenry/data-plot"; // or the classes and scales
```

It ships TypeScript declarations, a `custom-elements.json` manifest, and
VS Code autocomplete data (`vscode.html-custom-data.json`).

**Provenance.** `<chernoff-face>` and the scatter plot that `<data-plot>`
grew from were developed in
[`@johnhenry/domkit`](https://github.com/johnhenry/domkit) (and before that
`johnhenry/lib`, as `xy-grapher` and an experimental `chernoff-face`), and
moved here with their history. Earlier forms of both shipped in domkit
0.0.0 through 0.0.4; `0.0.0` is data-plot's first version.

## Elements

| Element | What it's for |
|---|---|
| [`<data-plot>`](src/data-plot/readme.md) | The frame: data, one scale per channel, and the layers drawn in it |
| [`<plot-marks>`](src/plot-marks/readme.md) | One element per row, from a template, placed with CSS custom properties |
| [`<plot-line>`](src/plot-line/readme.md) | A line through the rows, one per series |
| [`<plot-axis>`](src/plot-axis/readme.md) | Tick labels and gridlines for one of the plot's scales |
| [`<plot-legend>`](src/plot-legend/readme.md) | A key to the plot's colors |
| [`<chernoff-face>`](src/chernoff-face/readme.md) | A face whose features show data, each a number from 0 to 1 |

Every attribute, property, event, and CSS property:
[docs/reference.md](docs/reference.md). A live gallery, with each example's
source beside it: `npm run serve`, then `/demo/`.

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

## Adding a new layer

A layer is a custom element inside `<data-plot>` that draws from the
plot's rows and scales. Extend `PlotLayer` (draws only inside a plot) or
`DataLayer` (can also bring its own rows and draw alone), both exported:

```js
import { PlotLayer } from "@johnhenry/data-plot";

// <plot-rule value="2000">: a horizontal reference line at a y value.
class PlotRule extends PlotLayer {
  static observedAttributes = ["value"];
  // Called by the plot with { rows, scales, unit, describedByTable }.
  draw(context) {
    super.draw(context); // keeps aria-hidden in step with the data
    const y = context.scales.y?.(Number(this.getAttribute("value")));
    if (Number.isFinite(y)) this.style.setProperty("--y", String(y));
    if (!this.firstElementChild) this.append(document.createElement("span"));
  }
}
customElements.define("plot-rule", PlotRule);
```

```css
/* The layer fills the plotting area; the line sits at --y within it. */
plot-rule > span { position: absolute; inset-inline: 0; bottom: calc(var(--y) * 100%); border-block-start: 2px dashed; }
```


- A layer that maps fields lists them in `channels()` (`x`, `x2`, `y`,
  `y2`, `color`, `size`), so the plot's scales cover its rows too; this
  one only reads the y scale the other layers made.
- Every child of the frame (except sources and the legend) fills the
  plotting area, so a layer draws inside it. Draw by setting custom
  properties and let CSS place things, as
  `<plot-marks>` does; keep elements between draws so updates animate.
- Call `requestRender()` when an attribute changes; the base classes do it
  for `observedAttributes`.
- Give it JSDoc (`@tag`, `@attr`, `@prop`, `@fires`), a `readme.md` with
  the API markers, and tests in all three engines, then `npm run manifest`.

## Not yet

Time and log scales, areas, stacking, transforms (histograms, box plots,
density, trends), pies, facets, and layouts for trees, flows, networks,
and maps: see [docs/roadmap.md](docs/roadmap.md).

## Family

data-plot came out of [domkit](https://github.com/johnhenry/domkit) and
meets its siblings in the page rather than importing them:

- **[domkit](https://github.com/johnhenry/domkit)**: where
  `<scatter-plot>` and `<chernoff-face>` started. Its elements (tabs,
  hot keys, `<frame-timer>`) sit beside plots; data-plot imports none of
  them.
- **[canvas-fx](https://github.com/johnhenry/canvas-fx)**: any element is
  a mark, so a `<pixel-sprite>` can be one; and where HTML-in-canvas is
  on (experimental, behind a flag), a plot inside `<pixel-canvas html>`
  takes its effects.
- **[htmlbuilder](https://github.com/johnhenry/htmlbuilder)**: loads
  libraries from their `custom-elements.json`, so data-plot's elements,
  attributes, and snippets come up there like any other library's.
- **[math](https://github.com/johnhenry/math)**: planned. The statistical
  transforms in the roadmap (density, regression) would load
  `@johnhenry/math` only when used.

## License

MIT
