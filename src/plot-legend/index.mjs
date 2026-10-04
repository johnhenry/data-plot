import PlotLayer from "../layer.mjs";

/**
 * A key to the plot's colors: a swatch per category, or a gradient with
 * its ends for numbers. Empty when nothing is colored.
 *
 * @tag plot-legend
 * @summary A key to the plot's colors.
 *
 * @attr {string} label - A title for the legend.
 */
export default class PlotLegend extends PlotLayer {
  static observedAttributes = ["label"];

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
