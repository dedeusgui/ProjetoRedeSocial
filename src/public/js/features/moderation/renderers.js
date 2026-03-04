import { trendLabel } from "../../core/formatters.js";

export function reviewSavedMessage(result) {
  const trend = trendLabel(result?.trend ?? "neutral");
  return `Avalia\u00e7\u00e3o salva. Tend\u00eancia atual: ${trend}.`;
}
