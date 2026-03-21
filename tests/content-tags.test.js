import test from "node:test";
import assert from "node:assert/strict";

import {
  CONTENT_TAG_MAX_ITEMS as BACKEND_MAX_ITEMS,
  CONTENT_TAG_MAX_LENGTH as BACKEND_MAX_LENGTH,
  normalizeContentTag as normalizeBackendContentTag,
  validateContentTags as validateBackendContentTags,
} from "../src/common/tags/contentTags.js";
import {
  CONTENT_TAG_MAX_ITEMS as FRONTEND_MAX_ITEMS,
  CONTENT_TAG_MAX_LENGTH as FRONTEND_MAX_LENGTH,
  parseContentTagsInput,
  validateContentTags as validateFrontendContentTags,
} from "../src/public/js/core/content-tags.js";

test("frontend and backend tag constants stay aligned", () => {
  assert.equal(FRONTEND_MAX_ITEMS, BACKEND_MAX_ITEMS);
  assert.equal(FRONTEND_MAX_LENGTH, BACKEND_MAX_LENGTH);
});

test("frontend parsing keeps comma separation while validation normalizes values", () => {
  const parsed = parseContentTagsInput(" Node.js , back end, #Study ");
  assert.deepEqual(parsed, ["Node.js", "back end", "#Study"]);

  const analysis = validateFrontendContentTags(parsed);
  assert.equal(analysis.hasErrors, false);
  assert.deepEqual(analysis.normalizedTags, ["nodejs", "back-end", "study"]);
});

test("duplicate tags are rejected after normalization", () => {
  const analysis = validateFrontendContentTags([
    "Backend",
    "backend",
    "front end",
    "front-end",
  ]);

  assert.equal(analysis.hasErrors, true);
  assert.deepEqual(analysis.duplicateTags, ["backend", "front-end"]);
  assert.deepEqual(analysis.normalizedTags, ["backend", "front-end"]);
});

test("tag overflow is detected after the fifth parsed tag", () => {
  const analysis = validateBackendContentTags([
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
  ]);

  assert.equal(analysis.hasErrors, true);
  assert.equal(analysis.tagCount, 6);
  assert.deepEqual(analysis.overflowTags, ["six"]);
  assert.deepEqual(analysis.normalizedTags, [
    "one",
    "two",
    "three",
    "four",
    "five",
  ]);
});

test("backend normalization removes unsupported characters and leading hashes", () => {
  assert.equal(normalizeBackendContentTag(" #Node.js "), "nodejs");
  assert.equal(normalizeBackendContentTag("Back End"), "back-end");
  assert.equal(normalizeBackendContentTag("API!!!"), "api");
});

test("tags that become empty or exceed 10 chars are invalid", () => {
  const analysis = validateBackendContentTags([
    "!!!",
    "abcdefghijk",
  ]);

  assert.equal(analysis.hasErrors, true);
  assert.deepEqual(analysis.emptyTags, ["!!!"]);
  assert.deepEqual(analysis.tooLongTags, ["abcdefghijk"]);
});
