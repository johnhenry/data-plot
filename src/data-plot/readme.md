# data-plot

A plot's frame. It holds the data, works out one scale per channel from
what its layers ask for, and has every layer inside it draw on those
scales: `<plot-marks>`, `<plot-line>`, `<plot-axis>`, `<plot-legend>`.

## Usage

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

## Data

One rule, for the plot and for any layer with data of its own:

1. `.data`, set from script, wins, until `src` changes or it's set to null.
2. Else `src="#id"` names a `<table>`, `<datalist>`, or
   `<script type="application/json">` in the page.
3. Else one of those inside the element.
4. Else a layer uses its plot's rows.

A **long table** (a row per data point) is read as is; a **grid table** (a
row per item, a column per category) with `column-field` and
`value-field`. A cell can show one thing and carry another with
`data-value`, `<data value>`, or `<time datetime>`. In a
**datalist**, each `<option>` is a row with `label`, `value`, and a field
per `data-*` attribute. Tables and datalists turn numeric text into
numbers; JSON is used as written. Each source is read once and watched
once, and editing it redraws every element that uses it.

## Scales

Each channel a layer uses (`x` and `x2`, `y` and `y2`, `color`,
`size`) gets one scale across every layer's rows: linear for numbers,
rounded out to nice ticks (pin either end with `x-domain`/`y-domain`,
like `0 auto`), and banded for anything else (`x-padding`/`y-padding`
set the gaps). Banded y reads top to bottom, like a table. Color is
categorical for text and a ramp for numbers. The scales from the last
draw are on `.scales`.

## Accessibility

When the data is a readable table (inside the plot, or visible in the
page), the layers are hidden from assistive technology: the table already
says it. Otherwise give the plot an `aria-label` (or `aria-labelledby`) and
it becomes `role="img"`; without one, a console warning.

## API

<!-- api:start (generated from custom-elements.json by `npm run manifest`; edit the JSDoc instead) -->

### Attributes

| Attribute | Property | Type | Description |
|---|---|---|---|
| `src` | `src` | `string` | `#id` of a `<table>`, `<datalist>`, or `<script type="application/json">` in the page. Default: one inside the plot. |
| `x-domain` | `xDomain` | `string` | The x scale's ends, like `0 100` (`auto` keeps one end automatic). Numbers only. |
| `y-domain` | `yDomain` | `string` | The y scale's ends, like `0 auto`. |
| `x-padding` | `xPadding` | `number` | On a banded x scale, the share of each band left empty, 0–1. Default 0.2. |
| `y-padding` | `yPadding` | `number` | The same for a banded y scale. |
| `column-field` | `columnField` | `string` | With `value-field`, reads a grid table (a row per item, a column per category): its column headers become this field. |
| `value-field` | `valueField` | `string` | With `column-field`: the field each cell's value becomes. |

### Properties

| Property | Type | Description |
|---|---|---|
| `scales` | `Record<string, Function>` | The scales from the last draw, by channel (`x`, `y`, `color`, `size`). |
| `data` | `object[]` | The plot's rows: from `src`, a source inside it, or set here. Setting it (any iterable of objects or arrays) replots, until `src` changes or it's set to null. Changing the array in place needs `requestRender()`. |
| `src` | `string` | Mirrors the `src` attribute. |
| `xDomain` | `string` | Mirrors the `x-domain` attribute. |
| `yDomain` | `string` | Mirrors the `y-domain` attribute. |
| `xPadding` | `number` | Mirrors the `x-padding` attribute. |
| `yPadding` | `number` | Mirrors the `y-padding` attribute. |
| `columnField` | `string` | Mirrors the `column-field` attribute. |
| `valueField` | `string` | Mirrors the `value-field` attribute. |

### Methods

| Method | Description |
|---|---|
| `requestRender()` | Redraws on the next microtask; several requests in one task draw once. |
| `render()` | Draws every layer now, then fires `render`. |

### Events

| Event | Description |
|---|---|
| `render` | After every draw. |
| `error` | The data couldn't be read (bad JSON, or an unsupported `src`). An `ErrorEvent`; the previous data stays plotted. |

### CSS custom properties

| Property | Description |
|---|---|
| `--plot-margin` | Space around the plotting area for axes, like `inset`. Default `16px 16px 32px 48px`. |
| `--plot-height` | Default height. Default `300px`. |

<!-- api:end -->

## Styling

| Selector | Matches |
|---|---|
| `data-plot` | The frame: `position: relative`, `--plot-height` tall |
| `data-plot > plot-*` | Each layer, inset by `--plot-margin` |
| `table[data-plot-source]` | A table inside a plot: hidden visually, still read aloud |

Every default in `index.css` is wrapped in `:where()`, so page CSS wins.

## Notes

- Several changes in one task draw once. After changing `.data` in place,
  call `requestRender()`; assigning a new array redraws by itself.
- `render` fires after every draw; `error` when a source can't be read, and
  the last drawing stays.
