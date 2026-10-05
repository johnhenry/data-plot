# plot-marks

One element per row: a copy of the `<template>` inside (or a dot), given
its position and color as CSS custom properties, so ordinary CSS places
and styles it. Any element can be a mark: a span, a bar, an SVG, a
`<chernoff-face>`.

## Usage

```html
<data-plot>
  <datalist>
    <option label="Mon" value="3"></option>
    <option label="Tue" value="5"></option>
  </datalist>
  <plot-marks x="label" y="value" key="label">
    <template><div class="bar" title="{label}: {value}"></div></template>
  </plot-marks>
</data-plot>
```

```css
data-plot > plot-marks > .bar {
  bottom: 0;
  translate: -50% 0;
  block-size: calc(var(--y) * 100%);
  inline-size: calc(var(--bandwidth) * 100%);
  background: var(--color, steelblue);
}
```

## What a mark gets

| Custom property | From | Meaning |
|---|---|---|
| `--x`, `--y` | `x`, `y` | 0–1, from the left and from the bottom |
| `--bandwidth`, `--bandheight` | a banded x or y | The band's share of the width or height |
| `--x2`, `--x-start`, `--x-length` | `x2` | A range's other end, its left end, and its width |
| `--y2`, `--y-start`, `--y-length` | `y2` | The same, vertically |
| `--color` | `color` | A CSS color |
| `--size` | `size` | 0–1 |
| `--index`, `--count` | `repeat` | Which copy of the row, and how many |

The default CSS places a mark at `--x`/`--y`, centered, and stretches a
range between its ends. Rows with no position on a positioned axis get no
mark.

## Template bindings

- `:attr="field"` sets `attr` to the row's `field`, scaled 0–1 (on the
  plot's scale when a channel uses that field). That's how a glyph's
  features follow data: `<chernoff-face :smile="morale">`.
- `{field}`, in an attribute or in text, fills in the raw value.

From script, `mark = (row, previous) => element` builds marks instead of
the template; return `previous` to update it in place.

## API

<!-- api:start (generated from custom-elements.json by `npm run manifest`; edit the JSDoc instead) -->

### Attributes

| Attribute | Property | Type | Description |
|---|---|---|---|
| `x` | `x` | `string` | Field for horizontal position. Sets `--x` (0 left … 1 right) and, on a banded scale, `--bandwidth`. |
| `y` | `y` | `string` | Field for vertical position. Sets `--y` (0 bottom … 1 top) and `--bandheight`. |
| `x2` | `x2` | `string` | Field for the other end of a horizontal range, on x's scale. Sets `--x2`, and `--x-start`/`--x-length` (the range's left end and width), which the default CSS uses to stretch the mark. |
| `y2` | `y2` | `string` | Field for the other end of a vertical range. Sets `--y2`, `--y-start`, and `--y-length`. |
| `color` | `color` | `string` | Field for color. Sets `--color`. |
| `size` | `size` | `string` | Field for size. Sets `--size` (0 … 1). |
| `key` | `key` | `string` | Field that identifies a row across updates. Default: its position. |
| `repeat` | `repeat` | `string` | Field with a count: the row is stamped that many times (a unit or waffle chart). Each copy gets `--index` and `--count`. |
| `src` | `src` | `string` | `#id` of a `<table>`, `<datalist>`, or JSON `<script>` with this layer's own rows. Default: one inside it, else its plot's rows. |
| `column-field` | `columnField` | `string` | Reads a grid table, as on `<data-plot>`. |
| `value-field` | `valueField` | `string` | See `column-field`. |

### Properties

| Property | Type | Description |
|---|---|---|
| `mark` | `((row: object, previous?: Element) => Element) \| null` | Builds marks from script instead of a `<template>`: called as `mark(row, previous)` for each row, with the element that row had last time (or undefined); returns its element (the same one, to update it in place). Positions and colors are set on whatever it returns. Null goes back to the template. |
| `x` | `string` | Mirrors the `x` attribute. |
| `x2` | `string` | Mirrors the `x2` attribute. |
| `y` | `string` | Mirrors the `y` attribute. |
| `y2` | `string` | Mirrors the `y2` attribute. |
| `color` | `string` | Mirrors the `color` attribute. |
| `size` | `string` | Mirrors the `size` attribute. |
| `key` | `string` | Mirrors the `key` attribute. |
| `repeat` | `string` | Mirrors the `repeat` attribute. |
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

<!-- api:end -->

## Notes

- Rows keep their element between draws, by `key` or else by position, and
  the position properties are registered, so a CSS transition animates
  updates.
- Alone (outside a plot), it has no positions, only `color`: a grid of
  glyphs or a waffle chart, laid out by your CSS.
