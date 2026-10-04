import { PlotLayer } from "../layer.mjs";
import { reflect } from "../reflect.mjs";

const ATTRIBUTES = { scale: "string", ticks: 0, label: "string", grid: "boolean" };

const format = (value) => (typeof value === "number" ? value.toLocaleString() : String(value));

/**
 * An axis for the plot's `x` or `y` scale: tick labels in the margin, and
 * optionally gridlines across the plotting area. Plain spans, styled with
 * CSS.
 *
 * @tag plot-axis
 * @summary Tick labels and gridlines for one of the plot's scales.
 *
 * @attr {"x" | "y"} scale - Which scale. Default `x`.
 * @attr {number} ticks - About how many ticks, on a numeric scale. Default (0): 6 for x, 5 for y.
 * @attr {string} label - A title for the axis.
 * @attr {boolean} grid - Draw gridlines at the ticks.
 */
export default class PlotAxis extends PlotLayer {
  static observedAttributes = Object.keys(ATTRIBUTES);

  draw(context) {
    super.draw(context);
    const which = this.getAttribute("scale") === "y" ? "y" : "x";
    const scale = context.scales[which];
    const parts = [];
    if (scale) {
      const count = Number(this.getAttribute("ticks")) || (which === "x" ? 6 : 5);
      for (const value of scale.ticks(count)) {
        const at = String(Math.round(scale(value) * 1e4) / 1e4);
        if (this.hasAttribute("grid")) parts.push(span("plot-gridline", at));
        parts.push(span("plot-tick", at, format(value)));
      }
    }
    const label = this.getAttribute("label");
    if (label) parts.push(span("plot-axis-label", null, label));
    this.replaceChildren(...parts);
  }
}

reflect(PlotAxis, ATTRIBUTES);

function span(className, at, text) {
  const element = document.createElement("span");
  element.className = className;
  if (at !== null) element.style.setProperty("--at", at);
  if (text !== undefined) element.textContent = text;
  return element;
}
