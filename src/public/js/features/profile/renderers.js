import {
  escapeHtml,
  formatDateTime,
  formatPercent,
} from "../../core/formatters.js";
import { renderAvatar, renderReputationBadge } from "../authors/renderers.js";

export function renderProfileView(target, profile, { isAvatarBusy = false } = {}) {
  if (!target) {
    return;
  }

  const approvalPercentage = Number(profile.privateMetrics?.score ?? 0);
  const totalReviews = profile.privateMetrics?.totalReviews ?? 0;

  target.innerHTML = `
    <section class="card profile-card">
      <div class="profile-hero">
        <div class="profile-avatar-shell">
          ${renderAvatar({
            avatarUrl: profile.avatarUrl,
            username: profile.username,
            alt: `Foto de perfil de @${profile.username}`,
            className: "profile-avatar-image",
          })}
        </div>
        <div class="profile-identity">
          <div class="profile-heading">
            <p class="profile-handle">Perfil privado</p>
            <h2 class="profile-username">@${escapeHtml(profile.username)}</h2>
          </div>
          <div class="author-meta-row">
            ${renderReputationBadge(profile.publicReputation, "reputation-badge-large")}
            <span class="muted">${escapeHtml(profile.email)}</span>
          </div>
          <p class="muted">Papel: ${escapeHtml(profile.role)}</p>
          <p class="muted">Criado em: ${escapeHtml(formatDateTime(profile.createdAt))}</p>
          <p class="muted">
            Outros usuários veem apenas sua foto, nome e reputação pública. Seu perfil completo continua privado.
          </p>
          <label class="profile-avatar-field" aria-label="Atualizar foto de perfil">
            <span class="muted">Atualizar foto de perfil</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              data-avatar-input
              ${isAvatarBusy ? "disabled" : ""}
            />
          </label>
          <div class="row profile-avatar-actions">
            <span class="muted">JPG, PNG ou WebP, com no máximo 5 MB.</span>
            ${
              profile.avatarUrl
                ? `
                  <button type="button" class="button-ghost" data-remove-avatar ${isAvatarBusy ? "disabled" : ""}>
                    Remover foto
                  </button>
                `
                : ""
            }
          </div>
        </div>
      </div>
      <div class="metrics-grid">
        <article class="card metric-box">
          <h3>Avaliação geral</h3>
          <p><strong>Aprovação: <span class="status-neutral">${escapeHtml(formatPercent(approvalPercentage))}</span></strong></p>
          <p class="muted">Avaliações recebidas: ${escapeHtml(totalReviews)}</p>
        </article>
      </div>
    </section>
  `;
}
