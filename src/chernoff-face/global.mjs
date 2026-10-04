import ChernoffFace from "./index.mjs";

if (!customElements.get("chernoff-face")) customElements.define("chernoff-face", ChernoffFace);

export default ChernoffFace;
