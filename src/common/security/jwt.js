import { createHmac } from "node:crypto";
import AppError from "../errors/AppError.js";

function toBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(`${normalized}${"=".repeat(padding)}`, "base64").toString("utf8");
}

function signInput(input, secret) {
  return createHmac("sha256", secret)
    .update(input)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJWT(payload, secret, expiresInSeconds = 60 * 60 * 12) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(tokenPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signInput(signingInput, secret);

  return `${signingInput}.${signature}`;
}

function verifyJWT(token, secret) {
  if (!token || typeof token !== "string") {
    throw new AppError("Authentication token is missing.", "UNAUTHENTICATED", 401);
  }

  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    throw new AppError("Token format is invalid.", "INVALID_TOKEN", 401);
  }

  const [encodedHeader, encodedPayload, signature] = tokenParts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signInput(signingInput, secret);

  if (signature !== expectedSignature) {
    throw new AppError("Token signature is invalid.", "INVALID_TOKEN", 401);
  }

  let payload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload));
  } catch {
    throw new AppError("Token payload is invalid.", "INVALID_TOKEN", 401);
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    throw new AppError("Your session has expired. Sign in again.", "TOKEN_EXPIRED", 401);
  }

  return payload;
}

export { signJWT, verifyJWT };