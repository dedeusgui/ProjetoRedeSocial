function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function parseAdminEmails(rawAdminEmails) {
  return String(rawAdminEmails ?? "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

function buildAdminEmailSet(adminEmails = []) {
  return new Set(
    adminEmails
      .map((email) => normalizeEmail(email))
      .filter(Boolean),
  );
}

function isAdminEmail(email, adminEmailSet) {
  return adminEmailSet.has(normalizeEmail(email));
}

export { normalizeEmail, parseAdminEmails, buildAdminEmailSet, isAdminEmail };
