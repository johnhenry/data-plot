// What the plot elements share.
//
// PlotLayer: anything drawn inside a <data-plot> (axes, legends, marks,
// lines). It asks its plot to redraw when it arrives, leaves, or changes.
//
// DataLayer: a layer that can bring its own rows (src, a source inside it,
// or .data), and so can also draw on its own, outside a plot.

import { DataBinding, sourceChildrenChanged } from "./source.mjs";
import { color, unitScale } from "./scale.mjs";

/** Marks the frame element (<data-plot>, under whatever tag name). */
export const FRAME = Symbol.for("data-plot.frame");

const warned = new WeakSet();

/**
 * Makes a drawing accessible, following its data. A readable table already
 * says what the drawing shows, so the drawing is hidden from assistive
 * technology. Otherwise the drawing must say it: given an `aria-label` (or
 * `aria-labelledby`) it becomes `role="img"`; without one, a console warning.
 */
export function describe(host, readable, { hide = false, hasRows = true } = {}) {
  if (hide) host.toggleAttribute("aria-hidden", readable);
  const ours = host.hasAttribute("data-plot-role");
  if (readable) {
    if (ours) host.removeAttribute("role");
    host.removeAttribute("data-plot-role");
    return;
  }
  const labelled = host.hasAttribute("aria-label") || host.hasAttribute("aria-labelledby");
  if (labelled && (!host.hasAttribute("role") || ours)) {
    host.setAttribute("role", "img");
    host.setAttribute("data-plot-role", "");
  } else if (!labelled && hasRows && !warned.has(host)) {
    warned.add(host);
    console.warn(`<${host.localName}>: its data isn't a readable table, so give the drawing an aria-label (or aria-labelledby) saying what it shows.`, host);
  }
}

export class PlotLayer extends HTMLElement {
  #plot = null;
  #pending = false;

  /** The channels this layer reads (`x`, `x2`, `y`, `y2`, `color`, `size`), so the plot builds scales for them. */
  channels() {
    return [];
  }

  /** The `<data-plot>` this layer is directly inside, or null. @type {HTMLElement | null} */
  get plot() {
    const parent = this.parentElement;
    return parent?.[FRAME] ? parent : null;
  }

  connectedCallback() {
    this.#plot = this.plot;
    this.requestRender();
  }

  disconnectedCallback() {
    this.#plot?.requestRender();
    this.#plot = null;
  }

  attributeChangedCallback(name, previous, value) {
    if (previous !== value) this.requestRender();
  }

  /** Redraws soon: through its plot, or by itself when it can draw alone. Several requests in one task draw once. */
  requestRender() {
    const plot = this.plot;
    if (plot) return plot.requestRender();
    if (this.#pending) return;
    this.#pending = true;
    queueMicrotask(() => {
      this.#pending = false;
      if (this.isConnected && !this.plot) this.renderAlone();
    });
  }

  /** Draws outside a plot. Layers that can't (axes, legends) draw nothing. */
  renderAlone() {}

  /** Draws from the plot's `{ rows, scales, unit, describedByTable }`. */
  draw({ describedByTable }) {
    // With a readable table, the drawing only repeats it.
    this.toggleAttribute("aria-hidden", describedByTable);
  }
}

export class DataLayer extends PlotLayer {
  #binding = new DataBinding(this, () => this.requestRender());
  #children = null;

  /** The rows drawn: its own (from `src`, a source inside it, or set here), else its plot's. Setting it replots, until `src` changes or it's set to null. Changing the array in place needs `requestRender()`. @type {object[]} */
  get data() {
    return this.#binding.rows ?? this.plot?.data ?? [];
  }
  set data(rows) {
    this.#binding.property = rows;
    this.requestRender();
  }

  /** Its own rows, or null when it uses its plot's. */
  get ownRows() {
    return this.#binding.rows;
  }

  /** True when its own data is a table assistive technology can read. */
  get readable() {
    return this.#binding.readable;
  }

  connectedCallback() {
    this.#binding.connect();
    this.#children ??= new MutationObserver((records) => {
      if (sourceChildrenChanged(records)) {
        this.#binding.connect();
        this.requestRender();
      }
    });
    this.#children.observe(this, { childList: true });
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.#binding.disconnect();
    this.#children?.disconnect();
    super.disconnectedCallback();
  }

  attributeChangedCallback(name, previous, value) {
    if (previous === value) return;
    if (name === "src") this.#binding.property = null;
    else if ((name === "column-field" || name === "value-field") && this.isConnected) this.#binding.connect();
    super.attributeChangedCallback(name, previous, value);
  }

  /** Alone, there are no positions, but color and `:attr` scaling still apply; then it describes itself and fires `render`. */
  renderAlone() {
    const rows = this.data;
    const field = this.getAttribute("color");
    const scales = field ? { color: color(rows.map((row) => row[field])) } : {};
    this.draw({ rows, scales, unit: unitScale([rows]), describedByTable: false });
    describe(this, this.readable, { hide: true, hasRows: rows.length > 0 });
    this.dispatchEvent(new Event("render"));
  }
}
