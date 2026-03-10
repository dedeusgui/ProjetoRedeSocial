import { escapeHtml } from "../../core/formatters.js";

function resolveAvatarInitial(username) {
  const normalized = String(username ?? "").trim();
  if (!normalized) {
    return "?";
  }

  return normalized.charAt(0).toUpperCase();
}

export function renderAvatar({ avatarUrl = null, username = "", alt = "", className = "" } = {}) {
  const resolvedClassName = ["author-avatar", className].filter(Boolean).join(" ");
  const rawFallbackLabel = String(username ?? "").trim() || "usuário";
  const fallbackInitial = escapeHtml(resolveAvatarInitial(username));
  const fallbackLabel = escapeHtml(rawFallbackLabel);

  if (typeof avatarUrl === "string" && avatarUrl.trim().length > 0) {
    return `
      <img
        class="${escapeHtml(resolvedClassName)}"
        src="${escapeHtml(avatarUrl)}"
        alt="${escapeHtml(alt || `Foto de perfil de ${rawFallbackLabel}`)}"
        loading="lazy"
      />
    `;
  }

  return `
    <span class="${escapeHtml(`${resolvedClassName} author-avatar-fallback`)}" aria-label="Avatar padrão de ${fallbackLabel}">
      ${fallbackInitial}
    </span>
  `;
}

export function renderReputationBadge(reputation = null, className = "") {
  const tier = reputation?.tier ?? "low";
  const label = reputation?.label ?? "Baixa";
  const toneClass =
    tier === "high" ? "status-positive" : tier === "medium" ? "status-neutral" : "status-negative";

  return `
    <span class="reputation-badge ${escapeHtml(toneClass)} ${escapeHtml(className)}">
      Reputação ${escapeHtml(label)}
    </span>
  `;
}

export function renderAuthorSummary(
  author,
  {
    metaText = "",
    avatarClassName = "",
    className = "",
  } = {},
) {
  const username = author?.username ?? "desconhecido";

  return `
    <div class="author-summary ${escapeHtml(className)}">
      ${renderAvatar({
        avatarUrl: author?.avatarUrl ?? null,
        username,
        className: avatarClassName,
      })}
      <div class="author-copy">
        <p class="author-name">@${escapeHtml(username)}</p>
        <div class="author-meta-row">
          ${renderReputationBadge(author?.reputation)}
          ${metaText ? `<span class="muted author-meta-text">${escapeHtml(metaText)}</span>` : ""}
        </div>
      </div>
    </div>
  `;
}
