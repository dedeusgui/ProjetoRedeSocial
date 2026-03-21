import test from "node:test";
import assert from "node:assert/strict";

import {
  POST_MEDIA_MAX_ITEMS,
  appendPostImageSelection,
  filterPostImageFiles,
  getRemainingPostImageSlots,
} from "../src/public/js/features/posts/media-selection.js";

function createFile(name, type = "image/png") {
  return {
    name,
    type,
    size: 1024,
  };
}

test("filters only image files while preserving insertion order", () => {
  const files = [
    createFile("cover.png"),
    createFile("notes.txt", "text/plain"),
    createFile("diagram.webp", "image/webp"),
  ];

  assert.deepEqual(filterPostImageFiles(files), [
    files[0],
    files[2],
  ]);
});

test("accumulates image selections up to the post media max", () => {
  const currentFiles = [
    createFile("first.png"),
    createFile("second.png"),
  ];
  const incomingFiles = [
    createFile("third.png"),
    createFile("fourth.png"),
    createFile("fifth.png"),
  ];

  const result = appendPostImageSelection(currentFiles, incomingFiles);

  assert.equal(POST_MEDIA_MAX_ITEMS, 4);
  assert.deepEqual(result.selectedFiles.map((file) => file.name), [
    "first.png",
    "second.png",
    "third.png",
    "fourth.png",
  ]);
  assert.deepEqual(result.acceptedIncomingFiles.map((file) => file.name), [
    "third.png",
    "fourth.png",
  ]);
  assert.equal(result.overflowCount, 1);
  assert.equal(result.remainingSlots, 0);
});

test("existing saved images reduce how many new selections fit in edit mode", () => {
  const currentFiles = [createFile("draft-1.png")];
  const incomingFiles = [
    createFile("draft-2.png"),
    createFile("draft-3.png"),
  ];

  const result = appendPostImageSelection(currentFiles, incomingFiles, {
    occupiedSlots: 2,
  });

  assert.deepEqual(result.selectedFiles.map((file) => file.name), [
    "draft-1.png",
    "draft-2.png",
  ]);
  assert.deepEqual(result.acceptedIncomingFiles.map((file) => file.name), [
    "draft-2.png",
  ]);
  assert.equal(result.overflowCount, 1);
  assert.equal(result.remainingSlots, 0);
});

test("invalid non-image files are ignored and reported separately from overflow", () => {
  const result = appendPostImageSelection(
    [],
    [
      createFile("readme.pdf", "application/pdf"),
      createFile("photo.png"),
      createFile("archive.zip", "application/zip"),
    ],
  );

  assert.deepEqual(result.selectedFiles.map((file) => file.name), ["photo.png"]);
  assert.equal(result.invalidTypeCount, 2);
  assert.equal(result.overflowCount, 0);
  assert.equal(result.remainingSlots, 3);
});

test("remaining slots never drop below zero", () => {
  assert.equal(
    getRemainingPostImageSlots({
      occupiedSlots: 4,
      selectedCount: 2,
    }),
    0,
  );
});
