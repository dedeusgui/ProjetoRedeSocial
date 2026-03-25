import { escapeHtml } from "../core/formatters.js";
import { resolveDestructiveActionContent } from "../core/destructive-actions.js";
import { createFlash } from "./flash.js";

function setTextContent(target, value) {
  if (!target) {
    return;
  }

  const text = String(value ?? "");
  target.textContent = text;
  target.hidden = !text;
}

export function applyDestructiveActionUi({
  actionKey,
  context = {},
  titleTarget = null,
  descriptionTarget = null,
  noteTarget = null,
  cancelButton = null,
  confirmButton = null,
  isBusy = false,
} = {}) {
  const content = resolveDestructiveActionContent(actionKey, context);

  if (titleTarget) {
    titleTarget.textContent = content.title;
  }

  setTextContent(descriptionTarget, content.description);
  setTextContent(noteTarget, content.note);

  if (cancelButton) {
    cancelButton.textContent = content.cancelLabel;
  }

  if (confirmButton) {
    confirmButton.textContent = isBusy ? content.busyLabel : content.confirmLabel;
  }

  return content;
}

export function bindManagedDialog({
  dialog,
  requestClose = null,
  canClose = () => true,
  onClosed = null,
} = {}) {
  if (!dialog) {
    return;
  }

  const closeDialog =
    typeof requestClose === "function"
      ? requestClose
      : () => {
          dialog.close();
        };

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog && canClose()) {
      closeDialog();
    }
  });

  dialog.addEventListener("cancel", (event) => {
    if (!canClose()) {
      event.preventDefault();
    }
  });

  if (typeof onClosed === "function") {
    dialog.addEventListener("close", onClosed);
  }
}

export function createDestructiveModalController({
  dialog,
  titleTarget,
  descriptionTarget,
  noteTarget,
  cancelButton,
  confirmButton,
  statusTarget,
  onConfirm,
} = {}) {
  const flash = createFlash(statusTarget);
  const state = {
    actionKey: null,
    context: null,
    isBusy: false,
    restoreFocusTarget: null,
  };

  function syncUi() {
    if (!state.actionKey) {
      return;
    }

    const content = applyDestructiveActionUi({
      actionKey: state.actionKey,
      context: state.context,
      titleTarget,
      descriptionTarget,
      noteTarget,
      cancelButton,
      confirmButton,
      isBusy: state.isBusy,
    });

    if (cancelButton) {
      cancelButton.disabled = state.isBusy;
    }

    if (confirmButton) {
      confirmButton.disabled = state.isBusy;
      confirmButton.textContent = state.isBusy ? content.busyLabel : content.confirmLabel;
    }
  }

  function reset() {
    state.actionKey = null;
    state.context = null;
    state.isBusy = false;
    state.restoreFocusTarget = null;
    flash.clear();
  }

  function close({ force = false } = {}) {
    if (!dialog?.open) {
      return;
    }

    if (!force && state.isBusy) {
      return;
    }

    dialog.close();
  }

  async function handleConfirm() {
    if (!state.actionKey || state.isBusy) {
      return;
    }

    state.isBusy = true;
    const content = resolveDestructiveActionContent(state.actionKey, state.context);
    flash.show(content.busyLabel, "info");
    syncUi();

    try {
      await onConfirm?.({
        actionKey: state.actionKey,
        context: state.context,
        close,
      });

      if (dialog?.open) {
        close({ force: true });
      }
    } catch (error) {
      const message =
        typeof state.context?.resolveErrorMessage === "function"
          ? state.context.resolveErrorMessage(error)
          : "Could not complete this action.";
      flash.show(message, "error");
      state.isBusy = false;
      syncUi();
      return;
    }

    state.isBusy = false;
    syncUi();
  }

  function open({ actionKey, context = {}, restoreFocusTo = null } = {}) {
    state.actionKey = actionKey;
    state.context = context;
    state.isBusy = false;
    state.restoreFocusTarget = restoreFocusTo;
    flash.clear();
    syncUi();

    if (!dialog?.open) {
      dialog?.showModal();
    }

    window.requestAnimationFrame(() => {
      cancelButton?.focus();
    });
  }

  cancelButton?.addEventListener("click", () => {
    close();
  });

  confirmButton?.addEventListener("click", () => {
    void handleConfirm();
  });

  bindManagedDialog({
    dialog,
    requestClose: close,
    canClose: () => !state.isBusy,
    onClosed: () => {
      const restoreFocusTarget = state.restoreFocusTarget;
      reset();

      if (restoreFocusTarget && typeof restoreFocusTarget.focus === "function") {
        window.requestAnimationFrame(() => {
          restoreFocusTarget.focus();
        });
      }
    },
  });

  return {
    close,
    getContext() {
      return state.context;
    },
    isBusy() {
      return state.isBusy;
    },
    isOpen() {
      return Boolean(dialog?.open);
    },
    open,
  };
}

export function renderInlineDestructiveConfirmation({
  actionKey,
  context = {},
  entityId = "",
  confirmDataAttribute,
  cancelDataAttribute,
  isBusy = false,
  statusMessage = "",
  statusState = "info",
} = {}) {
  if (!confirmDataAttribute || !cancelDataAttribute) {
    return "";
  }

  const content = resolveDestructiveActionContent(actionKey, context);
  const resolvedId = String(entityId ?? "");
  const supportText = content.description || content.note;
  const resolvedStatusMessage = String(statusMessage ?? "").trim();
  const hiddenAttribute = resolvedStatusMessage ? "" : " hidden";
  const stateAttribute = resolvedStatusMessage ? ` data-state="${escapeHtml(statusState)}"` : "";

  return `
    <div class="inline-destructive-confirmation" role="group" aria-label="${escapeHtml(content.title)}">
      <div class="inline-destructive-copy">
        <strong>${escapeHtml(content.title)}</strong>
        ${supportText ? `<p class="muted">${escapeHtml(supportText)}</p>` : ""}
      </div>
      <div class="review-actions review-actions-inline inline-destructive-actions">
        <button
          type="button"
          class="button-ghost button-link-inline"
          data-${escapeHtml(cancelDataAttribute)}="${escapeHtml(resolvedId)}"
          ${isBusy ? "disabled" : ""}
        >
          ${escapeHtml(content.cancelLabel)}
        </button>
        <button
          type="button"
          class="button-reject button-link-inline"
          data-${escapeHtml(confirmDataAttribute)}="${escapeHtml(resolvedId)}"
          ${isBusy ? "disabled" : ""}
        >
          ${escapeHtml(isBusy ? content.busyLabel : content.confirmLabel)}
        </button>
      </div>
      <p class="muted status-line inline-destructive-status" role="status" aria-live="polite"${hiddenAttribute}${stateAttribute}>
        ${escapeHtml(resolvedStatusMessage)}
      </p>
    </div>
  `;
}
