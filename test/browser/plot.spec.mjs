import { test, expect } from "@playwright/test";

// Parses `html` like a page would, then defines the elements (or the reverse).
async function mount(page, html, { defineFirst = true } = {}) {
  await page.goto("/test/browser/fixture.html");
  await page.evaluate(
    async ({ html, defineFirst }) => {
      const define = () => import("/src/global.mjs");
      if (defineFirst) await define();
      const template = document.createElement("template");
      template.innerHTML = html;
      document.body.append(template.content);
      if (!defineFirst) await define();
      await new Promise((resolve) => setTimeout(resolve, 0));
    },
    { html, defineFirst },
  );
}

const vars = (page, selector, names) =>
  page.$$eval(selector, (els, names) => els.map((el) => Object.fromEntries(names.map((n) => [n, el.style.getPropertyValue(n)]))), names);

const TABLE = `<table><thead><tr><th>name</th><th>a</th><th>b</th><th>g</th></tr></thead><tbody>
  <tr><td>p</td><td>0</td><td>10</td><td>one</td></tr>
  <tr><td>q</td><td>5</td><td>20</td><td>two</td></tr>
  <tr><td>r</td><td>10</td><td>0</td><td>one</td></tr></tbody></table>`;

test("a table inside is read, and marks get positions, colors, and sizes", async ({ page }) => {
  await mount(page, `<data-plot>${TABLE}<plot-marks x="a" y="b" color="g" size="a"></plot-marks></data-plot>`);
  expect(await vars(page, ".plot-dot", ["--x", "--y", "--size"])).toEqual([
    { "--x": "0", "--y": "0.5", "--size": "0" },
    { "--x": "0.5", "--y": "1", "--size": "0.5" },
    { "--x": "1", "--y": "0", "--size": "1" },
  ]);
  const colors = await page.$$eval(".plot-dot", (els) => els.map((el) => el.style.getPropertyValue("--color")));
  expect(colors[0]).toBe(colors[2]);
  expect(colors[0]).not.toBe(colors[1]);
  // The table stays for assistive technology; the drawing is hidden from it.
  await expect(page.locator("table")).toHaveAttribute("data-plot-source", "");
  await expect(page.locator("plot-marks")).toHaveAttribute("aria-hidden", "");
});

test("works whichever comes first, the markup or the definitions", async ({ page }) => {
  await mount(page, `<data-plot>${TABLE}<plot-marks x="a" y="b"></plot-marks></data-plot>`, { defineFirst: false });
  await expect(page.locator(".plot-dot")).toHaveCount(3);
});

test("editing the table replots, keeping each keyed mark's element", async ({ page }) => {
  await mount(page, `<data-plot>${TABLE}<plot-marks x="a" y="b" key="name"></plot-marks></data-plot>`);
  const first = await page.$(".plot-dot");
  await page.evaluate(() => {
    document.querySelector("tbody td:nth-child(2)").textContent = "20";
  });
  await expect.poll(() => vars(page, ".plot-dot", ["--x"])).toEqual([{ "--x": "1" }, { "--x": "0.0625" }, { "--x": "0.375" }]); // the domain re-fits to 4…20
  expect(await first.evaluate((el) => el === document.querySelector(".plot-dot"))).toBe(true);
  // A removed row removes its mark.
  await page.evaluate(() => document.querySelector("tbody tr:last-child").remove());
  await expect(page.locator(".plot-dot")).toHaveCount(2);
});

test("data from JSON, a JSON script, or the property; bad JSON fires error and keeps the plot", async ({ page }) => {
  await mount(page, `<script type="application/json" id="rows">[{"a": 1, "b": 2}, {"a": 3, "b": 4}]</script>
    <data-plot data="#rows"><plot-marks x="a" y="b"></plot-marks></data-plot>`);
  await expect(page.locator(".plot-dot")).toHaveCount(2);
  const result = await page.evaluate(async () => {
    const plot = document.querySelector("data-plot");
    plot.setAttribute("data", '[[1, 2], [2, 3], [3, 1]]');
    plot.querySelector("plot-marks").setAttribute("x", "0");
    plot.querySelector("plot-marks").setAttribute("y", "1");
    await new Promise((r) => setTimeout(r, 0));
    const fromAttribute = plot.querySelectorAll(".plot-dot").length;
    let message = null;
    plot.addEventListener("error", (event) => (message = event.message));
    plot.setAttribute("data", "[nope");
    await new Promise((r) => setTimeout(r, 0));
    const afterError = plot.querySelectorAll(".plot-dot").length;
    plot.data = [{ 0: 1, 1: 1 }];
    await new Promise((r) => setTimeout(r, 0));
    return { fromAttribute, message, afterError, fromProperty: plot.querySelectorAll(".plot-dot").length };
  });
  expect(result).toEqual({ fromAttribute: 3, message: expect.stringContaining("data-plot"), afterError: 3, fromProperty: 1 });
});

test("templates: :attr gets the field scaled 0–1, {field} the raw value", async ({ page }) => {
  await mount(page, `<data-plot>${TABLE}<plot-marks x="g" y="b">
    <template><i class="m" :data-level="a" title="{name}: {b}">{name}</i></template></plot-marks></data-plot>`);
  const marks = await page.$$eval("i.m", (els) => els.map((el) => [el.dataset.level, el.title, el.textContent, el.hasAttribute(":data-level")]));
  expect(marks).toEqual([["0", "p: 10", "p", false], ["0.5", "q: 20", "q", false], ["1", "r: 0", "r", false]]);
  // A banded x scale: both "one" rows share a band, and marks learn its width.
  const x = await vars(page, "i.m", ["--x", "--bandwidth"]);
  expect(x[0]["--x"]).toBe(x[2]["--x"]);
  expect(Number(x[0]["--bandwidth"])).toBeGreaterThan(0);
});

test("plot-marks alone stamps its own data, with no positions", async ({ page }) => {
  await mount(page, `${TABLE.replace("<table>", '<table id="t">')}<plot-marks data="#t"><template><b>{name}</b></template></plot-marks>`);
  await expect(page.locator("plot-marks b")).toHaveText(["p", "q", "r"]);
  expect(await page.locator("plot-marks b").first().evaluate((el) => getComputedStyle(el).position)).toBe("static");
});

test("axes: ticks at nice values, gridlines, a label; a line per series; a legend per category", async ({ page }) => {
  await mount(page, `<data-plot>${TABLE}
    <plot-axis scale="y" grid label="B"></plot-axis><plot-axis scale="x" ticks="2"></plot-axis>
    <plot-line x="a" y="b" color="g"></plot-line><plot-legend></plot-legend></data-plot>`);
  await expect(page.locator('plot-axis[scale="y"] .plot-tick')).toHaveText(["0", "5", "10", "15", "20"]);
  await expect(page.locator('plot-axis[scale="y"] .plot-gridline')).toHaveCount(5);
  await expect(page.locator('plot-axis[scale="y"] .plot-axis-label')).toHaveText("B");
  await expect(page.locator('plot-axis[scale="x"] .plot-tick')).toHaveText(["0", "5", "10"]);
  const paths = await page.$$eval("plot-line path", (els) => els.map((el) => [el.dataset.series, el.getAttribute("d")]));
  expect(paths).toEqual([["one", "M0.0,500.0L1000.0,1000.0"], ["two", "M500.0,0.0"]]);
  await expect(page.locator("plot-legend .plot-legend-item")).toHaveText(["one", "two"]);
});

test("a hidden table doesn't hide the drawing from assistive technology", async ({ page }) => {
  await mount(page, `${TABLE.replace("<table>", '<table id="t" hidden>')}<data-plot data="#t"><plot-marks x="a" y="b"></plot-marks></data-plot>`);
  await expect(page.locator(".plot-dot")).toHaveCount(3);
  await expect(page.locator("plot-marks")).not.toHaveAttribute("aria-hidden");
});

test("page CSS beats the defaults: a mark can be a bar", async ({ page }) => {
  await mount(page, `<style>data-plot > plot-marks > .bar { bottom: 0; translate: -50% 0; block-size: calc(var(--y) * 100%); inline-size: 10px; }</style>
    <data-plot y-domain="0 auto"><table><tr><th>k</th><th>v</th></tr><tr><td>a</td><td>5</td></tr><tr><td>b</td><td>10</td></tr></table>
    <plot-marks x="k" y="v"><template><div class="bar"></div></template></plot-marks></data-plot>`);
  const boxes = await page.$$eval(".bar", (els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  expect(boxes).toEqual([100, 200]);
});
