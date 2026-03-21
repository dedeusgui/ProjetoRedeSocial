import { escapeHtml, formatDateTime, formatPercent } from "../../core/formatters.js";

export function renderAdminUserList(target, users, { currentAdminId = null } = {}) {
  if (!target) {
    return;
  }

  if (!Array.isArray(users) || users.length === 0) {
    target.innerHTML = "<p class='muted'>No users found.</p>";
    return;
  }

  target.innerHTML = users
    .map((user) => {
      const canDelete =
        user.role === "user" &&
        String(user.id) !== String(currentAdminId ?? "");

      return `
        <article class="card managed-user-card">
          <p><strong>@${escapeHtml(user.username)}</strong> <span class="muted">(${escapeHtml(user.email)})</span></p>
          <p class="muted">Role: ${escapeHtml(user.role)}</p>
          <p class="muted">Posts: ${escapeHtml(user.postCount)} | Approval: ${escapeHtml(formatPercent(user.score ?? 0))}</p>
          <p class="muted">Reviews received: ${escapeHtml(user.totalReviews ?? 0)}</p>
          <p class="muted">Created: ${escapeHtml(formatDateTime(user.createdAt))}</p>
          ${canDelete ? `<button type="button" class="button-reject button-link-inline" data-admin-delete-user-id="${escapeHtml(user.id)}">Delete user</button>` : ""}
        </article>
      `;
    })
    .join("");
}

function formatCountLabel(count, singular, plural = `${singular}s`) {
  const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
  return `${safeCount} ${safeCount === 1 ? singular : plural}`;
}

function buildDeleteImpactLines(impact) {
  const safeImpact = impact ?? {};
  const lines = [];

  if (Number(safeImpact.postCount) > 0) {
    lines.push(`This will delete ${formatCountLabel(safeImpact.postCount, "post")}.`);
  }

  if (Number(safeImpact.collectionCount) > 0) {
    lines.push(`This will delete ${formatCountLabel(safeImpact.collectionCount, "collection")}.`);
  }

  if (Number(safeImpact.commentCount) > 0) {
    lines.push(`This will delete ${formatCountLabel(safeImpact.commentCount, "comment")}.`);
  }

  if (Number(safeImpact.reviewsReceivedCount) > 0) {
    lines.push(`This user has ${formatCountLabel(safeImpact.reviewsReceivedCount, "review")} received.`);
  }

  if (Number(safeImpact.reviewsWrittenCount) > 0) {
    lines.push(`This user has ${formatCountLabel(safeImpact.reviewsWrittenCount, "review")} written.`);
  }

  return lines;
}

export function renderAdminDeleteUserPreview(
  {
    summaryTarget,
    impactLeadTarget,
    impactListTarget,
  },
  preview,
) {
  if (summaryTarget) {
    if (!preview?.user) {
      summaryTarget.innerHTML = "";
    } else {
      summaryTarget.innerHTML = `
        <div class="danger-summary-grid">
          <p class="danger-summary-item">
            <span class="muted">Handle</span>
            <strong>@${escapeHtml(preview.user.username)}</strong>
          </p>
          <p class="danger-summary-item">
            <span class="muted">Email</span>
            <strong>${escapeHtml(preview.user.email)}</strong>
          </p>
          <p class="danger-summary-item">
            <span class="muted">Role</span>
            <strong>${escapeHtml(preview.user.role)}</strong>
          </p>
          <p class="danger-summary-item">
            <span class="muted">Created</span>
            <strong>${escapeHtml(formatDateTime(preview.user.createdAt))}</strong>
          </p>
        </div>
      `;
    }
  }

  if (impactLeadTarget) {
    impactLeadTarget.textContent =
      preview?.riskLevel === "level_2"
        ? "Deleting this user will also remove related content and account activity."
        : "";
  }

  if (impactListTarget) {
    const lines = buildDeleteImpactLines(preview?.impact);
    impactListTarget.innerHTML = lines
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("");
  }
}
