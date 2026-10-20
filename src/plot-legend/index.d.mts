// Generated from custom-elements.json by scripts/manifest-outputs.mjs.
// Do not edit: change the JSDoc in index.mjs and run `npm run manifest`.

/** A key to the plot's colors: a swatch per category, or a gradient with
 * its ends for numbers. Empty when nothing is colored.
 * 
 * Theme the gradient with `--plot-ramp-low` and `--plot-ramp-high`, or
 * replace it (several stops, another direction) with `--plot-ramp`; set
 * the data's own ends with `color-low` / `color-high` on `<data-plot>`. */
export default class PlotLegend extends HTMLElement {
  label: string;
  /** The `<data-plot>` this layer is directly inside, or null. */
  readonly plot: HTMLElement | null;
  /** Redraws soon: through its plot, or by itself when it can draw alone. Several requests in one task draw once. */
  requestRender(): void;
}

declare global {
  interface HTMLElementTagNameMap {
    "plot-legend": PlotLegend;
  }
}
