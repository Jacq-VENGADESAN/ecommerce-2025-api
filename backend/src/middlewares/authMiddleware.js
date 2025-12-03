// backend/src/middlewares/authMiddleware.js

const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Vérifier qu'on a bien un header "Authorization: Bearer xxx"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant ou invalide." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // On ajoute l'ID utilisateur à l'objet req pour l'utiliser ensuite
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error("Erreur authMiddleware :", error);
    return res.status(401).json({ error: "Token invalide ou expiré." });
  }
}

module.exports = authMiddleware;
