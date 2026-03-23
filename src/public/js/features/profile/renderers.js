import {
  approvalClass,
  escapeHtml,
  formatDateTime,
  formatPercent,
} from "../../core/formatters.js";
import { renderAvatar, renderReputationBadge } from "../authors/renderers.js";

export function renderProfileView(
  target,
  profile,
  { isAvatarBusy = false, isAvatarMenuOpen = false } = {},
) {
  if (!target) {
    return;
  }

  const approvalPercentage = Number(profile.privateMetrics?.score ?? 0);
  const totalReviews = profile.privateMetrics?.totalReviews ?? 0;
  const avatarActionLabel = profile.avatarUrl ? "Edit profile photo" : "Add profile photo";
  const approvalToneClass = approvalClass(approvalPercentage);

  target.innerHTML = `
    <section class="card profile-card">
      <div class="profile-topline">
        <p class="profile-privacy-badge">Private profile</p>
      </div>

      <div class="profile-main">
        <div class="profile-hero">
          <div class="profile-avatar-shell">
            <div class="profile-avatar-stack" data-avatar-menu-root>
              ${renderAvatar({
                avatarUrl: profile.avatarUrl,
                username: profile.username,
                alt: `Profile image for @${profile.username}`,
                className: "profile-avatar-image",
              })}
              <input
                class="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                data-avatar-input
                tabindex="-1"
                ${isAvatarBusy ? "disabled" : ""}
              />
              <button
                type="button"
                class="profile-avatar-action"
                data-avatar-menu-toggle
                aria-label="${escapeHtml(avatarActionLabel)}"
                aria-haspopup="true"
                aria-expanded="${isAvatarMenuOpen ? "true" : "false"}"
                aria-controls="profile-avatar-menu"
                ${isAvatarBusy ? "disabled" : ""}
              >
                <svg
                  class="profile-avatar-action-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M4 8.5h3.2l1.5-2h6.6l1.5 2H20a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10.5a2 2 0 0 1 2-2Z" />
                  <circle cx="12" cy="13.25" r="3.25" />
                </svg>
              </button>
              <div
                class="profile-avatar-menu"
                id="profile-avatar-menu"
                role="group"
                data-avatar-menu
                aria-label="Profile image actions"
                ${isAvatarMenuOpen ? "" : "hidden"}
              >
                <button
                  type="button"
                  class="profile-avatar-menu-item"
                  data-upload-avatar
                  ${isAvatarBusy ? "disabled" : ""}
                >
                  Upload photo
                </button>
                <button
                  type="button"
                  class="profile-avatar-menu-item"
                  data-remove-avatar
                  ${!profile.avatarUrl || isAvatarBusy ? "disabled" : ""}
                >
                  Remove photo
                </button>
              </div>
            </div>
          </div>
          <div class="profile-identity">
            <div class="profile-heading">
              <h2 class="profile-username">@${escapeHtml(profile.username)}</h2>
              ${renderReputationBadge(profile.publicReputation, "reputation-badge-large")}
            </div>
            <div class="profile-meta-grid">
              <p class="profile-meta-item"><span class="muted">Email</span><strong>${escapeHtml(profile.email)}</strong></p>
              <p class="profile-meta-item"><span class="muted">Role</span><strong>${escapeHtml(profile.role)}</strong></p>
              <p class="profile-meta-item"><span class="muted">Created</span><strong>${escapeHtml(formatDateTime(profile.createdAt))}</strong></p>
            </div>
          </div>
        </div>

        <div class="metrics-grid">
          <article class="card metric-box">
            <p class="metric-box-value"><strong>Approval: <span class="${escapeHtml(approvalToneClass)}">${escapeHtml(formatPercent(approvalPercentage))}</span></strong></p>
            <p class="muted">Reviews received: ${escapeHtml(totalReviews)}</p>
          </article>
        </div>
      </div>
    </section>
  `;
}
