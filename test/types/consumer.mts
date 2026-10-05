// Type-checked (never run) by `npm test`: consumes the generated
// declarations through the package's own export paths, the way a user would.
import DataPlot from "@johnhenry/data-plot/data-plot";
import "@johnhenry/data-plot/global.mjs";
import { PlotMarks, PlotLine, PlotAxis, PlotLegend, ChernoffFace, DataLayer, linear, band, position, color, readTable, readDatalist } from "@johnhenry/data-plot";
import { nice, ticks, extent } from "@johnhenry/data-plot/scale.mjs";
import { readSource, coerce } from "@johnhenry/data-plot/data.mjs";

const plot = document.querySelector("data-plot");
if (plot) {
  plot.src = "#rain";
  plot.yDomain = "0 auto";
  const padding: number = plot.xPadding;
  const rows: object[] = plot.data;
  plot.data = [{ a: 1 }];
  plot.requestRender();
  plot.render();
  void padding, rows, plot.scales;
}
const marks = document.querySelector("plot-marks");
if (marks) {
  marks.x = "rain";
  marks.x2 = "end";
  marks.repeat = "count";
  marks.mark = (row: object, previous?: Element) => previous ?? document.createElement("span");
  void marks.data, marks.plot;
}
const axis = document.querySelector("plot-axis");
if (axis) {
  axis.grid = true;
  const ticksWanted: number = axis.ticks;
  void ticksWanted;
}
const face = document.querySelector("chernoff-face");
if (face) face.features = { smile: 1 };

const scale = linear([0, 10]);
const half: number = scale(5);
const categories = band(["a", "b"]);
const fill: string = color(["a", "b"])("a");
void half, categories.bandwidth, fill, position([1, 2]), nice([1, 9]), ticks([0, 1]), extent([1, 2]), coerce("4");
void readTable, readDatalist, readSource;
void DataPlot, PlotMarks, PlotLine, PlotAxis, PlotLegend, ChernoffFace, DataLayer;
