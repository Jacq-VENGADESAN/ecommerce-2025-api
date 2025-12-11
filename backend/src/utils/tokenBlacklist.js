// Blacklist en mémoire basée sur jti avec expiration
const blacklist = new Map();

function addToBlacklist(jti, expSeconds) {
  if (!jti || !expSeconds) return;
  const expiresAtMs = expSeconds * 1000;
  blacklist.set(jti, expiresAtMs);
}

function isBlacklisted(jti) {
  if (!jti) return false;
  const expiresAt = blacklist.get(jti);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    blacklist.delete(jti);
    return false;
  }
  return true;
}

// Nettoyage périodique
setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of blacklist.entries()) {
    if (now > exp) blacklist.delete(jti);
  }
}, 60 * 1000).unref();

module.exports = { addToBlacklist, isBlacklisted };
