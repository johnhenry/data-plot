import PlotLayer from "../layer.mjs";
import { stamp, bind } from "../template.mjs";
import { resolve, normalize } from "../data.mjs";
import { unitScale } from "../data-plot/index.mjs";

/**
 * One element per row: a copy of the `<template>` inside (or a dot),
 * given its position and color as CSS custom properties, so ordinary CSS
 * places and styles it. Rows keep their element between draws (by `key`,
 * else by position), so changes can animate.
 *
 * Inside a `<data-plot>`, it uses the plot's data and scales. Alone, it
 * stamps its own `data` with no positions: a grid of glyphs, styled by
 * your CSS.
 *
 * @tag plot-marks
 * @summary One element per row, from a template, placed with CSS custom properties.
 *
 * @attr {string} x - Field for horizontal position. Sets `--x` (0 left … 1 right) and, on a banded scale, `--bandwidth`.
 * @attr {string} y - Field for vertical position. Sets `--y` (0 bottom … 1 top) and `--bandheight`.
 * @attr {string} color - Field for color. Sets `--color`.
 * @attr {string} size - Field for size. Sets `--size` (0 … 1).
 * @attr {string} key - Field that identifies a row across updates. Default: its position.
 * @attr {string} data - Only outside a `<data-plot>`: JSON rows, or a selector for a `<table>` or JSON `<script>`.
 */
export default class PlotMarks extends PlotLayer {
  static observedAttributes = ["x", "y", "color", "size", "key", "data"];

  #marks = new Map();
  #rows = null;

  channels() {
    return ["x", "y", "color", "size"].filter((channel) => this.hasAttribute(channel));
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.plot) this.#drawAlone();
  }

  attributeChangedCallback(name) {
    super.attributeChangedCallback();
    if (name === "data") this.#rows = null;
    if (this.isConnected && !this.plot) this.#drawAlone();
  }

  /** Rows, when used outside a `<data-plot>`. @type {object[]} */
  get data() {
    return this.#rows ?? [];
  }
  set data(rows) {
    this.#rows = normalize(rows);
    if (this.isConnected && !this.plot) this.#drawAlone();
  }

  #drawAlone() {
    if (!this.#rows && this.hasAttribute("data")) {
      try {
        this.#rows = resolve(this.getAttribute("data"), this.getRootNode()).rows;
      } catch (error) {
        this.dispatchEvent(new ErrorEvent("error", { error, message: `plot-marks: ${error.message}` }));
        return;
      }
    }
    const rows = this.#rows ?? [];
    this.draw({ rows, scales: {}, unit: unitScale(rows), describedByTable: false });
  }

  draw({ rows, scales, unit, describedByTable }) {
    super.draw({ describedByTable });
    const template = this.querySelector(":scope > template");
    const keyField = this.getAttribute("key");
    const fields = Object.fromEntries(["x", "y", "color", "size"].map((channel) => [channel, this.getAttribute(channel)]));
    const seen = new Set();
    let previous = template;
    rows.forEach((row, index) => {
      const key = keyField ? row[keyField] : index;
      if (seen.has(key)) return;
      seen.add(key);
      let mark = this.#marks.get(key);
      if (!mark) {
        mark = template ? stamp(template)[0] : Object.assign(document.createElement("span"), { className: "plot-dot" });
        if (!mark) return;
        this.#marks.set(key, mark);
      }
      const style = mark.style;
      const set = (property, value) => (Number.isFinite(value) ? style.setProperty(property, String(Math.round(value * 1e4) / 1e4)) : style.removeProperty(property));
      if (fields.x && scales.x) {
        set("--x", scales.x(row[fields.x]));
        set("--bandwidth", scales.x.bandwidth || NaN);
      }
      if (fields.y && scales.y) {
        set("--y", scales.y(row[fields.y]));
        set("--bandheight", scales.y.bandwidth || NaN);
      }
      if (fields.size && scales.size) set("--size", scales.size(row[fields.size]));
      if (fields.color && scales.color) style.setProperty("--color", scales.color(row[fields.color]));
      bind(mark, row, unit);
      // Keep data order, moving only what's out of place.
      const after = previous ? previous.nextElementSibling : this.firstElementChild;
      if (after !== mark) (previous ? previous.after(mark) : this.prepend(mark));
      previous = mark;
    });
    for (const [key, mark] of this.#marks) {
      if (!seen.has(key)) {
        mark.remove();
        this.#marks.delete(key);
      }
    }
  }
}
