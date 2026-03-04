import {
  computeValidationScore,
  escapeHtml,
  formatDateTime,
  formatSignedPercent,
  resolveTrendFromScore,
  trendClass,
  trendLabel,
} from "../../core/formatters.js";

export function renderProfileView(target, profile) {
  if (!target) {
    return;
  }

  const approvalRate = profile.privateMetrics?.approvalRate ?? 0;
  const rejectionRate = profile.privateMetrics?.rejectionRate ?? 0;
  const score = computeValidationScore(approvalRate, rejectionRate);
  const scoreTrend = resolveTrendFromScore(score);
  const scoreTrendClass = trendClass(scoreTrend);

  target.innerHTML = `
    <section class="card profile-card">
      <h2>@${escapeHtml(profile.username)}</h2>
      <p class="muted">${escapeHtml(profile.email)}</p>
      <p class="muted">Papel: ${escapeHtml(profile.role)}</p>
      <p class="muted">Criado em: ${escapeHtml(formatDateTime(profile.createdAt))}</p>
      <div class="metrics-grid">
        <article class="card metric-box">
          <h3>Score geral</h3>
          <p class="${escapeHtml(scoreTrendClass)}">${escapeHtml(formatSignedPercent(score))}</p>
          <p class="muted">F&oacute;rmula: aprova&ccedil;&atilde;o - reprova&ccedil;&atilde;o</p>
          <p class="muted">Tend&ecirc;ncia: ${escapeHtml(trendLabel(scoreTrend))}</p>
        </article>
      </div>
    </section>
  `;
}
