import PlotAxis from "./index.mjs";

if (!customElements.get("plot-axis")) customElements.define("plot-axis", PlotAxis);

export default PlotAxis;
