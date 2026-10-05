# plot-axis

Tick labels for one of the plot's scales, in the margin, and optionally
gridlines across the plotting area. Plain spans, styled with CSS.

## Usage

```html
<data-plot>
  …
  <plot-axis scale="x" label="Week" grid></plot-axis>
  <plot-axis scale="y" ticks="4"></plot-axis>
</data-plot>
```

## API

<!-- api:start (generated from custom-elements.json by `npm run manifest`; edit the JSDoc instead) -->

### Attributes

| Attribute | Property | Type | Description |
|---|---|---|---|
| `scale` | `scale` | `"x" \| "y"` | Which scale. Default `x`. |
| `ticks` | `ticks` | `number` | About how many ticks, on a numeric scale. Default (0): 6 for x, 5 for y. |
| `label` | `label` | `string` | A title for the axis. |
| `grid` | `grid` | `boolean` | Draw gridlines at the ticks. |

### Properties

| Property | Type | Description |
|---|---|---|
| `scale` | `string` | Mirrors the `scale` attribute. |
| `ticks` | `number` | Mirrors the `ticks` attribute. |
| `label` | `string` | Mirrors the `label` attribute. |
| `grid` | `boolean` | Mirrors the `grid` attribute. |
| `plot` (read-only) | `HTMLElement \| null` | The `<data-plot>` this layer is directly inside, or null. |

### Methods

| Method | Description |
|---|---|
| `requestRender()` | Redraws soon: through its plot, or by itself when it can draw alone. Several requests in one task draw once. |

<!-- api:end -->

## Styling

| Selector | Matches |
|---|---|
| `.plot-tick` | A tick label, at `--at` (0–1) |
| `.plot-gridline` | A gridline, with `grid` |
| `.plot-axis-label` | The `label` |

## Notes

- Numeric ticks fall on nice values (1, 2, or 5 × 10ⁿ); a banded scale gets
  one tick per category.
