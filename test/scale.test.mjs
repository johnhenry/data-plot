import { test } from "node:test";
import assert from "node:assert/strict";
import { nice, ticks, linear, band, position, color, extent, tickStep } from "../src/scale.mjs";

test("tick steps are 1, 2, or 5 × 10ⁿ", () => {
  assert.equal(tickStep(10, 5), 2);
  assert.equal(tickStep(1, 4), 0.2);
  assert.equal(tickStep(2400, 6), 500);
});

test("nice widens to whole steps; ticks land on them without float noise", () => {
  assert.deepEqual(nice([420, 2250]), [400, 2400]);
  assert.deepEqual(ticks([0, 1], 5), [0, 0.2, 0.4, 0.6, 0.8, 1]);
  assert.deepEqual(ticks([0.1, 0.3], 2), [0.1, 0.2, 0.3]);
  assert.deepEqual(nice([5, 5]), [0, 5]);
});

test("linear maps the domain to 0…1; a single value sits in the middle", () => {
  const scale = linear([0, 200]);
  assert.equal(scale(50), 0.25);
  assert.equal(linear([3, 3])(3), 0.5);
});

test("band gives each distinct value an equal band, mapped to its center", () => {
  const scale = band(["a", "b", "a", "c", "d"]);
  assert.deepEqual(scale.domain, ["a", "b", "c", "d"]);
  assert.equal(scale("a"), 0.125);
  assert.equal(scale("d"), 0.875);
  assert.ok(Math.abs(scale.bandwidth - 0.2) < 1e-12);
  assert.ok(Number.isNaN(scale("z")));
});

test("position picks linear for numbers, band otherwise, and honors pinned ends", () => {
  assert.equal(position([1, 9]).type, "linear");
  assert.deepEqual(position([1.3, 9.2]).domain, [1, 10]);
  assert.equal(position([1, "x"]).type, "band");
  assert.deepEqual(position([3, 6], "0 auto").domain, [0, 6]);
  assert.deepEqual(position([3, 6], "auto 100").domain, [0, 100]);
  assert.equal(position([]).type, "band");
});

test("color: categories in order of appearance; numbers on a ramp", () => {
  const categories = color(["b", "a", "b"]);
  assert.equal(categories.type, "categorical");
  assert.notEqual(categories("a"), categories("b"));
  assert.equal(categories("b"), color(["b"])("b"));
  const ramp = color([0, 10]);
  assert.equal(ramp.type, "sequential");
  assert.match(ramp(5), /color-mix\(in oklab, .* 50\.0%, .*\)/);
});

test("extent skips non-numbers", () => {
  assert.deepEqual(extent([3, "x", -1, NaN, 8]), [-1, 8]);
  assert.deepEqual(extent(["x"]), [0, 1]);
});

test("position: a type override makes numeric codes a band, or non-numbers linear", () => {
  const codes = position([2020, 2021, 2020, 2022], null, undefined, "band");
  assert.equal(codes.type, "band");
  assert.deepEqual(codes.domain, [2020, 2021, 2022]);
  assert.equal(position([1, 2], null, undefined, "auto").type, "linear");
  assert.equal(position([1, 2], null, undefined, "bogus").type, "linear");
  assert.equal(position([1, "x", 5], null, undefined, "linear").type, "linear");
  assert.deepEqual(position([1, "x", 5], null, undefined, "linear").domain, [1, 5]);
});

test("color: a type override, and the ramp's ends", () => {
  const codes = color([1, 2, 1], { type: "categorical" });
  assert.equal(codes.type, "categorical");
  assert.deepEqual(codes.domain, [1, 2]);
  assert.notEqual(codes(1), codes(2));
  assert.equal(color(["a", "b"], { type: "sequential" }).type, "categorical", "non-numbers can't be a ramp");
  const themed = color([0, 10], { low: "var(--lo)", high: "red" });
  assert.match(themed(10), /color-mix\(in oklab, red 100\.0%, var\(--lo\)\)/);
});
