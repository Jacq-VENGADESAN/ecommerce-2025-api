// backend/src/middlewares/authMiddleware.js

const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const { isBlacklisted } = require("../utils/tokenBlacklist");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant ou invalide." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (isBlacklisted(decoded.jti)) {
      return res.status(401).json({ error: "Token révoqué." });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable." });
    }

    req.userId = user.id;
    req.user = user;
    req.tokenJti = decoded.jti;
    req.tokenExp = decoded.exp;

    next();
  } catch (error) {
    console.error("Erreur authMiddleware :", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expiré." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token invalide." });
    }

    return res.status(401).json({ error: "Erreur d'authentification." });
  }
}

module.exports = authMiddleware;
