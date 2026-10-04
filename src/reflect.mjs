// Properties that mirror attributes, the way native elements' do:
// `marks.x = "rain"` is `marks.setAttribute("x", "rain")`, and reading it
// reads the attribute. Setting null or undefined removes the attribute.

const camel = (name) => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

/**
 * Defines a property for each attribute on `Class.prototype`.
 * `spec` maps attribute names to "string", "boolean", or a number's default
 * (`{ ticks: 0 }` reads an absent or non-numeric attribute as 0).
 */
export function reflect(Class, spec) {
  for (const [attribute, type] of Object.entries(spec)) {
    const descriptor =
      type === "boolean"
        ? {
            get() {
              return this.hasAttribute(attribute);
            },
            set(value) {
              this.toggleAttribute(attribute, Boolean(value));
            },
          }
        : {
            get() {
              const raw = this.getAttribute(attribute);
              if (type === "string") return raw ?? "";
              const number = raw === null || raw.trim() === "" ? NaN : Number(raw);
              return Number.isFinite(number) ? number : type;
            },
            set(value) {
              if (value === null || value === undefined) this.removeAttribute(attribute);
              else this.setAttribute(attribute, String(value));
            },
          };
    Object.defineProperty(Class.prototype, camel(attribute), { ...descriptor, configurable: true, enumerable: true });
  }
  return Object.keys(spec);
}
