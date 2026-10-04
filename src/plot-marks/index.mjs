import PlotLayer from "../layer.mjs";
import { stamp, bind } from "../template.mjs";
import { resolve, normalize } from "../data.mjs";
import { unitScale } from "../data-plot/index.mjs";
import { color } from "../scale.mjs";

/**
 * One element per row: a copy of the `<template>` inside (or a dot),
 * given its position and color as CSS custom properties, so ordinary CSS
 * places and styles it. Rows keep their element between draws (by `key`,
 * else by position), so changes can animate.
 *
 * Inside a `<data-plot>`, it uses the plot's data and scales. Alone, it
 * stamps its own `data` with no positions (only `color` applies): a grid
 * of glyphs, styled by your CSS.
 *
 * @tag plot-marks
 * @summary One element per row, from a template, placed with CSS custom properties.
 *
 * @attr {string} x - Field for horizontal position. Sets `--x` (0 left … 1 right) and, on a banded scale, `--bandwidth`.
 * @attr {string} y - Field for vertical position. Sets `--y` (0 bottom … 1 top) and `--bandheight`.
 * @attr {string} x2 - Field for the other end of a horizontal range, on x's scale. Sets `--x2`, and `--x-start`/`--x-length` (the range's left end and width), which the default CSS uses to stretch the mark.
 * @attr {string} y2 - Field for the other end of a vertical range. Sets `--y2`, `--y-start`, and `--y-length`.
 * @attr {string} color - Field for color. Sets `--color`.
 * @attr {string} size - Field for size. Sets `--size` (0 … 1).
 * @attr {string} key - Field that identifies a row across updates. Default: its position.
 * @attr {string} repeat - Field with a count: the row is stamped that many times (a unit or waffle chart). Each copy gets `--index` and `--count`.
 * @attr {string} data - Only outside a `<data-plot>`: JSON rows, or a selector for a `<table>` or JSON `<script>`.
 */
export default class PlotMarks extends PlotLayer {
  static observedAttributes = ["x", "x2", "y", "y2", "color", "size", "key", "repeat", "data"];

  #marks = new Map();
  #rows = null;

  channels() {
    return ["x", "x2", "y", "y2", "color", "size"].filter((channel) => this.hasAttribute(channel));
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
    // Alone there's nowhere to place marks, but color still applies.
    const field = this.getAttribute("color");
    const scales = field ? { color: color(rows.map((row) => row[field])) } : {};
    this.draw({ rows, scales, unit: unitScale(rows), describedByTable: false });
  }

  draw({ rows, scales, unit, describedByTable }) {
    super.draw({ describedByTable });
    const template = this.querySelector(":scope > template");
    const keyField = this.getAttribute("key");
    const fields = Object.fromEntries(["x", "x2", "y", "y2", "color", "size"].map((channel) => [channel, this.getAttribute(channel)]));
    const repeatField = this.getAttribute("repeat");
    const seen = new Set();
    let previous = template;
    const copies = rows.flatMap((row, index) => {
      const base = keyField ? row[keyField] : index;
      if (!repeatField) return [{ row, key: base }];
      const count = Math.max(0, Math.floor(Number(row[repeatField]) || 0));
      return Array.from({ length: count }, (_, i) => ({ row, key: `${base}\u0000${i}`, index: i, count }));
    });
    copies.forEach(({ row, key, index, count }) => {
      if (seen.has(key)) return;
      // A row with no position on a positioned axis gets no mark.
      if ((fields.x && scales.x && !Number.isFinite(scales.x(row[fields.x]))) || (fields.y && scales.y && !Number.isFinite(scales.y(row[fields.y])))) return;
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
      for (const axis of ["x", "y"]) {
        if (!fields[`${axis}2`] || !scales[axis]) continue;
        const from = scales[axis](row[fields[axis]]);
        const to = scales[axis](row[fields[`${axis}2`]]);
        set(`--${axis}2`, to);
        set(`--${axis}-start`, Math.min(from, to));
        set(`--${axis}-length`, Math.abs(to - from));
      }
      if (repeatField) {
        set("--index", index);
        set("--count", count);
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
