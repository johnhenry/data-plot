// Reading data: from a <table>, JSON, or any iterable of objects. Rows come
// out as plain objects keyed by column name, with numeric text as numbers.

/** "42" → 42, "  3.5 " → 3.5, "" → "", "Q1" → "Q1". */
export function coerce(text) {
  const trimmed = String(text).trim();
  if (trimmed === "") return "";
  const number = Number(trimmed.replace(/,(?=\d{3}\b)/g, ""));
  return Number.isFinite(number) ? number : trimmed;
}

/**
 * A table's rows as objects. Column names are the header cells (`<thead>`'s
 * last row, else the first row's `<th>`s); a cell's `data-value`, if
 * present, wins over its text, so "$1.2M" can carry 1200000.
 */
export function readTable(table) {
  const rows = [...table.rows];
  if (!rows.length) return [];
  let header = table.tHead?.rows[table.tHead.rows.length - 1];
  if (!header && [...rows[0].cells].every((cell) => cell.localName === "th")) header = rows[0];
  const names = header
    ? [...header.cells].map((cell, i) => cell.dataset.field ?? (cell.textContent.trim() || String(i)))
    : [...rows[0].cells].map((_, i) => String(i));
  const body = rows.filter((row) => row !== header && row.parentElement?.localName !== "thead" && row.parentElement?.localName !== "tfoot");
  return body.map((row) =>
    Object.fromEntries([...row.cells].map((cell, i) => [names[i] ?? String(i), coerce(cell.dataset.value ?? cell.textContent)])),
  );
}

/** Rows from anything: an array or iterable of objects, or of arrays (keyed "0", "1", …). */
export function normalize(rows) {
  if (!rows || typeof rows[Symbol.iterator] !== "function" || typeof rows === "string") return [];
  return [...rows].map((row) => (Array.isArray(row) ? Object.fromEntries(row.map((value, i) => [String(i), value])) : row ?? {}));
}

/**
 * The rows a `data` attribute names: JSON (`[…]`), or a selector for a
 * `<table>` or a `<script type="application/json">`. Throws on bad JSON.
 */
export function resolve(spec, root = document) {
  const text = spec.trim();
  if (text.startsWith("[")) return { rows: normalize(JSON.parse(text)), source: null };
  const source = root.querySelector(text);
  if (!source) return { rows: [], source: null };
  if (source instanceof HTMLTableElement) return { rows: readTable(source), source };
  return { rows: normalize(JSON.parse(source.textContent)), source };
}
