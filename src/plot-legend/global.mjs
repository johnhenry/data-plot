import PlotLegend from "./index.mjs";

if (!customElements.get("plot-legend")) customElements.define("plot-legend", PlotLegend);

export default PlotLegend;
