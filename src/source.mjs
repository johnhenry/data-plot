// Where an element's rows come from, and keeping them current.
//
// A source element (a <table>, a <datalist>, or a JSON <script>) is read
// once and watched once, however many elements use it: they all get the
// same rows, and all redraw when it changes.

import { readSource, normalize } from "./data.mjs";

const LIVE = new WeakMap();

const WATCH = {
  table: { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-value", "data-field", "value", "datetime"] },
  datalist: { subtree: true, childList: true, characterData: true, attributes: true },
  script: { subtree: true, childList: true, characterData: true },
};

/** The rows of `element`, kept current: `listener(rows, error)` runs after each change. Throws if it can't be read now. */
export function subscribe(element, shape, listener) {
  const key = `${shape.columnField ?? ""}\u0000${shape.valueField ?? ""}`;
  let byShape = LIVE.get(element);
  if (!byShape) LIVE.set(element, (byShape = new Map()));
  let entry = byShape.get(key);
  if (!entry) {
    entry = { rows: readSource(element, shape), listeners: new Set(), pending: false };
    entry.observer = new MutationObserver(() => {
      // Many edits in one task are one change.
      if (entry.pending) return;
      entry.pending = true;
      queueMicrotask(() => {
        entry.pending = false;
        let error = null;
        try {
          entry.rows = readSource(element, shape);
        } catch (caught) {
          error = caught;
        }
        for (const notify of entry.listeners) notify(entry.rows, error);
      });
    });
    entry.observer.observe(element, WATCH[element.localName] ?? WATCH.script);
    byShape.set(key, entry);
  }
  entry.listeners.add(listener);
  return {
    get rows() {
      return entry.rows;
    },
    unsubscribe() {
      entry.listeners.delete(listener);
      if (!entry.listeners.size) {
        entry.observer.disconnect();
        byShape.delete(key);
      }
    },
  };
}

const SOURCE = ":scope > :is(table, datalist, script[type='application/json'])";

/**
 * An element's own data, by one rule everywhere:
 *
 * 1. `.data` (set from script) wins, until `src` changes or `.data` is set to null.
 * 2. Else `src="#id"`: a table, datalist, or JSON script in the page.
 * 3. Else a table, datalist, or JSON script inside the element.
 * 4. Else none (`rows` is null), and a layer uses its plot's rows.
 *
 * `onChange` runs when the rows change; errors fire `error` on the host.
 */
export class DataBinding {
  #host;
  #onChange;
  #property = null;
  #subscription = null;
  #source = null;
  #rows = null;
  #waiting = false;

  constructor(host, onChange) {
    this.#host = host;
    this.#onChange = onChange;
  }

  /** The rows, or null when the element has no data of its own. */
  get rows() {
    return this.#rows;
  }

  /** The source element being read, if any. */
  get source() {
    return this.#source;
  }

  /** True when the source is a table assistive technology can read: inside the host, or visible elsewhere. */
  get readable() {
    const source = this.#source;
    return Boolean(source?.localName === "table" && (source.parentElement === this.#host || !source.closest("[hidden], [aria-hidden=true]")));
  }

  set property(rows) {
    this.#property = rows === null || rows === undefined ? null : normalize(rows);
    if (this.#property) this.#rows = this.#property;
    // A disconnected host connects when it's inserted.
    if (this.#host.isConnected) this.connect();
  }

  /** (Re)reads from the current source. Call when `src`, the shape attributes, or the host's children change. */
  connect() {
    this.disconnect();
    if (this.#property) {
      this.#rows = this.#property;
      return;
    }
    const host = this.#host;
    const spec = host.getAttribute("src")?.trim();
    let element = null;
    if (spec) {
      if (!spec.startsWith("#")) {
        this.#rows = [];
        return this.#fail(new Error(`src="${spec}": only an #id in this page is supported for now`));
      }
      element = host.getRootNode().getElementById?.(spec.slice(1)) ?? document.getElementById(spec.slice(1));
      if (!element && document.readyState === "loading" && !this.#waiting) {
        // The source may come later in the page.
        this.#waiting = true;
        document.addEventListener("DOMContentLoaded", () => {
          this.#waiting = false;
          this.connect();
          this.#onChange();
        }, { once: true });
      }
    } else {
      element = host.querySelector(SOURCE);
    }
    if (!element) {
      this.#rows = spec ? [] : null;
      return;
    }
    const shape = { columnField: host.getAttribute("column-field"), valueField: host.getAttribute("value-field") };
    try {
      this.#subscription = subscribe(element, shape, (rows, error) => {
        if (error) return this.#fail(error);
        this.#rows = rows;
        this.#onChange();
      });
    } catch (error) {
      this.#rows = [];
      return this.#fail(error);
    }
    this.#source = element;
    this.#rows = this.#subscription.rows;
    // A table inside its plot is the plot's data: hidden visually, still read aloud.
    if (element.parentElement === host) element.setAttribute("data-plot-source", "");
  }

  disconnect() {
    this.#subscription?.unsubscribe();
    this.#subscription = null;
    this.#source = null;
  }

  // The previous rows stay drawn.
  #fail(error) {
    this.#host.dispatchEvent(new ErrorEvent("error", { error, message: `${this.#host.localName}: ${error.message}` }));
  }
}

/** True if any of these mutation records added or removed a source element. */
export function sourceChildrenChanged(records) {
  const isSource = (node) => node.nodeType === 1 && node.matches("table, datalist, script[type='application/json']");
  return records.some((record) => [...record.addedNodes, ...record.removedNodes].some(isSource));
}
