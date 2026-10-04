// Reading data: from a <table>, a <datalist>, JSON, or any iterable of
// objects. Rows come out as plain objects keyed by field name.

/** "42" → 42, "  3.5 " → 3.5, "" → "", "Q1" → "Q1". */
export function coerce(text) {
  const trimmed = String(text).trim();
  if (trimmed === "") return "";
  const number = Number(trimmed.replace(/,(?=\d{3}\b)/g, ""));
  return Number.isFinite(number) ? number : trimmed;
}

/**
 * A cell's value: its `data-value`, else a `<data value>` or
 * `<time datetime>` that is its only content, else its text. So a cell can
 * show "$1.2M" or "Oct 4" and carry 1200000 or 2026-10-04.
 */
export function cellValue(cell) {
  if (cell.dataset.value !== undefined) return coerce(cell.dataset.value);
  const only = cell.children.length === 1 && cell.textContent.trim() === cell.firstElementChild.textContent.trim() ? cell.firstElementChild : null;
  if (only?.localName === "data" && only.hasAttribute("value")) return coerce(only.getAttribute("value"));
  if (only?.localName === "time" && only.hasAttribute("datetime")) return only.getAttribute("datetime");
  return coerce(cell.textContent);
}

/**
 * A table's rows as objects. Column names are the header cells (`<thead>`'s
 * last row, else the first row's `<th>`s), or a header's `data-field`.
 *
 * A grid table (one row per item, one column per category, a value in each
 * cell, like a heatmap written out) is read with `columnField` and
 * `valueField`: each cell becomes its own row, `{ [corner]: row header,
 * [columnField]: column header, [valueField]: cell }`, where `corner` is the
 * top-left header's text (or "row"). Empty cells are skipped.
 */
export function readTable(table, { columnField, valueField } = {}) {
  const rows = [...table.rows];
  if (!rows.length) return [];
  let header = table.tHead?.rows[table.tHead.rows.length - 1];
  if (!header && [...rows[0].cells].every((cell) => cell.localName === "th")) header = rows[0];
  const names = header
    ? [...header.cells].map((cell, i) => cell.dataset.field ?? (cell.textContent.trim() || String(i)))
    : [...rows[0].cells].map((_, i) => String(i));
  const body = rows.filter((row) => row !== header && row.parentElement?.localName !== "thead" && row.parentElement?.localName !== "tfoot");
  if (columnField && valueField) {
    const corner = header?.cells[0]?.dataset.field ?? (header?.cells[0]?.textContent.trim() || "row");
    const categories = header ? [...header.cells].slice(1).map((cell) => cellValue(cell)) : [];
    return body.flatMap((row) => {
      const [first, ...cells] = row.cells;
      const item = first ? cellValue(first) : "";
      return cells
        .map((cell, i) => ({ [corner]: item, [columnField]: categories[i] ?? String(i + 1), [valueField]: cellValue(cell) }))
        .filter((entry) => entry[valueField] !== "");
    });
  }
  return body.map((row) => Object.fromEntries([...row.cells].map((cell, i) => [names[i] ?? String(i), cellValue(cell)])));
}

/** Rows from anything: an array or iterable of objects, or of arrays (keyed "0", "1", …). */
export function normalize(rows) {
  if (!rows || typeof rows[Symbol.iterator] !== "function" || typeof rows === "string") return [];
  return [...rows].map((row) => (Array.isArray(row) ? Object.fromEntries(row.map((value, i) => [String(i), value])) : row ?? {}));
}

/**
 * A datalist's rows: one per `<option>`, with `value` (its `value`, else
 * its text), `label` (its `label`, else its text), and a field for each
 * `data-*` attribute, named as `dataset` names it (`data-start-week` is
 * `startWeek`). Text is read like a table cell's: "42" is 42.
 */
export function readDatalist(list) {
  return [...list.querySelectorAll("option")].map((option) => {
    const row = { label: coerce(option.label), value: coerce(option.value) };
    for (const [name, value] of Object.entries(option.dataset)) row[name] = coerce(value);
    return row;
  });
}

/**
 * The rows in a source element: a `<table>` (`shape` reads a grid table;
 * see readTable), a `<datalist>`, or a `<script type="application/json">`.
 * Text sources turn numeric text into numbers; JSON is used as written.
 * Throws on bad JSON.
 */
export function readSource(element, shape = {}) {
  if (element.localName === "table") return readTable(element, shape);
  if (element.localName === "datalist") return readDatalist(element);
  return normalize(JSON.parse(element.textContent));
}
