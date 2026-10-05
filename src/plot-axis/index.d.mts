// Generated from custom-elements.json by scripts/manifest-outputs.mjs.
// Do not edit: change the JSDoc in index.mjs and run `npm run manifest`.

/** An axis for the plot's `x` or `y` scale: tick labels in the margin, and
 * optionally gridlines across the plotting area. Plain spans, styled with
 * CSS. */
export default class PlotAxis extends HTMLElement {
  scale: string;
  ticks: number;
  label: string;
  grid: boolean;
  /** The `<data-plot>` this layer is directly inside, or null. */
  readonly plot: HTMLElement | null;
  /** Redraws soon: through its plot, or by itself when it can draw alone. Several requests in one task draw once. */
  requestRender(): void;
}

declare global {
  interface HTMLElementTagNameMap {
    "plot-axis": PlotAxis;
  }
}
