# plot-legend

A key to the plot's colors: a swatch per category, or a gradient with its
ends for numbers. Empty when nothing is colored.

## Usage

```html
<data-plot>
  …
  <plot-marks x="rain" y="sun" color="region"></plot-marks>
  <plot-legend label="Region"></plot-legend>
</data-plot>
```

## API

<!-- api:start (generated from custom-elements.json by `npm run manifest`; edit the JSDoc instead) -->

### Attributes

| Attribute | Property | Type | Description |
|---|---|---|---|
| `label` | `label` | `string` | A title for the legend. |

### Properties

| Property | Type | Description |
|---|---|---|
| `label` | `string` | Mirrors the `label` attribute. |
| `plot` (read-only) | `HTMLElement \| null` | The `<data-plot>` this layer is directly inside, or null. |

### Methods

| Method | Description |
|---|---|
| `requestRender()` | Redraws soon: through its plot, or by itself when it can draw alone. Several requests in one task draw once. |

<!-- api:end -->

## Styling

Inside a plot it sits at the top right; `.plot-legend-item`, `.plot-swatch`
(with `--color`), and `.plot-ramp` (with `--low`/`--high`) are its parts.
