// Automated accessibility audits (axe-core), one for each way a plot is
// made accessible: a table inside it, a visible table elsewhere, a labelled
// plot over a datalist or JSON, and marks standing alone.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mount } from "./helpers.mjs";

const MODULES = ["src/global.mjs"];
// Element fixtures are fragments, not pages.
const FRAGMENT_RULES = ["landmark-one-main", "page-has-heading-one", "region"];

const audit = async (page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .disableRules(FRAGMENT_RULES)
    .analyze();
  return violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
};

const TABLE = `<table><caption>Rain and sun</caption>
  <thead><tr><th>city</th><th>region</th><th>rain</th><th>sun</th></tr></thead>
  <tbody><tr><td>Lisbon</td><td>South</td><td>690</td><td>2800</td></tr><tr><td>Oslo</td><td>North</td><td>760</td><td>1670</td></tr></tbody></table>`;

const ALL = `
  <data-plot>${TABLE}
    <plot-axis scale="x" label="Rain" grid></plot-axis><plot-axis scale="y" label="Sun"></plot-axis>
    <plot-marks x="rain" y="sun" color="region"></plot-marks><plot-line x="rain" y="sun"></plot-line><plot-legend></plot-legend>
  </data-plot>
  <data-plot aria-label="Cups of coffee, Monday and Tuesday">
    <datalist><option label="Mon" value="3"></option><option label="Tue" value="5"></option></datalist>
    <plot-axis scale="x"></plot-axis>
    <plot-marks x="label" y="value"><template><div class="bar" title="{label}: {value}"></div></template></plot-marks>
  </data-plot>
  ${TABLE.replace("<table>", '<table id="t">')}
  <plot-marks src="#t" color="region"><template><span>{city}</span></template></plot-marks>
  <data-plot src="#t" aria-label="Two cities as faces">
    <plot-marks x="rain" y="sun"><template><chernoff-face :smile="sun" aria-label="{city}"></chernoff-face></template></plot-marks>
  </data-plot>`;

test("every way of making a plot accessible passes axe", async ({ page }) => {
  await mount(page, ALL, MODULES);
  await expect(page.locator("chernoff-face")).toHaveCount(2);
  expect(await audit(page)).toEqual([]);
});

test("and still passes after the data changes", async ({ page }) => {
  await mount(page, ALL, MODULES);
  await page.evaluate(() => {
    document.querySelector("#t tbody").insertAdjacentHTML("beforeend", "<tr><td>Rome</td><td>South</td><td>800</td><td>2470</td></tr>");
    document.querySelectorAll("data-plot")[1].data = [{ label: "Wed", value: 2 }];
  });
  await expect(page.locator("chernoff-face")).toHaveCount(3);
  expect(await audit(page)).toEqual([]);
});
