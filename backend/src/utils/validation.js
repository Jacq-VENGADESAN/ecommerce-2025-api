const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateId(value) {
  const id = parseInt(value, 10);
  if (isNaN(id) || id < 1 || id > Number.MAX_SAFE_INTEGER) {
    throw new Error("ID invalide");
  }
  return id;
}

function requireString(value, min, max, field) {
  if (typeof value !== "string") throw new Error(`${field} doit être une chaîne`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new Error(`${field} doit contenir entre ${min} et ${max} caractères`);
  }
  return trimmed;
}

function requireEmail(email) {
  const trimmed = requireString(email, 5, 150, "email");
  if (!EMAIL_REGEX.test(trimmed)) {
    throw new Error("Email invalide");
  }
  return trimmed.toLowerCase();
}

function requirePassword(password, min = 8) {
  if (typeof password !== "string" || password.length < min) {
    throw new Error(`Le mot de passe doit contenir au moins ${min} caractères`);
  }
  return password;
}

function requireNumber(value, { min, max, field }) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${field} doit être un nombre`);
  }
  if (min !== undefined && value < min) {
    throw new Error(`${field} doit être >= ${min}`);
  }
  if (max !== undefined && value > max) {
    throw new Error(`${field} doit être <= ${max}`);
  }
  return value;
}

function sanitizeComment(comment) {
  const value = requireString(comment, 3, 500, "comment");
  // Échappement simple pour réduire le risque de XSS en affichage brut
  return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

module.exports = {
  validateId,
  requireString,
  requireEmail,
  requirePassword,
  requireNumber,
  sanitizeComment,
};
