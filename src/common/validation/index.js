import mongoose from "mongoose";
import AppError from "../errors/AppError.js";

const FIELD_LABELS = Object.freeze({
  action: "ação",
  commentId: "comentário",
  content: "conteúdo",
  decision: "decisão",
  email: "e-mail",
  id: "identificador",
  password: "senha",
  postId: "post",
  requesterId: "solicitante",
  reviewerId: "avaliador",
  tag: "tag",
  title: "título",
  userId: "usuário",
  username: "nome de usuário",
});

function resolveFieldLabel(field) {
  return FIELD_LABELS[field] ?? field;
}

function requireFields(payload, fields) {
  const source = payload ?? {};
  const missing = fields.filter((field) => {
    const value = source[field];
    if (value === undefined || value === null) {
      return true;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      return true;
    }

    return false;
  });

  if (missing.length > 0) {
    const missingLabels = missing.map((field) => resolveFieldLabel(field));
    throw new AppError(
      `Preencha os campos obrigatórios: ${missingLabels.join(", ")}.`,
      "VALIDATION_ERROR",
      400,
      { missing, missingLabels },
    );
  }
}

function ensureObjectId(id, fieldName = "id") {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(
      `O identificador informado para ${resolveFieldLabel(fieldName)} é inválido.`,
      "VALIDATION_ERROR",
      400,
      { field: fieldName },
    );
  }
}

function parseLimit(value, fallback = 20, max = 50) {
  const parsed = Number.parseInt(value ?? fallback, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

export { requireFields, ensureObjectId, parseLimit };
