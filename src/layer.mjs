// What every layer of a <data-plot> shares: it asks its plot to redraw when
// it arrives, leaves, or changes, and draws when the plot tells it to.

export default class PlotLayer extends HTMLElement {
  #plot = null;

  /** The channels this layer reads (`x`, `y`, `color`, `size`), so the plot builds scales for them. */
  channels() {
    return [];
  }

  /** The `<data-plot>` this layer is in, or null. @type {HTMLElement | null} */
  get plot() {
    const parent = this.parentElement;
    return parent && typeof parent.requestRender === "function" ? parent : null;
  }

  connectedCallback() {
    this.#plot = this.plot;
    this.#plot?.requestRender();
  }

  disconnectedCallback() {
    this.#plot?.requestRender();
    this.#plot = null;
  }

  attributeChangedCallback() {
    this.plot?.requestRender();
  }

  /** Draws from the plot's `{ rows, scales, unit, describedByTable }`. */
  draw(context) {
    // With a table in the page, it's what assistive technology reads; the drawing repeats it.
    this.toggleAttribute("aria-hidden", context.describedByTable);
  }
}
