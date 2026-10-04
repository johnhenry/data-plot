// Stamping a <template> once per row. Two bindings, both plain HTML:
//
//   :smile="profit"    sets smile to the row's profit, scaled 0–1 across the data
//   title="{name}"     fills in the row's raw value (also in text)
//
// Each copy remembers its bindings, so updating a row rewrites only those.

const BINDINGS = new WeakMap();
const FIELD = /\{([^{}]+)\}/g;

/** Copies the template's content and records its bindings. Returns the copy's elements. */
export function stamp(template) {
  const fragment = template.content.cloneNode(true);
  const bindings = [];
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (FIELD.test(node.data)) bindings.push({ node, text: node.data });
      FIELD.lastIndex = 0;
      continue;
    }
    for (const { name, value } of [...node.attributes]) {
      if (name.startsWith(":") && name.length > 1) {
        node.removeAttribute(name);
        bindings.push({ node, scaled: name.slice(1), field: value.trim() });
      } else if (FIELD.test(value)) {
        bindings.push({ node, attribute: name, text: value });
      }
      FIELD.lastIndex = 0;
    }
  }
  const elements = [...fragment.children];
  for (const element of elements) BINDINGS.set(element, bindings);
  return elements;
}

const fill = (text, row) => text.replace(FIELD, (_, field) => String(row[field.trim()] ?? ""));

/** Writes one row into a stamped copy. `unit(field, value)` scales a field's value to 0–1. */
export function bind(element, row, unit) {
  for (const binding of BINDINGS.get(element) ?? []) {
    if (binding.scaled) {
      const value = unit(binding.field, row[binding.field]);
      if (Number.isFinite(value)) binding.node.setAttribute(binding.scaled, String(Math.round(value * 1000) / 1000));
      else binding.node.removeAttribute(binding.scaled);
    } else if (binding.attribute) {
      binding.node.setAttribute(binding.attribute, fill(binding.text, row));
    } else {
      binding.node.data = fill(binding.text, row);
    }
  }
}
