// `npm run manifest` -> custom-elements.json, the machine-readable
// description of every stable element (tag, attributes, properties,
// events, CSS parts/properties). Elements opt in with JSDoc (@tag, @attr,
// @fires, ...) as they meet docs/principles.md; scripts/manifest-outputs.mjs
// turns the manifest into editor autocomplete data and TypeScript types.
export default {
  // layer.mjs: the base classes, so inherited members (data, requestRender) appear.
  globs: ["src/**/index.mjs", "src/layer.mjs"],
  outdir: ".",
};
