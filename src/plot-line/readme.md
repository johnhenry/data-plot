# plot-line

A line through the rows, in x order, one per value of `color`. It's an SVG
stretched over the plotting area, with strokes that keep their width.

## Usage

```html
<data-plot src="#temps" aria-label="Average temperature by month">
  <plot-axis scale="x"></plot-axis>
  <plot-axis scale="y" grid></plot-axis>
  <plot-line x="month" y="c" color="city"></plot-line>
</data-plot>
```

## API

<!-- api:start (generated from custom-elements.json by `npm run manifest`; edit the JSDoc instead) -->

### Attributes

| Attribute | Property | Type | Description |
|---|---|---|---|
| `x` | `x` | `string` | Field for horizontal position. |
| `y` | `y` | `string` | Field for vertical position. |
| `color` | `color` | `string` | Field that splits the rows into series, each its own color. |
| `src` | `src` | `string` | `#id` of a `<table>`, `<datalist>`, or JSON `<script>` with this layer's own rows. Default: one inside it, else its plot's rows. |
| `column-field` | `columnField` | `string` | Reads a grid table, as on `<data-plot>`. |
| `value-field` | `valueField` | `string` | See `column-field`. |

### Properties

| Property | Type | Description |
|---|---|---|
| `x` | `string` | Mirrors the `x` attribute. |
| `y` | `string` | Mirrors the `y` attribute. |
| `color` | `string` | Mirrors the `color` attribute. |
| `src` | `string` | Mirrors the `src` attribute. |
| `columnField` | `string` | Mirrors the `column-field` attribute. |
| `valueField` | `string` | Mirrors the `value-field` attribute. |
| `data` | `object[]` | The rows drawn: its own (from `src`, a source inside it, or set here), else its plot's. Setting it replots, until `src` changes or it's set to null. Changing the array in place needs `requestRender()`. |
| `ownRows` (read-only) | `object[] \| null` | Its own rows, or null when it uses its plot's. |
| `readable` (read-only) | `boolean` | True when its own data is a table assistive technology can read. |
| `plot` (read-only) | `HTMLElement \| null` | The `<data-plot>` this layer is directly inside, or null. |

### Methods

| Method | Description |
|---|---|
| `requestRender()` | Redraws soon: through its plot, or by itself when it can draw alone. Several requests in one task draw once. |

### Events

| Event | Description |
|---|---|
| `render` | After it draws, when alone (inside a plot, the plot fires it). |
| `error` | Its own data couldn't be read. |

### CSS custom properties

| Property | Description |
|---|---|
| `--color` | A series' color, set on its `<path>`. Default `currentColor`. |

<!-- api:end -->

## Styling

Each series is a `<path>` with `data-series` and `--color`:
`plot-line path { stroke-width: 3; }`.

## Notes

- It needs a plot's scales, so alone it draws nothing.
