import PlotLine from "./index.mjs";

if (!customElements.get("plot-line")) customElements.define("plot-line", PlotLine);

export default PlotLine;
