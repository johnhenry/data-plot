import PlotMarks from "./index.mjs";

if (!customElements.get("plot-marks")) customElements.define("plot-marks", PlotMarks);

export default PlotMarks;
