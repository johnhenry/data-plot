// Generated from custom-elements.json by scripts/manifest-outputs.mjs.
// Do not edit: change the JSDoc in index.mjs and run `npm run manifest`.

/** A line through the rows, in x order: one line per value of `color`, if
 * given. Drawn as SVG stretched over the plotting area, with strokes that
 * keep their width. It needs a plot's scales, so alone it draws nothing. */
export default class PlotLine extends HTMLElement {
  x: string;
  y: string;
  color: string;
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
    "plot-line": PlotLine;
  }
}
