function resolveCollectionDeleteDescription({ itemCount } = {}) {
  const count = Number(itemCount);

  if (!Number.isFinite(count) || count <= 0) {
    return "This collection is empty.";
  }

  if (count === 1) {
    return "This will remove this collection and its 1 post.";
  }

  return `This will remove this collection and its ${count} posts.`;
}

const DESTRUCTIVE_ACTIONS = {
  "comment.delete": {
    surface: "inline",
    title: "Delete comment?",
    description: "This comment will be permanently removed.",
    confirmLabel: "Delete",
    busyLabel: "Deleting...",
    cancelLabel: "Cancel",
  },
  "post.delete": {
    surface: "modal",
    title: "Delete post?",
    description: "This action permanently removes the post, its discussion, and related context.",
    note: "This action cannot be undone.",
    confirmLabel: "Delete post",
    busyLabel: "Deleting...",
    cancelLabel: "Cancel",
  },
  "collection.delete": {
    surface: "modal",
    title: "Delete collection?",
    description: resolveCollectionDeleteDescription,
    note: "This action cannot be undone.",
    confirmLabel: "Delete collection",
    busyLabel: "Deleting...",
    cancelLabel: "Cancel",
  },
  "account.delete": {
    surface: "modal_strict",
    title: "Delete your account?",
    description: "This action is permanent and cannot be undone.",
    confirmLabel: "Delete everything",
    busyLabel: "Deleting...",
    cancelLabel: "Cancel",
  },
  "admin.user.delete": {
    surface: "modal_strict",
    title: "Delete user?",
    description: "This action permanently removes the account and cannot be undone.",
    confirmLabel: "Delete user",
    busyLabel: "Deleting...",
    cancelLabel: "Cancel",
  },
};

function resolveFieldValue(fieldValue, context) {
  return typeof fieldValue === "function" ? fieldValue(context) : fieldValue;
}

export function resolveDestructiveActionContent(actionKey, context = {}) {
  const definition = DESTRUCTIVE_ACTIONS[actionKey];
  if (!definition) {
    throw new Error(`Unknown destructive action: ${actionKey}`);
  }

  return {
    actionKey,
    surface: definition.surface,
    title: String(resolveFieldValue(definition.title, context) ?? ""),
    description: String(resolveFieldValue(definition.description, context) ?? ""),
    note: String(resolveFieldValue(definition.note, context) ?? ""),
    confirmLabel: String(resolveFieldValue(definition.confirmLabel, context) ?? "Confirm"),
    busyLabel: String(resolveFieldValue(definition.busyLabel, context) ?? "Working..."),
    cancelLabel: String(resolveFieldValue(definition.cancelLabel, context) ?? "Cancel"),
  };
}
