/**
 * Escapa caracteres HTML especiais para evitar XSS ao interpolar
 * valores de usuário em innerHTML.
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

export function parseCsvTags(rawValue) {
  return String(rawValue ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
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
  return Number(clampedValue.toFixed(2));
}

export function computeValidationScore(approvalRate, rejectionRate) {
  const safeApprovalRate = normalizePercentage(approvalRate);
  const safeRejectionRate = normalizePercentage(rejectionRate);
  return Number((safeApprovalRate - safeRejectionRate).toFixed(2));
}

export function resolveTrendFromScore(score) {
  const safeScore = toFiniteNumber(score, 0);

  if (safeScore === 0) return "neutral";
  if (safeScore > 0) return "positive";
  return "negative";
}

export function formatPercent(value) {
  const safeValue = normalizePercentage(value);
  return `${safeValue}%`;
}

export function formatSignedPercent(value) {
  const safeValue = toFiniteNumber(value, 0);
  const roundedValue = Number(safeValue.toFixed(2));
  const sign = roundedValue > 0 ? "+" : "";
  return `${sign}${roundedValue}%`;
}

export function trendLabel(trend) {
  if (trend === "positive") return "positiva";
  if (trend === "negative") return "negativa";
  return "neutra";
}

export function trendClass(trend) {
  if (trend === "positive") return "status-positive";
  if (trend === "negative") return "status-negative";
  return "status-neutral";
}
