import {
  CONTENT_TAG_MAX_ITEMS,
  CONTENT_TAG_MAX_LENGTH,
  parseContentTagsInput,
  resolveContentTagValidationMessage,
  validateContentTags,
} from "../core/content-tags.js";

function setRuleState(dot, state) {
  if (!dot) {
    return;
  }

  dot.className = "tag-input-rule-dot";
  if (state === true) {
    dot.classList.add("is-ok");
  } else if (state === false) {
    dot.classList.add("is-bad");
  }
}

function buildRuleRow(text) {
  const row = document.createElement("div");
  row.className = "tag-input-rule";

  const dot = document.createElement("span");
  dot.className = "tag-input-rule-dot";
  dot.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.textContent = text;

  row.append(dot, label);
  return { row, dot };
}

function resolveChipTitle(item) {
  if (!item || !Array.isArray(item.errorCodes) || item.errorCodes.length === 0) {
    return "";
  }

  const messages = [];

  if (item.errorCodes.includes("too_long")) {
    messages.push(`Use at most ${CONTENT_TAG_MAX_LENGTH} characters per tag.`);
  }

  if (item.errorCodes.includes("duplicate")) {
    messages.push("Duplicate tag.");
  }

  if (item.errorCodes.includes("too_many")) {
    messages.push(`Use up to ${CONTENT_TAG_MAX_ITEMS} tags.`);
  }

  if (item.errorCodes.includes("empty_after_normalization")) {
    messages.push("This tag becomes empty after normalization.");
  }

  return messages.join(" ");
}

function resolveChipLabel(item) {
  return item.normalizedValue || item.rawValue || "";
}

export function createTagInputController({
  input,
  noun = "tags",
  hintText = "Separate tags with commas. Spaces become hyphens after normalization.",
} = {}) {
  if (!input) {
    return {
      getValidation() {
        return validateContentTags([]);
      },
      getNormalizedTags() {
        return [];
      },
      hasErrors() {
        return false;
      },
      focus() {},
      sync() {},
      setValue() {},
    };
  }

  const label = input.closest("label");
  const existingHint =
    input.nextElementSibling?.classList.contains("muted") ? input.nextElementSibling : null;

  input.autocomplete = "off";
  input.spellcheck = false;

  const shell = document.createElement("div");
  shell.className = "tag-input-shell";

  const meta = document.createElement("div");
  meta.className = "tag-input-meta";

  const hint = existingHint ?? document.createElement("span");
  hint.classList.add("muted", "tag-input-hint");
  hint.textContent = hintText;

  const counter = document.createElement("span");
  counter.className = "muted tag-input-counter";

  meta.append(hint, counter);

  const preview = document.createElement("div");
  preview.className = "tag-input-preview";
  preview.dataset.emptyText = "Tags will appear here as you type.";

  const rules = document.createElement("div");
  rules.className = "tag-input-rules";

  const countRule = buildRuleRow(`Max. ${CONTENT_TAG_MAX_ITEMS} ${noun}`);
  const lengthRule = buildRuleRow(`Max. ${CONTENT_TAG_MAX_LENGTH} characters per tag`);
  const duplicateRule = buildRuleRow("No duplicates after normalization");

  rules.append(countRule.row, lengthRule.row, duplicateRule.row);

  const feedback = document.createElement("p");
  feedback.className = "muted status-line tag-input-feedback";
  feedback.hidden = true;

  shell.append(meta, preview, rules, feedback);

  if (label) {
    label.append(shell);
  } else {
    input.insertAdjacentElement("afterend", shell);
  }

  let analysis = validateContentTags(parseContentTagsInput(input.value));

  function renderPreview(items) {
    preview.replaceChildren();

    items.forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "tag-input-chip";

      if (item.errorCodes.length > 0) {
        chip.classList.add("is-invalid");
        chip.title = resolveChipTitle(item);
      }

      const hash = document.createElement("span");
      hash.className = "tag-input-chip-hash";
      hash.textContent = "#";

      const text = document.createElement("span");
      text.className = "tag-input-chip-text";
      text.textContent = resolveChipLabel(item);

      chip.append(hash, text);
      preview.append(chip);
    });
  }

  function render() {
    analysis = validateContentTags(parseContentTagsInput(input.value));
    renderPreview(analysis.items);

    counter.textContent = analysis.tagCount > 0 ? `${analysis.tagCount} / ${CONTENT_TAG_MAX_ITEMS}` : "";
    if (analysis.tagCount > CONTENT_TAG_MAX_ITEMS) {
      counter.dataset.state = "error";
    } else if (analysis.tagCount >= CONTENT_TAG_MAX_ITEMS - 2) {
      counter.dataset.state = "warn";
    } else {
      delete counter.dataset.state;
    }

    const hasInput = analysis.tagCount > 0;
    setRuleState(countRule.dot, hasInput ? analysis.tagCount <= CONTENT_TAG_MAX_ITEMS : null);
    setRuleState(lengthRule.dot, hasInput ? analysis.tooLongTags.length === 0 : null);
    setRuleState(duplicateRule.dot, hasInput ? analysis.duplicateTags.length === 0 : null);

    const message = resolveContentTagValidationMessage(analysis, { noun });
    feedback.textContent = message;
    feedback.dataset.state = message ? "error" : "info";
    feedback.hidden = !message;
  }

  input.addEventListener("input", render);
  render();

  return {
    getValidation() {
      return analysis;
    },
    getNormalizedTags() {
      return analysis.normalizedTags;
    },
    hasErrors() {
      return analysis.hasErrors;
    },
    focus() {
      input.focus();
    },
    sync() {
      render();
    },
    setValue(value) {
      input.value = String(value ?? "");
      render();
    },
  };
}
