function adminMiddleware(req, res, next) {
  // Vérifie que l'utilisateur est authentifié ET a le rôle admin
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: "Accès refusé. Vous devez être administrateur." 
    });
  }
  
  next();
}

module.exports = adminMiddleware;