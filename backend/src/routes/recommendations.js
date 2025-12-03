const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Recommandations produits
 * - Si user connecté → produits qu'il commande le plus
 * - Sinon → produits les plus achetés globalement
 */
router.get("/", async (req, res) => {
  try {
    let userId = null;

    // Vérifier si un token est présent dans Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer")) {
      try {
        userId = await new Promise((resolve) => {
          authMiddleware(
            { headers: { authorization: authHeader } },
            {
              status: () => ({ json: () => resolve(null) }),
              json: () => resolve(null),
            },
            () => resolve(arguments[2].userId)
          );
        });
      } catch (err) {
        userId = null;
      }
    }

    // CAS 1 : utilisateur connecté → recommandation personnalisée
    if (userId) {
      const products = await prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        where: { order: { userId } },
        orderBy: {
          _sum: { quantity: "desc" },
        },
        take: 5,
      });

      if (products.length === 0) {
        return res.redirect("/recommendations/popular");
      }

      const ids = products.map((p) => p.productId);

      const recommended = await prisma.product.findMany({
        where: { id: { in: ids } },
      });

      return res.json({
        mode: "historique utilisateur",
        products: recommended,
      });
    }

    // CAS 2 : visiteur → produits populaires
    const popular = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: {
        _sum: { quantity: "desc" },
      },
      take: 5,
    });

    const ids = popular.map((p) => p.productId);

    const recommended = await prisma.product.findMany({
      where: { id: { in: ids } },
    });

    res.json({
      mode: "produits les plus populaires",
      products: recommended,
    });
  } catch (error) {
    console.error("Erreur /recommendations :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// route fallback /popular
router.get("/popular", async (req, res) => {
  const popular = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    orderBy: {
      _sum: { quantity: "desc" },
    },
    take: 5,
  });

  const ids = popular.map((p) => p.productId);

  const recommended = await prisma.product.findMany({
    where: { id: { in: ids } },
  });

  res.json({
    mode: "produits les plus populaires",
    products: recommended,
  });
});

module.exports = router;
