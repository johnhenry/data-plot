// Lazy properties. A property assigned to an element before its class is
// defined (a lazily imported data-plot) becomes an own property of the
// element, and once the element upgrades it shadows the class's accessor:
// the setter never runs and the value is ignored. Elements call
// `upgradeProperties(this)` at the end of their constructors to take those
// values back through their setters.

/**
 * Moves own properties that shadow the element's accessors back through
 * them: each is read, deleted, and assigned again. Covers every accessor with
 * a setter on the class's prototype chain (below `HTMLElement`), so a new
 * property needs no registration.
 * @param {HTMLElement} element
 */
export function upgradeProperties(element) {
  const names = new Set();
  for (let proto = Object.getPrototypeOf(element); proto && proto !== HTMLElement.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (typeof Object.getOwnPropertyDescriptor(proto, name).set === "function") names.add(name);
    }
  }
  for (const name of names) {
    if (!Object.hasOwn(element, name)) continue;
    const value = element[name];
    delete element[name];
    element[name] = value;
  }
}
