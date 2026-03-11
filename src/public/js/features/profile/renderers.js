import {
  escapeHtml,
  formatDateTime,
  formatPercent,
} from "../../core/formatters.js";
import { renderAvatar, renderReputationBadge } from "../authors/renderers.js";

export function renderProfileView(
  target,
  profile,
  { isAvatarBusy = false, avatarFileLabel = "Nenhum arquivo selecionado." } = {},
) {
  if (!target) {
    return;
  }

  const approvalPercentage = Number(profile.privateMetrics?.score ?? 0);
  const totalReviews = profile.privateMetrics?.totalReviews ?? 0;

  target.innerHTML = `
    <section class="card profile-card">
      <div class="profile-topline">
        <p class="profile-privacy-badge">Perfil privado</p>
        <p class="muted profile-privacy-copy">Somente foto, nome e reputação são públicos.</p>
      </div>

      <div class="profile-layout">
        <div class="profile-main">
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
                <h2 class="profile-username">@${escapeHtml(profile.username)}</h2>
                ${renderReputationBadge(profile.publicReputation, "reputation-badge-large")}
              </div>
              <div class="profile-meta-grid">
                <p class="profile-meta-item"><span class="muted">Email</span><strong>${escapeHtml(profile.email)}</strong></p>
                <p class="profile-meta-item"><span class="muted">Papel</span><strong>${escapeHtml(profile.role)}</strong></p>
                <p class="profile-meta-item"><span class="muted">Criado em</span><strong>${escapeHtml(formatDateTime(profile.createdAt))}</strong></p>
              </div>
            </div>
          </div>

          <div class="metrics-grid">
            <article class="card metric-box">
              <h3 class="ink-underline">Avaliação geral</h3>
              <p><strong>Aprovação: <span class="status-neutral">${escapeHtml(formatPercent(approvalPercentage))}</span></strong></p>
              <p class="muted">Avaliações recebidas: ${escapeHtml(totalReviews)}</p>
            </article>
          </div>
        </div>

        <aside class="card profile-avatar-panel">
          <h3 class="ink-underline">Foto de perfil</h3>
          <p class="muted">Atualize sua imagem para identificação pública no feed e nos comentários.</p>
          <label class="profile-avatar-field file-picker" aria-label="Atualizar foto de perfil">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              data-avatar-input
              ${isAvatarBusy ? "disabled" : ""}
            />
            <span class="file-picker-ui">
              <span class="file-picker-trigger">Selecionar arquivo</span>
              <span class="file-picker-summary" data-avatar-file-summary>${escapeHtml(avatarFileLabel)}</span>
            </span>
          </label>
          <p class="muted">JPG, PNG ou WebP, até 5 MB.</p>
          ${
            profile.avatarUrl
              ? `
                <button type="button" class="button-ghost" data-remove-avatar ${isAvatarBusy ? "disabled" : ""}>
                  Remover foto
                </button>
              `
              : ""
          }
        </aside>
      </div>
    </section>
  `;
}
