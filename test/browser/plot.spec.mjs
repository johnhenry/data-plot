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

test("src: a JSON script, followed when it changes; bad JSON fires error and keeps the plot; .data wins until src changes", async ({ page }) => {
  await mount(page, `<script type="application/json" id="rows">[{"a": 1, "b": 2}, {"a": 3, "b": 4}]</script>
    <script type="application/json" id="other">[{"a": 1, "b": 1}]</script>
    <data-plot src="#rows"><plot-marks x="a" y="b"></plot-marks></data-plot>`);
  await expect(page.locator(".plot-dot")).toHaveCount(2);
  const result = await page.evaluate(async () => {
    const tick = () => new Promise((r) => setTimeout(r, 0));
    const plot = document.querySelector("data-plot");
    const count = () => plot.querySelectorAll(".plot-dot").length;
    const script = document.querySelector("#rows");
    script.textContent = '[{"a": 1, "b": 2}, {"a": 2, "b": 3}, {"a": 3, "b": 1}]';
    await tick();
    const edited = count();
    let message = null;
    plot.addEventListener("error", (event) => (message = event.message));
    script.textContent = "[nope";
    await tick();
    const afterError = count();
    plot.data = [{ a: 5, b: 5 }];
    await tick();
    const fromProperty = count();
    // JSON is used as written: no string-to-number conversion.
    const typed = typeof plot.data[0].a;
    plot.src = "#other";
    await tick();
    const fromNewSrc = [count(), plot.data[0].b];
    plot.src = "rows.json";
    await tick();
    return { edited, message, afterError, fromProperty, typed, fromNewSrc, urlError: message };
  });
  expect(result).toMatchObject({ edited: 3, afterError: 3, fromProperty: 1, typed: "number", fromNewSrc: [1, 1] });
  expect(result.urlError).toContain("only an #id");
});

test("a datalist: label, value, and data-* fields; edits replot", async ({ page }) => {
  await mount(page, `<data-plot><datalist>
      <option label="Mon" value="3" data-start-week="1"></option>
      <option value="5">Tue</option>
      <option>Wed</option>
    </datalist><plot-marks x="label" y="value"></plot-marks></data-plot>`);
  expect(await page.evaluate(() => document.querySelector("data-plot").data)).toEqual([
    { label: "Mon", value: 3, startWeek: 1 },
    { label: "Tue", value: 5 },
    { label: "Wed", value: "Wed" },
  ]);
  await page.evaluate(() => document.querySelector("option").setAttribute("value", "4"));
  await expect.poll(() => page.evaluate(() => document.querySelector("data-plot").data[0].value)).toBe(4);
});

test("one source, many readers: read once, and every reader follows its edits", async ({ page }) => {
  await mount(page, `${TABLE.replace("<table>", '<table id="t">')}
    <data-plot src="#t"><plot-marks x="a" y="b"></plot-marks></data-plot>
    <plot-marks id="alone" src="#t"><template><b>{name}</b></template></plot-marks>`);
  const same = await page.evaluate(() => document.querySelector("data-plot").data === document.querySelector("#alone").data);
  expect(same).toBe(true);
  await page.evaluate(() => document.querySelector("tbody").insertAdjacentHTML("beforeend", "<tr><td>s</td><td>2</td><td>4</td><td>two</td></tr>"));
  await expect(page.locator("data-plot .plot-dot")).toHaveCount(4);
  await expect(page.locator("#alone b")).toHaveText(["p", "q", "r", "s"]);
});

test("a layer's own data wins over its plot's, and the plot's scales cover both", async ({ page }) => {
  await mount(page, `<data-plot>${TABLE}
    <plot-marks x="a" y="b"></plot-marks>
    <plot-marks class="mean" x="a" y="b"><datalist><option data-a="50" data-b="10"></option></datalist><template><i></i></template></plot-marks>
  </data-plot>`);
  const result = await page.evaluate(() => {
    const plot = document.querySelector("data-plot");
    return { domain: plot.scales.x.domain, mean: document.querySelector(".mean i").style.getPropertyValue("--x"), dots: document.querySelectorAll(".plot-dot").length };
  });
  expect(result).toEqual({ domain: [0, 50], mean: "1", dots: 3 });
  // .data on a layer inside a plot isn't ignored.
  await page.evaluate(() => (document.querySelector(".mean").data = [{ a: 25, b: 10 }]));
  await expect.poll(() => page.evaluate(() => document.querySelector(".mean i").style.getPropertyValue("--x"))).toBe("1");
  expect(await page.evaluate(() => document.querySelector("data-plot").scales.x.domain)).toEqual([0, 25]);
});

test("a source added later, inside the element, is picked up", async ({ page }) => {
  await mount(page, `<data-plot><plot-marks x="a" y="b"></plot-marks></data-plot>`);
  await page.evaluate(() => document.querySelector("data-plot").insertAdjacentHTML("afterbegin", '<script type="application/json">[{"a": 1, "b": 1}]</script>'));
  await expect(page.locator(".plot-dot")).toHaveCount(1);
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
  await mount(page, `${TABLE.replace("<table>", '<table id="t">')}<plot-marks src="#t"><template><b>{name}</b></template></plot-marks>`);
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
  await mount(page, `${TABLE.replace("<table>", '<table id="t" hidden>')}<data-plot src="#t" aria-label="Three points"><plot-marks x="a" y="b"></plot-marks></data-plot>`);
  await expect(page.locator(".plot-dot")).toHaveCount(3);
  await expect(page.locator("plot-marks")).not.toHaveAttribute("aria-hidden");
  // Labelled and not described by a table: the plot is read as one image.
  await expect(page.locator("data-plot")).toHaveAttribute("role", "img");
});

test("page CSS beats the defaults: a mark can be a bar", async ({ page }) => {
  await mount(page, `<style>data-plot > plot-marks > .bar { bottom: 0; translate: -50% 0; block-size: calc(var(--y) * 100%); inline-size: 10px; }</style>
    <data-plot y-domain="0 auto"><table><tr><th>k</th><th>v</th></tr><tr><td>a</td><td>5</td></tr><tr><td>b</td><td>10</td></tr></table>
    <plot-marks x="k" y="v"><template><div class="bar"></div></template></plot-marks></data-plot>`);
  const boxes = await page.$$eval(".bar", (els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  expect(boxes).toEqual([100, 200]);
});

test("x2/y2: a range on the same scale, as start and length; rows without a position get no mark", async ({ page }) => {
  await mount(page, `<data-plot x-domain="0 10">
    <table><tr><th>k</th><th>from</th><th>to</th></tr>
      <tr><td>a</td><td>2</td><td>6</td></tr><tr><td>b</td><td>8</td><td>4</td></tr><tr><td>c</td><td></td><td>5</td></tr></table>
    <plot-marks x="from" x2="to" y="k"></plot-marks></data-plot>`);
  expect(await vars(page, ".plot-dot", ["--x-start", "--x-length", "--x2"])).toEqual([
    { "--x-start": "0.2", "--x-length": "0.4", "--x2": "0.6" },
    { "--x-start": "0.4", "--x-length": "0.4", "--x2": "0.4" },
  ]);
  // The default CSS stretches the mark across its range.
  const widths = await page.$$eval(".plot-dot", (els) => els.map((el) => Math.round(el.getBoundingClientRect().width)));
  expect(widths).toEqual([240, 240]);
});

test("x2 values widen the scale too", async ({ page }) => {
  await mount(page, `<data-plot><table><tr><th>a</th><th>b</th><th>y</th></tr><tr><td>0</td><td>100</td><td>1</td></tr></table>
    <plot-marks x="a" x2="b" y="y"></plot-marks></data-plot>`);
  expect(await page.evaluate(() => document.querySelector("data-plot").scales.x.domain)).toEqual([0, 100]);
});

test("a banded y scale reads top to bottom, like its table", async ({ page }) => {
  await mount(page, `<data-plot>${TABLE}<plot-marks x="a" y="name"></plot-marks><plot-axis scale="y"></plot-axis></data-plot>`);
  const y = (await vars(page, ".plot-dot", ["--y"])).map((v) => Number(v["--y"]));
  expect(y[0]).toBeGreaterThan(y[1]);
  expect(y[1]).toBeGreaterThan(y[2]);
  const labels = await page.$$eval('plot-axis .plot-tick', (els) => els.map((el) => [el.textContent, Number(el.style.getPropertyValue("--at"))]));
  expect(labels[0][1]).toBeGreaterThan(labels[2][1]);
});

test("repeat stamps a row once per unit, with --index and --count; alone, color still applies", async ({ page }) => {
  await mount(page, `<plot-marks repeat="value" color="k" aria-label="units">
    <datalist><option value="3" data-k="a"></option><option value="2" data-k="b"></option><option value="0" data-k="c"></option></datalist>
    <template><i>{k}</i></template></plot-marks>`);
  await expect(page.locator("plot-marks i")).toHaveText(["a", "a", "a", "b", "b"]);
  const props = await vars(page, "plot-marks i", ["--index", "--count", "--color"]);
  expect(props.map((p) => p["--index"])).toEqual(["0", "1", "2", "0", "1"]);
  expect(props[0]["--count"]).toBe("3");
  expect(props[0]["--color"]).not.toBe(props[3]["--color"]);
  // Fewer units removes the extra copies.
  await page.evaluate(() => (document.querySelector("plot-marks").data = [{ k: "a", value: 1 }]));
  await expect(page.locator("plot-marks i")).toHaveCount(1);
});

test("a grid table: column headers become a field, each cell a row; empty cells are skipped", async ({ page }) => {
  await mount(page, `<data-plot column-field="month" value-field="mm">
    <table><thead><tr><th>city</th><th>Jan</th><th>Feb</th></tr></thead>
      <tbody><tr><th>Rome</th><td>67</td><td>58</td></tr><tr><th>Oslo</th><td>49</td><td></td></tr></tbody></table>
    <plot-marks x="month" y="city" color="mm"></plot-marks></data-plot>`);
  expect(await page.evaluate(() => document.querySelector("data-plot").data)).toEqual([
    { city: "Rome", month: "Jan", mm: 67 },
    { city: "Rome", month: "Feb", mm: 58 },
    { city: "Oslo", month: "Jan", mm: 49 },
  ]);
  await expect(page.locator(".plot-dot")).toHaveCount(3);
  // Filling the empty cell adds its mark.
  await page.evaluate(() => (document.querySelector("tbody tr:last-child td:last-child").textContent = "40"));
  await expect(page.locator(".plot-dot")).toHaveCount(4);
});

test("cells can carry a machine value: data-value, <data value>, <time datetime>", async ({ page }) => {
  await mount(page, `<data-plot><table>
    <thead><tr><th>a</th><th>b</th><th>c</th><th>d</th></tr></thead>
    <tbody><tr><td data-value="1200000">$1.2M</td><td><data value="42">forty-two</data></td><td><time datetime="2026-10-04">Oct 4</time></td><td>about <data value="7">seven</data></td></tr></tbody>
    </table></data-plot>`);
  expect(await page.evaluate(() => document.querySelector("data-plot").data)).toEqual([{ a: 1200000, b: 42, c: "2026-10-04", d: "about seven" }]);
  // Changing a <data value> re-reads the table.
  await page.evaluate(() => document.querySelector("data").setAttribute("value", "43"));
  await expect.poll(() => page.evaluate(() => document.querySelector("data-plot").data[0].b)).toBe(43);
});

test("every attribute has a matching property", async ({ page }) => {
  await mount(page, `<data-plot><plot-marks></plot-marks><plot-line></plot-line><plot-axis></plot-axis><plot-legend></plot-legend></data-plot>`);
  const result = await page.evaluate(() => {
    const [plot, marks, line, axis, legend] = ["data-plot", "plot-marks", "plot-line", "plot-axis", "plot-legend"].map((tag) => document.querySelector(tag));
    marks.x = "rain";
    marks.x2 = "end";
    marks.columnField = "month";
    plot.yDomain = "0 auto";
    plot.xPadding = 0.1;
    axis.grid = true;
    axis.ticks = 4;
    line.color = "city";
    legend.label = "Key";
    const written = [marks.getAttribute("x"), marks.getAttribute("x2"), marks.getAttribute("column-field"), plot.getAttribute("y-domain"), plot.getAttribute("x-padding"), axis.hasAttribute("grid"), axis.getAttribute("ticks"), line.getAttribute("color"), legend.getAttribute("label")];
    marks.setAttribute("key", "id");
    axis.removeAttribute("grid");
    marks.x = null;
    return { written, read: [marks.key, axis.grid, marks.hasAttribute("x"), marks.y, plot.yPadding, axis.ticks] };
  });
  expect(result).toEqual({
    written: ["rain", "end", "month", "0 auto", "0.1", true, "4", "city", "Key"],
    read: ["id", false, false, "", 0.2, 4],
  });
});

test(".mark builds marks from script, keeping each row's element; render fires after each draw", async ({ page }) => {
  await mount(page, `<data-plot>${TABLE}<plot-marks x="a" y="b" key="name"></plot-marks></data-plot>`);
  const result = await page.evaluate(async () => {
    const tick = () => new Promise((r) => setTimeout(r, 0));
    const plot = document.querySelector("data-plot");
    const marks = plot.querySelector("plot-marks");
    let renders = 0;
    plot.addEventListener("render", () => renders++);
    const calls = [];
    marks.mark = (row, previous) => {
      calls.push([row.name, Boolean(previous)]);
      const star = previous ?? document.createElement("u");
      star.textContent = row.name;
      return star;
    };
    await tick();
    const first = [...marks.querySelectorAll("u")];
    // Changing the rows in place needs requestRender().
    plot.data[0].name = "p";
    plot.data[0].b = 0;
    plot.requestRender();
    await tick();
    const kept = [...marks.querySelectorAll("u")].every((el, i) => el === first[i]);
    return { calls, kept, dots: marks.querySelectorAll(".plot-dot").length, renders, x: first.map((el) => el.style.getPropertyValue("--x")) };
  });
  expect(result.calls).toEqual([["p", false], ["q", false], ["r", false], ["p", true], ["q", true], ["r", true]]);
  expect(result).toMatchObject({ kept: true, dots: 0, renders: 2, x: ["0", "0.5", "1"] });
});

test("alone, a layer fires render, and the plot's frame rules apply to it too", async ({ page }) => {
  await mount(page, `${TABLE.replace("<table>", '<table id="t">')}`);
  const result = await page.evaluate(async () => {
    const marks = Object.assign(document.createElement("plot-marks"), { src: "#t", color: "g" });
    let renders = 0;
    marks.addEventListener("render", () => renders++);
    document.body.append(marks);
    await new Promise((r) => setTimeout(r, 0));
    return { renders, dots: marks.querySelectorAll(".plot-dot").length, color: Boolean(marks.querySelector(".plot-dot").style.getPropertyValue("--color")), hidden: marks.hasAttribute("aria-hidden") };
  });
  // A visible table describes the data, so the marks are hidden from assistive technology.
  expect(result).toEqual({ renders: 1, dots: 3, color: true, hidden: true });
});

test("no readable table and no label: a console warning", async ({ page }) => {
  const warnings = [];
  page.on("console", (message) => message.type() === "warning" && warnings.push(message.text()));
  await mount(page, `<data-plot><datalist><option value="1"></option></datalist><plot-marks x="label" y="value"></plot-marks></data-plot>`);
  await expect.poll(() => warnings.length).toBe(1);
  expect(warnings[0]).toContain("aria-label");
});

test("a new layer, written as the README shows, draws on the plot's scales", async ({ page }) => {
  await mount(page, `<style>plot-rule > span { position: absolute; inset-inline: 0; bottom: calc(var(--y) * 100%); border-block-start: 2px dashed; }</style>
    <data-plot y-domain="0 auto">${TABLE}<plot-marks x="a" y="b"></plot-marks><plot-rule value="10"></plot-rule></data-plot>`);
  const result = await page.evaluate(async () => {
    const { PlotLayer } = await import("/src/index.mjs");
    class PlotRule extends PlotLayer {
      static observedAttributes = ["value"];
      draw(context) {
        super.draw(context);
        const y = context.scales.y?.(Number(this.getAttribute("value")));
        if (Number.isFinite(y)) this.style.setProperty("--y", String(y));
        if (!this.firstElementChild) this.append(document.createElement("span"));
      }
    }
    customElements.define("plot-rule", PlotRule);
    await new Promise((r) => setTimeout(r, 0));
    const rule = document.querySelector("plot-rule");
    const plot = document.querySelector("data-plot").getBoundingClientRect();
    return { y: rule.style.getPropertyValue("--y"), bottom: Math.round(plot.bottom - rule.firstElementChild.getBoundingClientRect().bottom), hidden: rule.hasAttribute("aria-hidden") };
  });
  // 10 of 0…20, so halfway up a 200px plot; hidden like the other layers, since the table describes the data.
  expect(result).toEqual({ y: "0.5", bottom: 100, hidden: true });
});
