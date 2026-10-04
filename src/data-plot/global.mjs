import DataPlot from "./index.mjs";

if (!customElements.get("data-plot")) customElements.define("data-plot", DataPlot);

export default DataPlot;
