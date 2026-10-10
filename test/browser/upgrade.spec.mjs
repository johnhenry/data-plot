import { test, expect } from "@playwright/test";

// Properties set on an element before its class is defined (a lazily
// imported data-plot) become own properties and would shadow the class's
// accessors once it upgrades. Each element must take them through its setters.

// Every public settable property of every element, with a value to set.
const CASES = {
  "data-plot": {
    src: "#nowhere",
    xDomain: "0 100",
    yDomain: "0 auto",
    xPadding: 0.5,
    yPadding: 0.4,
    columnField: "col",
    valueField: "val",
    data: [{ a: 1 }],
  },
  "plot-marks": {
    x: "a",
    x2: "a2",
    y: "b",
    y2: "b2",
    color: "c",
    size: "s",
    key: "k",
    repeat: "n",
    src: "#nowhere",
    columnField: "col",
    valueField: "val",
    data: [{ a: 1 }],
    mark: "builder",
  },
  "plot-line": { x: "a", y: "b", color: "c", src: "#nowhere", columnField: "col", valueField: "val", data: [{ a: 1 }] },
  "plot-axis": { scale: "y", ticks: 3, label: "Rain", grid: true },
  "plot-legend": { label: "Key" },
  "chernoff-face": { features: { smile: 0.9, eyeSize: 0.2 } },
};

for (const [tag, values] of Object.entries(CASES)) {
  for (const [name, value] of Object.entries(values)) {
    test(`<${tag}>.${name} set before define takes effect and reads back`, async ({ page }) => {
      await page.goto("/test/browser/fixture.html");
      const result = await page.evaluate(
        async ({ tag, name, value }) => {
          const el = document.createElement(tag);
          const assigned = name === "mark" ? () => Object.assign(document.createElement("b"), { className: "built" }) : value;
          el[name] = assigned;
          document.body.append(el);
          const before = Object.hasOwn(el, name);
          await import("/src/global.mjs");
          await customElements.whenDefined(tag);
          await new Promise((resolve) => setTimeout(resolve, 0));
          const read = el[name];
          return {
            before,
            own: Object.hasOwn(el, name),
            read: name === "mark" ? read === assigned : read,
            attributes: Object.fromEntries([...el.attributes].map((a) => [a.name, a.value])),
            html: el.innerHTML,
            data: name === "data" ? el.data : undefined,
          };
        },
        { tag, name, value },
      );
      expect(result.before).toBe(true); // it really was an own property
      expect(result.own).toBe(false); // the upgrade removed it
      if (name === "mark") {
        expect(result.read).toBe(true);
      } else if (name === "features") {
        expect(result.read).toMatchObject(value);
        expect(result.attributes.smile).toBe("0.9");
        expect(result.attributes["eye-size"]).toBe("0.2");
      } else if (name === "data") {
        expect(result.read).toEqual(value);
      } else if (typeof value === "boolean") {
        expect(result.read).toBe(value);
        expect(name in result.attributes || result.attributes[name] === "").toBe(true);
      } else {
        expect(result.read).toEqual(value);
        const attribute = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
        expect(result.attributes[attribute]).toBe(String(value));
      }
    });
  }
}

test("a mark builder set before define builds the marks, not default dots", async ({ page }) => {
  await page.goto("/test/browser/fixture.html");
  await page.evaluate(async () => {
    const plot = document.createElement("data-plot");
    const marks = document.createElement("plot-marks");
    marks.setAttribute("x", "a");
    marks.setAttribute("y", "b");
    marks.mark = (row) => Object.assign(document.createElement("i"), { className: "custom", textContent: row.a });
    plot.append(marks);
    plot.data = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
    document.body.append(plot);
    await import("/src/global.mjs");
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await expect(page.locator("plot-marks .custom")).toHaveCount(2);
  await expect(page.locator("plot-marks .plot-dot")).toHaveCount(0);
});
