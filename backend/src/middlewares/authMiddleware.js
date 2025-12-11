// backend/src/middlewares/authMiddleware.js

const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Vérifier qu'on a bien un header "Authorization: Bearer xxx"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant ou invalide." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ✅ AJOUTÉ : Charger l'utilisateur complet pour avoir accès au rôle
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true // ✅ Inclure le rôle
      }
    });

    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable." });
    }

    // ✅ Ajouter l'ID ET l'objet user complet à la requête
    req.userId = user.id;
    req.user = user; // Permet d'accéder à req.user.role dans les routes
    
    next();
  } catch (error) {
    console.error("Erreur authMiddleware :", error);
    
    // ✅ Gérer les erreurs spécifiques du JWT
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expiré." });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Token invalide." });
    }
    
    return res.status(401).json({ error: "Erreur d'authentification." });
  }
}

module.exports = authMiddleware;
