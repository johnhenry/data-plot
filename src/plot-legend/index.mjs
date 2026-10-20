import { upgradeProperties } from "../upgrade.mjs";
import { PlotLayer } from "../layer.mjs";
import { reflect } from "../reflect.mjs";

const ATTRIBUTES = { label: "string" };

/**
 * A key to the plot's colors: a swatch per category, or a gradient with
 * its ends for numbers. Empty when nothing is colored.
 *
 * Theme the gradient with `--plot-ramp-low` and `--plot-ramp-high`, or
 * replace it (several stops, another direction) with `--plot-ramp`; set
 * the data's own ends with `color-low` / `color-high` on `<data-plot>`.
 *
 * @tag plot-legend
 * @summary A key to the plot's colors.
 *
 * @attr {string} label - A title for the legend.
 *
 * @prop {string} label
 *
 * @cssprop --plot-ramp-low - The gradient's low end. Default: the color scale's.
 * @cssprop --plot-ramp-high - The gradient's high end. Default: the color scale's.
 * @cssprop --plot-ramp - The whole gradient background, like `linear-gradient(to right, red, yellow, green)`.
 */
export default class PlotLegend extends PlotLayer {
  static observedAttributes = Object.keys(ATTRIBUTES);

  constructor() {
    super();
    // Properties assigned before this element was defined.
    upgradeProperties(this);
  }

  /** @protected */
  draw(context) {
    super.draw(context);
    const scale = context.scales.color;
    const parts = [];
    const label = this.getAttribute("label");
    if (label && scale) parts.push(Object.assign(document.createElement("span"), { className: "plot-legend-label", textContent: label }));
    if (scale?.type === "categorical") {
      for (const value of scale.domain) {
        const item = Object.assign(document.createElement("span"), { className: "plot-legend-item" });
        const swatch = Object.assign(document.createElement("span"), { className: "plot-swatch" });
        swatch.style.setProperty("--color", scale(value));
        item.append(swatch, String(value));
        parts.push(item);
      }
    } else if (scale) {
      const [min, max] = scale.domain;
      const ramp = Object.assign(document.createElement("span"), { className: "plot-ramp" });
      ramp.style.setProperty("--low", scale(min));
      ramp.style.setProperty("--high", scale(max));
      parts.push(min.toLocaleString(), ramp, max.toLocaleString());
    }
    this.replaceChildren(...parts);
  }
}

reflect(PlotLegend, ATTRIBUTES);
