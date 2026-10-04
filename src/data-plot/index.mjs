import { DataBinding, sourceChildrenChanged } from "../source.mjs";
import { FRAME, describe } from "../layer.mjs";
import { reflect } from "../reflect.mjs";
import { position, color, linear, extent, isNumeric, unitScale } from "../scale.mjs";

// x2 and y2 are the far ends of a range, on the same scale as x and y.
const AXIS = { x: "x", x2: "x", y: "y", y2: "y", color: "color", size: "size" };

const ATTRIBUTES = {
  src: "string",
  "x-domain": "string",
  "y-domain": "string",
  "x-padding": 0.2,
  "y-padding": 0.2,
  "column-field": "string",
  "value-field": "string",
};

/**
 * A plot's frame: holds the data, works out one scale per channel from
 * what its layers ask for (across every layer's rows), and has every layer
 * draw on those scales.
 *
 * @tag data-plot
 * @summary A plot's frame: data, scales, and the layers drawn in it.
 *
 * @attr {string} src - `#id` of a `<table>`, `<datalist>`, or `<script type="application/json">` in the page. Default: one inside the plot.
 * @attr {string} x-domain - The x scale's ends, like `0 100` (`auto` keeps one end automatic). Numbers only.
 * @attr {string} y-domain - The y scale's ends, like `0 auto`.
 * @attr {number} x-padding - On a banded x scale, the share of each band left empty, 0–1. Default 0.2.
 * @attr {number} y-padding - The same for a banded y scale.
 * @attr {string} column-field - With `value-field`, reads a grid table (a row per item, a column per category): its column headers become this field.
 * @attr {string} value-field - With `column-field`: the field each cell's value becomes.
 *
 * @fires render - After every draw.
 * @fires error - The data couldn't be read (bad JSON, or an unsupported `src`). An `ErrorEvent`; the previous data stays plotted.
 *
 * @cssprop --plot-margin - Space around the plotting area for axes, like `inset`. Default `16px 16px 32px 48px`.
 * @cssprop --plot-height - Default height. Default `300px`.
 */
export default class DataPlot extends HTMLElement {
  static observedAttributes = [...Object.keys(ATTRIBUTES), "aria-label", "aria-labelledby"];

  [FRAME] = true;

  #binding = new DataBinding(this, () => this.requestRender());
  #children = null;
  #pending = false;

  /** The scales from the last draw, by channel (`x`, `y`, `color`, `size`). @type {Record<string, Function>} */
  scales = {};

  connectedCallback() {
    this.#binding.connect();
    this.#children ??= new MutationObserver((records) => {
      if (sourceChildrenChanged(records)) this.#binding.connect();
      this.requestRender();
    });
    // Layers or sources arriving or leaving.
    this.#children.observe(this, { childList: true });
    this.requestRender();
  }

  disconnectedCallback() {
    this.#binding.disconnect();
    this.#children?.disconnect();
  }

  attributeChangedCallback(name, previous, value) {
    if (previous === value) return;
    if (name === "src") this.#binding.property = null;
    else if ((name === "column-field" || name === "value-field") && this.isConnected) this.#binding.connect();
    this.requestRender();
  }

  /** The plot's rows: from `src`, a source inside it, or set here. Setting it (any iterable of objects or arrays) replots, until `src` changes or it's set to null. Changing the array in place needs `requestRender()`. @type {object[]} */
  get data() {
    return this.#binding.rows ?? [];
  }
  set data(rows) {
    this.#binding.property = rows;
    this.requestRender();
  }

  /** Redraws on the next microtask; several requests in one task draw once. */
  requestRender() {
    if (this.#pending) return;
    this.#pending = true;
    queueMicrotask(() => {
      this.#pending = false;
      if (this.isConnected) this.render();
    });
  }

  /** Draws every layer now, then fires `render`. */
  render() {
    const rows = this.data;
    const layers = [...this.children].filter((child) => typeof child.draw === "function");
    const rowsOf = (layer) => layer.ownRows ?? rows;
    // Every field each axis shows, with the rows it comes from.
    const uses = { x: [], y: [], color: [], size: [] };
    for (const layer of layers) {
      for (const channel of layer.channels?.() ?? []) {
        const field = layer.getAttribute(channel);
        if (field && AXIS[channel]) uses[AXIS[channel]].push([field, rowsOf(layer)]);
      }
    }
    const values = (axis) => uses[axis].flatMap(([field, from]) => from.map((row) => row[field]));
    const scales = {};
    if (uses.x.length) scales.x = position(values("x"), this.getAttribute("x-domain"), this.xPadding);
    if (uses.y.length) scales.y = position(values("y"), this.getAttribute("y-domain"), this.yPadding);
    // Categories read top to bottom, like the table they came from.
    if (scales.y?.type === "band") {
      const band = scales.y;
      scales.y = Object.assign((value) => 1 - band(value), band);
    }
    if (uses.color.length) scales.color = color(values("color"));
    if (uses.size.length) scales.size = linear(extent(values("size").filter(isNumeric)));
    this.scales = scales;
    // :attr bindings share a channel's scale when one covers the field.
    const fixed = new Map();
    for (const axis of ["x", "y", "size"]) {
      if (scales[axis]?.type === "linear") for (const [field] of uses[axis]) if (!fixed.has(field)) fixed.set(field, scales[axis]);
    }
    const unit = unitScale([rows, ...layers.map((layer) => layer.ownRows).filter(Boolean)], fixed);
    const readable = this.#binding.readable;
    for (const layer of layers) {
      const own = layer.ownRows;
      layer.draw({ rows: rowsOf(layer), scales, unit, describedByTable: own ? Boolean(layer.readable) : readable });
    }
    describe(this, readable, { hasRows: rows.length > 0 || layers.some((layer) => layer.ownRows?.length) });
    this.dispatchEvent(new Event("render"));
  }
}

reflect(DataPlot, ATTRIBUTES);
