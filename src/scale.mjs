// Scales: data values to positions from 0 to 1 (and colors). Every scale is
// a function with a few properties, so layers can ask it for ticks.

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

/** A "nice" tick step for a span divided into about `count` parts: 1, 2, or 5 × 10ⁿ. */
export function tickStep(span, count) {
  const raw = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const error = raw / power;
  return power * (error >= 7.5 ? 10 : error >= 3.5 ? 5 : error >= 1.5 ? 2 : 1);
}

/** Widens [min, max] outward to whole tick steps. */
export function nice([min, max], count = 6) {
  if (min === max) return min === 0 ? [0, 1] : [Math.min(0, min), Math.max(0, max)];
  const step = tickStep(max - min, count);
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

/** Evenly stepped values from min to max, at a nice step. */
export function ticks([min, max], count = 6) {
  if (min === max) return [min];
  const step = tickStep(max - min, count);
  const out = [];
  // Rounding keeps 0.1 + 0.2 from printing as 0.30000000000000004.
  const digits = Math.max(0, -Math.floor(Math.log10(step)));
  for (let value = Math.ceil(min / step) * step; value <= max + step / 1e6; value += step) {
    out.push(Number(value.toFixed(digits)));
  }
  return out;
}

/** Continuous numbers: domain [min, max] → 0…1. */
export function linear(domain) {
  const [min, max] = domain;
  const scale = (value) => (!isNumber(value) ? NaN : max === min ? 0.5 : (value - min) / (max - min));
  return Object.assign(scale, {
    type: "linear",
    domain,
    bandwidth: 0,
    ticks: (count) => ticks(domain, count),
  });
}

/** Distinct values, each given an equal band; a value maps to its band's center. */
export function band(values, padding = 0.2) {
  const domain = [...new Set(values)];
  const step = 1 / Math.max(1, domain.length);
  const index = new Map(domain.map((value, i) => [value, i]));
  const scale = (value) => (index.has(value) ? (index.get(value) + 0.5) * step : NaN);
  return Object.assign(scale, {
    type: "band",
    domain,
    bandwidth: step * (1 - padding),
    ticks: () => domain,
  });
}

// A categorical palette that stays legible on light and dark backgrounds.
export const PALETTE = ["#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951", "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0"];

/** Categories → palette colors (in order of appearance), or numbers → a ramp between two colors. */
export function color(values, { palette = PALETTE, low = "#d7e5f5", high = "#1f4e99" } = {}) {
  if (values.length && values.every(isNumber)) {
    const position = linear(extent(values));
    const scale = (value) => `color-mix(in oklab, ${high} ${(position(value) * 100).toFixed(1)}%, ${low})`;
    return Object.assign(scale, { type: "sequential", domain: position.domain, ticks: (count) => ticks(position.domain, count) });
  }
  const domain = [...new Set(values)];
  const index = new Map(domain.map((value, i) => [value, i]));
  const scale = (value) => palette[index.get(value) % palette.length] ?? "currentColor";
  return Object.assign(scale, { type: "categorical", domain, ticks: () => domain });
}

/** [smallest, largest] of the finite numbers in `values`, or [0, 1] if there are none. */
export function extent(values) {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (!isNumber(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return min === Infinity ? [0, 1] : [min, max];
}

/**
 * A position scale for `values`: linear when they're all numbers, banded
 * otherwise. `spec` is the `x-domain`/`y-domain` attribute: "0 100", or
 * "0 auto" to pin one end, applied before rounding to nice ticks. `padding`
 * is a banded scale's empty share of each band.
 */
export function position(values, spec, padding) {
  const present = values.filter((value) => value !== null && value !== undefined && value !== "");
  if (!present.length || !present.every(isNumber)) return band(present, Number.isFinite(padding) ? Math.min(1, Math.max(0, padding)) : undefined);
  let [min, max] = extent(present);
  const [low, high] = (spec ?? "").trim().split(/\s+/);
  const pinned = (text, fallback) => (text && text !== "auto" && Number.isFinite(Number(text)) ? Number(text) : fallback);
  min = pinned(low, min);
  max = pinned(high, max);
  const [niceMin, niceMax] = nice([min, max]);
  return linear([pinned(low, niceMin), pinned(high, niceMax)]);
}

/**
 * Scales any numeric field to 0–1, for `:attr` bindings. A field a channel
 * already scales (in `fixed`, field → scale) uses that scale, so `:size`
 * and `size` agree; any other field spans its values across `rowSets`.
 * Results are clamped to 0–1.
 */
export function unitScale(rowSets, fixed = new Map()) {
  const cache = new Map(fixed);
  return (field, value) => {
    if (!isNumber(value)) return NaN;
    if (!cache.has(field)) cache.set(field, linear(extent(rowSets.flatMap((rows) => rows.map((row) => row[field])))));
    return Math.min(1, Math.max(0, cache.get(field)(value)));
  };
}

export const isNumeric = isNumber;
