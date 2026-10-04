import { DataLayer } from "../layer.mjs";
import { stamp, bind } from "../template.mjs";
import { reflect } from "../reflect.mjs";

const CHANNELS = ["x", "x2", "y", "y2", "color", "size"];

const ATTRIBUTES = {
  x: "string",
  x2: "string",
  y: "string",
  y2: "string",
  color: "string",
  size: "string",
  key: "string",
  repeat: "string",
  src: "string",
  "column-field": "string",
  "value-field": "string",
};

/**
 * One element per row: a copy of the `<template>` inside (or what `mark`
 * builds, or a dot), given its position and color as CSS custom
 * properties, so ordinary CSS places and styles it. Rows keep their element
 * between draws (by `key`, else by position), so changes can animate.
 *
 * Inside a `<data-plot>` it draws on the plot's scales, with the plot's
 * rows unless it has its own. Alone, it has no positions (only `color`
 * applies): a grid of glyphs, laid out by your CSS.
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
 * @attr {string} src - `#id` of a `<table>`, `<datalist>`, or JSON `<script>` with this layer's own rows. Default: one inside it, else its plot's rows.
 * @attr {string} column-field - Reads a grid table, as on `<data-plot>`.
 * @attr {string} value-field - See `column-field`.
 *
 * @fires render - After it draws, when alone (inside a plot, the plot fires it).
 * @fires error - Its own data couldn't be read.
 */
export default class PlotMarks extends DataLayer {
  static observedAttributes = [...Object.keys(ATTRIBUTES), "aria-label", "aria-labelledby"];

  #marks = new Map();
  #builder = null;

  channels() {
    return CHANNELS.filter((channel) => this.hasAttribute(channel));
  }

  /**
   * Builds marks from script instead of a `<template>`: called as
   * `mark(row, previous)` for each row, with the element that row had last
   * time (or undefined); returns its element (the same one, to update it in
   * place). Positions and colors are set on whatever it returns. Null goes
   * back to the template.
   * @type {((row: object, previous?: Element) => Element) | null}
   */
  get mark() {
    return this.#builder;
  }
  set mark(builder) {
    this.#builder = typeof builder === "function" ? builder : null;
    for (const element of this.#marks.values()) element.remove();
    this.#marks.clear();
    this.requestRender();
  }

  draw({ rows, scales, unit, describedByTable }) {
    super.draw({ describedByTable });
    const template = this.querySelector(":scope > template");
    const fields = Object.fromEntries(CHANNELS.map((channel) => [channel, this.getAttribute(channel)]));
    const keyField = this.getAttribute("key");
    const repeatField = this.getAttribute("repeat");
    const copies = rows.flatMap((row, index) => {
      const base = keyField ? row[keyField] : index;
      if (!repeatField) return [{ row, key: base }];
      const count = Math.max(0, Math.floor(Number(row[repeatField]) || 0));
      return Array.from({ length: count }, (_, i) => ({ row, key: `${base}\u0000${i}`, index: i, count }));
    });
    const marks = new Set(this.#marks.values());
    const seen = new Set();
    // Marks go after the template and any source inside, in data order.
    let previous = [...this.children].filter((child) => !marks.has(child)).at(-1) ?? null;
    for (const { row, key, index, count } of copies) {
      if (seen.has(key)) continue;
      // A row with no position on a positioned axis gets no mark.
      if ((fields.x && scales.x && !Number.isFinite(scales.x(row[fields.x]))) || (fields.y && scales.y && !Number.isFinite(scales.y(row[fields.y])))) continue;
      seen.add(key);
      let mark = this.#marks.get(key);
      if (this.#builder) {
        const built = this.#builder(row, mark);
        if (!(built instanceof Element)) continue;
        if (mark && built !== mark) mark.remove();
        mark = built;
      } else if (!mark) {
        mark = template ? stamp(template)[0] : Object.assign(document.createElement("span"), { className: "plot-dot" });
        if (!mark) continue;
      }
      this.#marks.set(key, mark);
      this.#place(mark, row, fields, scales, repeatField ? { index, count } : null);
      if (!this.#builder) bind(mark, row, unit);
      const next = previous ? previous.nextElementSibling : this.firstElementChild;
      if (next !== mark) (previous ? previous.after(mark) : this.prepend(mark));
      previous = mark;
    }
    for (const [key, mark] of this.#marks) {
      if (!seen.has(key)) {
        mark.remove();
        this.#marks.delete(key);
      }
    }
  }

  #place(mark, row, fields, scales, repeat) {
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
    if (repeat) {
      set("--index", repeat.index);
      set("--count", repeat.count);
    }
    if (fields.size && scales.size) set("--size", scales.size(row[fields.size]));
    if (fields.color && scales.color) style.setProperty("--color", scales.color(row[fields.color]));
  }
}

reflect(PlotMarks, ATTRIBUTES);
