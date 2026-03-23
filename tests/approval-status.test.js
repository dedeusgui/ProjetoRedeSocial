import test from "node:test";
import assert from "node:assert/strict";

import { approvalClass, reputationTierClass } from "../src/public/js/core/formatters.js";

test("approvalClass uses the same low medium high bands as reputation colors", () => {
  assert.equal(approvalClass(-5), "status-negative");
  assert.equal(approvalClass(0), "status-negative");
  assert.equal(approvalClass(39), "status-negative");
  assert.equal(approvalClass(40), "status-neutral");
  assert.equal(approvalClass(69), "status-neutral");
  assert.equal(approvalClass(70), "status-positive");
  assert.equal(approvalClass(120), "status-positive");
});

test("reputationTierClass stays aligned with the shared status palette", () => {
  assert.equal(reputationTierClass("low"), "status-negative");
  assert.equal(reputationTierClass("medium"), "status-neutral");
  assert.equal(reputationTierClass("high"), "status-positive");
  assert.equal(reputationTierClass("unexpected"), "status-negative");
});
