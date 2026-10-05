// Generated from custom-elements.json by scripts/manifest-outputs.mjs.
// Do not edit: change the JSDoc in index.mjs and run `npm run manifest`.

/** A plot's frame: holds the data, works out one scale per channel from
 * what its layers ask for (across every layer's rows), and has every layer
 * draw on those scales. */
export default class DataPlot extends HTMLElement {
  /** The scales from the last draw, by channel (`x`, `y`, `color`, `size`). */
  scales: Record<string, Function>;
  /** The plot's rows: from `src`, a source inside it, or set here. Setting it (any iterable of objects or arrays) replots, until `src` changes or it's set to null. Changing the array in place needs `requestRender()`. */
  data: Record<string, unknown>[];
  /** Redraws on the next microtask; several requests in one task draw once. */
  requestRender(): void;
  /** Draws every layer now, then fires `render`. */
  render(): void;
  src: string;
  xDomain: string;
  yDomain: string;
  xPadding: number;
  yPadding: number;
  columnField: string;
  valueField: string;
}

declare global {
  interface HTMLElementTagNameMap {
    "data-plot": DataPlot;
  }
}
