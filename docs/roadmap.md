# Roadmap

What's built: `<data-plot>` (data from a table, a datalist, JSON, or `.data`; linear,
banded, and color scales), `<plot-marks>` (template marks, `x2`/`y2`
ranges, `repeat`), `<plot-line>`, `<plot-axis>`, `<plot-legend>`, and the
`:attr`/`{field}` template bindings. The demos cover scatter, bubble, line,
bars, heatmap, waffle, pictogram, sparkline, Gantt, dumbbell, error bars,
and Chernoff-face glyphs.

Everything below keeps one contract: **a layout or scale computes
positions, and marks receive them as custom properties.** Whatever draws
the points (a template, a `<chernoff-face>`, a `.plot-dot`) never changes,
which is what makes a new chart type cheap.

## Part 1: finishing the core

### 3. Time and log scales

- **Time:** a field whose values parse as ISO dates (`2026-10-04`,
  `2026-10`, `2026-10-04T09:00`) gets a time scale. Ticks fall on calendar
  units (hours, days, weeks, months, years) chosen by span, and labels
  use `Intl.DateTimeFormat` with the page's `lang`. A `<td>`'s
  `data-value` or a `<time datetime>` inside it wins over its text.
- **Log:** `x-type="log"` / `y-type="log"`, with ticks at powers of ten
  (and 2 and 5 between them when there's room). Also `sqrt` for sizes,
  since area should grow with the value.
- **`x-type` / `y-type`** become the general override (`linear`, `log`,
  `sqrt`, `time`, `band`), for numeric codes that should be categories.
- Done when: the Gantt demo uses real dates, and a log-scale demo shows
  values spanning six orders of magnitude.

### 4. `<plot-area>` and stacking

- **`<plot-area x y y2>`:** a filled shape between `y` and `y2` (or the
  axis, without `y2`), one per series of `color`. The same SVG technique
  as `<plot-line>`. A confidence band is `y="low" y2="high"`.
- **Stacking**, as an attribute on the layer: `stack` (`stack="normalize"`
  for 100%) offsets each series by the ones before it, within each `x`.
  The layer writes the stacked ends to the marks as `--y-start` and
  `--y-length`, the same properties a range uses, so stacked bars need no
  new CSS. Streamgraphs are `stack="center"` on an area.
- Scales see the stacked totals, not the raw values.
- Done when: the demos include stacked bars, 100% bars, a stacked area,
  and a confidence band around a line.

### 5. Transforms: histograms, box plots, density, trends

- A **`transform`** attribute on a layer derives new rows from the data
  before it's drawn, without touching the source table:
  - `transform="bin(age, 10)"`: one row per bin with `x`, `x2`, and
    `count`. A histogram is then bars with `x`/`x2` ranges.
  - `transform="summary(score by group)"`: `min`, `q1`, `median`, `q3`,
    `max`, and `mean` per group. A box plot is a `y`/`y2` range for the
    box, another for the whiskers, and a rule at the median.
  - `transform="density(score)"`: a kernel density curve for `<plot-line>`
    or `<plot-area>`.
  - `transform="regression(x, y)"`: the fitted line's endpoints and an
    `r²` field for a label.
- **The math library, optionally:** binning and quantiles are a few lines
  here. Density bandwidth selection and regression with intervals would
  call `@johnhenry/math`'s `Statistics`/`Distributions`, loaded with a
  dynamic `import()` only when one of those transforms is used. A page
  with no transform loads nothing extra, and markable keeps zero runtime
  dependencies.
- Done when: histogram, box plot, violin (density, mirrored), and
  scatter-with-trend demos.

### 6. `<plot-pie>`: angles instead of x and y

- Its own frame, outside `<data-plot>`: `<plot-pie value="votes"
  color="party">`, reading the same data sources. Slices are a single CSS
  `conic-gradient`, and each row also gets an element with `--angle`,
  `--start`, and `--share` for labels, so `{field}` templates still work.
  `hole="0.6"` makes a donut.
- **Radar:** the same angular frame, with a value along each spoke
  (`<plot-radar>`), and `<plot-line>`-style polygons per series.
- Done when: pie, donut, and radar demos, and the docs say plainly when
  a bar chart reads better.

### Also part of the core

- **`src` URLs:** `src="rain.csv"` or `src="rain.json"` fetched and read
  like an in-page source (CSV like a table, so numeric text becomes
  numbers), with `error` on failure. Today `src` takes only an `#id`.
- **Facets:** `<data-plot facet="region">` repeats its layers once per
  value, as a CSS grid of small plots sharing scales (or `independent-y`).
- **Interaction:** a `select` event when a mark is clicked or focused,
  carrying its row; marks focusable with `tabindex` from the template;
  `:hover`/`:focus` styling left to CSS. A `<plot-tooltip>` that fills
  a template with the hovered row.
- **A canvas mark** for many thousands of points, drawing the same rows
  with the same scales into one `<canvas>` (canvas-fx could then apply
  effects to it).
- **Annotations:** `<plot-rule x="…">` and `<plot-text>` for reference
  lines and labels at data coordinates.

## Part 2: what I'd left out, and how each would fit

These need a **layout**: an algorithm that computes positions from data
whose structure isn't two independent axes. The plan is for layouts to
be elements that take the place of `<data-plot>`'s scales and hand their
marks the same custom properties, so `<plot-marks>`, templates, `:attr`,
and `{field}` all keep working.

```html
<plot-treemap data="#files" value="bytes" parent="folder" name="path">
  <plot-marks color="type"><template><div class="tile">{name}</div></template></plot-marks>
</plot-treemap>
```

A layout gives each mark `--x`, `--y`, `--width`, and `--height` (0–1),
and `--depth` for nested data. The shared CSS places any mark with
`--width` as a box, the same way the range rules work now.

### Hierarchies: treemap, sunburst, icicle, tree

- **Data:** rows with `name` and `parent` columns (a table can describe a
  tree), nested JSON with `children`, or nested `<ul>`/`<details>` in the
  page, read the way a table is read now.
- **Layouts:** squarified treemap and icicle (rectangles), sunburst
  (angles, sharing `<plot-pie>`'s frame), and tidy tree/dendrogram
  (points plus links).
- **Links** between parent and child become a `<plot-links>` layer: SVG
  paths, like `<plot-line>`, drawn from layout coordinates.
- **Size:** about the same as part 3 or 4. The algorithms are short and
  well known.

### Flows: Sankey and chord

- **Data:** a table of `source`, `target`, `value`.
- **Layout:** nodes stacked in columns by depth, link widths by value,
  with iterative relaxation to reduce crossings. Nodes are marks
  (rectangles with `--x`/`--y`/`--width`/`--height`); links are a
  `<plot-links>` layer with ribbon paths.
- Chord diagrams reuse the angular frame.
- **Size:** larger. Sankey layout quality takes tuning, so it comes
  after hierarchies.

### Networks: force-directed graphs

- **Data:** a nodes table and an edges table (`data` and `links`
  attributes), or a single edges table with nodes inferred.
- **Layout:** a force simulation that runs over frames, updating `--x`
  and `--y` as it settles. Because marks already animate through
  registered properties, settling looks smooth for free. Dragging a node
  pins it.
- **The math library:** `@johnhenry/math`'s `Graph` (BFS, shortest paths,
  components) could supply layering and highlight paths. Loaded only when
  asked for, as with the transforms.
- **Size:** medium. The simulation is the main work, and it should stop
  when settled so idle pages cost nothing.

### Maps

- **Data:** rows with longitude and latitude, plus shapes (GeoJSON,
  TopoJSON) for regions.
- **Layout:** a projection (equirectangular, Mercator, equal-area) that
  turns coordinates into `--x`/`--y`, so points on a map are ordinary
  marks. Regions are SVG paths colored by a joined field (a choropleth).
- **Size:** the largest, and mostly not about plotting: projections,
  shape simplification, and where the map data comes from. This one is
  better as a **separate package** that depends on markable's
  marks contract, the way canvas-fx and domkit meet in the page.

### Packaging

Hierarchies, flows, and networks fit in markable as optional modules
(`markable/treemap/global.mjs`, and so on): each is one layout element
plus shared link drawing, and nothing loads unless it's imported. Maps go
in their own package. If markable's own size becomes a concern, the
layouts can split out later without changing their HTML.

## Suggested order

1. Time and log scales (part 3): needed by most real data.
2. Areas and stacking (part 4).
3. Transforms, with the optional math import (part 5).
4. Treemap and tree, which establish the layout contract and
   `<plot-links>`.
5. Pie, donut, and sunburst (the angular frame).
6. Network graphs, then Sankey.
7. Facets, interaction, annotations, and the canvas mark, in between as
   demos call for them.
8. Maps, as a separate package.
