/**
 * Escapes special HTML characters to avoid XSS when interpolating
 * user-provided values in innerHTML.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

function toFiniteNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return numberValue;
}

export function normalizePercentage(value) {
  const safeValue = toFiniteNumber(value, 0);
  const clampedValue = Math.max(0, Math.min(100, safeValue));
  return Math.round(clampedValue);
}

export function formatPercent(value) {
  const safeValue = normalizePercentage(value);
  return `${safeValue}%`;
}

export function trendLabel(trend) {
  if (trend === "positive") return "positive";
  if (trend === "negative") return "negative";
  return "neutral";
}

export function trendClass(trend) {
  if (trend === "positive") return "status-positive";
  if (trend === "negative") return "status-negative";
  return "status-neutral";
}

export function reputationTierClass(tier) {
  if (tier === "high") return "status-positive";
  if (tier === "medium") return "status-neutral";
  return "status-negative";
}

export function approvalClass(value) {
  const safeValue = normalizePercentage(value);
  if (safeValue >= 70) return "status-positive";
  if (safeValue >= 40) return "status-neutral";
  return "status-negative";
}


