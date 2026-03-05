import {
  escapeHtml,
  formatDateTime,
  formatPercent,
} from "../../core/formatters.js";

export function renderProfileView(target, profile) {
  if (!target) {
    return;
  }

  const approvalRate = profile.privateMetrics?.approvalRate ?? 0;
  const rejectionRate = profile.privateMetrics?.rejectionRate ?? 0;
  const approvedCount = profile.privateMetrics?.approvedCount ?? 0;
  const notRelevantCount = profile.privateMetrics?.notRelevantCount ?? 0;
  const totalReviews = profile.privateMetrics?.totalReviews ?? 0;

  target.innerHTML = `
    <section class="card profile-card">
      <h2>@${escapeHtml(profile.username)}</h2>
      <p class="muted">${escapeHtml(profile.email)}</p>
      <p class="muted">Papel: ${escapeHtml(profile.role)}</p>
      <p class="muted">Criado em: ${escapeHtml(formatDateTime(profile.createdAt))}</p>
      <div class="metrics-grid">
        <article class="card metric-box">
          <h3>Estat&iacute;stica de aprova&ccedil;&atilde;o</h3>
          <p><strong>M&eacute;dia de aprova&ccedil;&atilde;o dos seus posts: ${escapeHtml(formatPercent(approvalRate))}</strong></p>
          <p class="muted">M&eacute;dia de n&atilde;o relevante: ${escapeHtml(formatPercent(rejectionRate))}</p>
          <p class="muted">Avalia&ccedil;&otilde;es recebidas: ${escapeHtml(totalReviews)} (aprovar: ${escapeHtml(approvedCount)} | n&atilde;o relevante: ${escapeHtml(notRelevantCount)})</p>
        </article>
      </div>
    </section>
  `;
}
