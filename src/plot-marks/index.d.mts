// Generated from custom-elements.json by scripts/manifest-outputs.mjs.
// Do not edit: change the JSDoc in index.mjs and run `npm run manifest`.

/** One element per row: a copy of the `<template>` inside (or what `mark`
 * builds, or a dot), given its position and color as CSS custom
 * properties, so ordinary CSS places and styles it. Rows keep their element
 * between draws (by `key`, else by position), so changes can animate.
 * 
 * Inside a `<data-plot>` it draws on the plot's scales, with the plot's
 * rows unless it has its own. Alone, it has no positions (only `color`
 * applies): a grid of glyphs, laid out by your CSS. */
export default class PlotMarks extends HTMLElement {
  /** Builds marks from script instead of a `<template>`: called as
   * `mark(row, previous)` for each row, with the element that row had last
   * time (or undefined); returns its element (the same one, to update it in
   * place). Positions and colors are set on whatever it returns. Null goes
   * back to the template. */
  mark: ((row: Record<string, unknown>, previous?: Element) => Element) | null;
  x: string;
  x2: string;
  y: string;
  y2: string;
  color: string;
  size: string;
  key: string;
  repeat: string;
  src: string;
  columnField: string;
  valueField: string;
  /** The rows drawn: its own (from `src`, a source inside it, or set here), else its plot's. Setting it replots, until `src` changes or it's set to null. Changing the array in place needs `requestRender()`. */
  data: Record<string, unknown>[];
  /** Its own rows, or null when it uses its plot's. */
  readonly ownRows: Record<string, unknown>[] | null;
  /** True when its own data is a table assistive technology can read. */
  readonly readable: boolean;
  /** The `<data-plot>` this layer is directly inside, or null. */
  readonly plot: HTMLElement | null;
  /** Redraws soon: through its plot, or by itself when it can draw alone. Several requests in one task draw once. */
  requestRender(): void;
}

declare global {
  interface HTMLElementTagNameMap {
    "plot-marks": PlotMarks;
  }
}
