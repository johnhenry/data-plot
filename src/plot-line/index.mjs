import { DataLayer } from "../layer.mjs";
import { reflect } from "../reflect.mjs";

const ATTRIBUTES = { x: "string", y: "string", color: "string", src: "string", "column-field": "string", "value-field": "string" };

const SVG = "http://www.w3.org/2000/svg";

/**
 * A line through the rows, in x order: one line per value of `color`, if
 * given. Drawn as SVG stretched over the plotting area, with strokes that
 * keep their width. It needs a plot's scales, so alone it draws nothing.
 *
 * @tag plot-line
 * @summary A line through the rows, one per series.
 *
 * @attr {string} x - Field for horizontal position.
 * @attr {string} y - Field for vertical position.
 * @attr {string} color - Field that splits the rows into series, each its own color.
 * @attr {string} src - `#id` of a `<table>`, `<datalist>`, or JSON `<script>` with this layer's own rows. Default: one inside it, else its plot's rows.
 * @attr {string} column-field - Reads a grid table, as on `<data-plot>`.
 * @attr {string} value-field - See `column-field`.
 *
 * @cssprop --color - A series' color, set on its `<path>`. Default `currentColor`.
 */
export default class PlotLine extends DataLayer {
  static observedAttributes = [...Object.keys(ATTRIBUTES), "aria-label", "aria-labelledby"];

  #svg = null;

  channels() {
    return ["x", "y", "color"].filter((channel) => this.hasAttribute(channel));
  }

  draw(context) {
    super.draw(context);
    const { rows, scales } = context;
    const [xField, yField, colorField] = ["x", "y", "color"].map((name) => this.getAttribute(name));
    if (!this.#svg) {
      this.#svg = document.createElementNS(SVG, "svg");
      this.#svg.setAttribute("viewBox", "0 0 1000 1000");
      this.#svg.setAttribute("preserveAspectRatio", "none");
      this.#svg.setAttribute("aria-hidden", "true");
    }
    if (this.#svg.parentNode !== this) this.append(this.#svg);
    const series = new Map();
    if (xField && yField && scales.x && scales.y) {
      for (const row of rows) {
        const x = scales.x(row[xField]);
        const y = scales.y(row[yField]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const name = colorField ? row[colorField] : "";
        if (!series.has(name)) series.set(name, []);
        series.get(name).push([x, y]);
      }
    }
    const paths = [...this.#svg.children];
    let i = 0;
    for (const [name, points] of series) {
      points.sort((a, b) => a[0] - b[0]);
      const path = paths[i] ?? this.#svg.appendChild(document.createElementNS(SVG, "path"));
      path.setAttribute("d", points.map(([x, y], j) => `${j ? "L" : "M"}${(x * 1000).toFixed(1)},${((1 - y) * 1000).toFixed(1)}`).join(""));
      path.setAttribute("vector-effect", "non-scaling-stroke");
      path.dataset.series = String(name);
      if (colorField && scales.color) path.style.setProperty("--color", scales.color(name));
      else path.style.removeProperty("--color");
      i++;
    }
    for (const extra of paths.slice(i)) extra.remove();
  }
}

reflect(PlotLine, ATTRIBUTES);
