import { resolve, readTable, normalize } from "../data.mjs";
import { position, color, linear, extent, isNumeric } from "../scale.mjs";

const CHANNELS = ["x", "x2", "y", "y2", "color", "size"];
// x2 and y2 are the far ends of a range, on the same scale as x and y.
const AXIS = { x: "x", x2: "x", y: "y", y2: "y", color: "color", size: "size" };

/**
 * A plot's frame: reads the data, works out one scale per channel from
 * what its layers ask for, and has every layer draw.
 *
 * @tag data-plot
 * @summary A plot's frame: data, scales, and the layers drawn in it.
 *
 * @attr {string} data - JSON rows, or a selector for a `<table>` or a `<script type="application/json">`. Default: a `<table>` inside.
 * @attr {string} x-domain - The x scale's ends, like `0 100` (`auto` keeps one end automatic). Numbers only.
 * @attr {string} y-domain - The y scale's ends, like `0 auto`.
 * @attr {number} x-padding - On a banded x scale, the share of each band left empty, 0–1. Default 0.2.
 * @attr {number} y-padding - The same for a banded y scale.
 *
 * @fires error - The data couldn't be read (bad JSON). An `ErrorEvent`; the previous data stays plotted.
 *
 * @cssprop --plot-margin - Space around the plotting area for axes, like `inset`. Default `16px 16px 32px 48px`.
 * @cssprop --plot-height - Default height. Default `300px`.
 */
export default class DataPlot extends HTMLElement {
  static observedAttributes = ["data", "x-domain", "y-domain", "x-padding", "y-padding"];

  #rows = [];
  #property = null;
  #source = null;
  #observer = null;
  #pending = false;

  connectedCallback() {
    this.#read();
    this.requestRender();
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = null;
  }

  attributeChangedCallback(name) {
    if (name === "data") this.#property = null;
    if (this.isConnected) {
      this.#read();
      this.requestRender();
    }
  }

  /** The rows being plotted. Setting it (any iterable of objects or arrays) replots, and wins over the `data` attribute until that changes. @type {object[]} */
  get data() {
    return this.#rows;
  }
  set data(rows) {
    this.#property = normalize(rows);
    this.#read();
    this.requestRender();
  }

  /** Redraws on the next microtask; several requests in one task draw once. Layers call it when they change. */
  requestRender() {
    if (this.#pending) return;
    this.#pending = true;
    queueMicrotask(() => {
      this.#pending = false;
      if (this.isConnected) this.render();
    });
  }

  /** The scales from the last draw, by channel (`x`, `y`, `color`, `size`). @type {Record<string, Function>} */
  scales = {};

  /** Draws every layer now. */
  render() {
    const layers = [...this.children].filter((child) => typeof child.draw === "function");
    const fields = Object.fromEntries(Object.values(AXIS).map((axis) => [axis, new Set()]));
    for (const layer of layers) {
      for (const channel of CHANNELS) {
        const field = layer.getAttribute?.(channel);
        if (field && typeof layer.channels === "function" && layer.channels().includes(channel)) fields[AXIS[channel]].add(field);
      }
    }
    const values = (channel) => [...fields[channel]].flatMap((field) => this.#rows.map((row) => row[field]));
    const scales = {};
    const padding = (name) => (this.hasAttribute(name) ? Number(this.getAttribute(name)) : undefined);
    if (fields.x.size) scales.x = position(values("x"), this.getAttribute("x-domain"), padding("x-padding"));
    if (fields.y.size) scales.y = position(values("y"), this.getAttribute("y-domain"), padding("y-padding"));
    // Categories read top to bottom, like the table they came from.
    if (scales.y?.type === "band") {
      const band = scales.y;
      scales.y = Object.assign((value) => 1 - band(value), band);
    }
    if (fields.color.size) scales.color = color(values("color"));
    if (fields.size.size) scales.size = linear(extent(values("size").filter(isNumeric)));
    this.scales = scales;
    const context = { rows: this.#rows, scales, unit: unitScale(this.#rows), describedByTable: this.#readable() };
    for (const layer of layers) layer.draw(context);
  }

  // A table inside the plot, or a visible one elsewhere, is what assistive
  // technology reads; the drawing then only repeats it.
  #readable() {
    const table = this.#source;
    return Boolean(table && (table.parentElement === this || !table.closest("[hidden], [aria-hidden=true]")));
  }

  #read() {
    this.#observer?.disconnect();
    this.#source = null;
    const spec = this.getAttribute("data");
    try {
      if (this.#property) {
        this.#rows = this.#property;
      } else if (spec) {
        const { rows, source } = resolve(spec, this.getRootNode());
        this.#rows = rows;
        this.#source = source instanceof HTMLTableElement ? source : null;
      } else {
        const table = this.querySelector(":scope > table");
        this.#rows = table ? readTable(table) : [];
        this.#source = table;
      }
    } catch (error) {
      this.dispatchEvent(new ErrorEvent("error", { error, message: `data-plot: ${error.message}` }));
      return;
    }
    if (this.#source) {
      if (this.#source.parentElement === this) this.#source.setAttribute("data-plot-source", "");
      // Edit the table and the plot follows.
      this.#observer = new MutationObserver(() => {
        this.#rows = readTable(this.#source);
        this.requestRender();
      });
      this.#observer.observe(this.#source, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-value", "data-field"] });
    }
  }
}

/** Scales any numeric field to 0–1 across the rows (for `:attr` bindings). Cached per field. */
export function unitScale(rows) {
  const cache = new Map();
  return (field, value) => {
    if (!isNumeric(value)) return NaN;
    if (!cache.has(field)) cache.set(field, linear(extent(rows.map((row) => row[field]))));
    return cache.get(field)(value);
  };
}
