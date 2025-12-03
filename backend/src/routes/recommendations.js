// backend/src/routes/recommendations.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

const ELECTRONICS_FAMILY = [
  "Électronique",
  "Smartphones",
  "Informatique",
  "Gaming",
  "Wearables",
  "High-Tech"
];

/**
 * Nouvelle logique PROPRE :
 *
 * 1) On récupère les produits achetés par l'utilisateur
 * 2) On extrait les catégories des produits achetés
 * 3) Si l'utilisateur a acheté du high-tech → on recommande d'autres high-tech
 * 4) On EXCLUT TOUJOURS tous les produits déjà achetés
 * 5) On ajoute un bloc "topRated" basés sur les avis
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // 1. Récupérer achats
    const orderItems = await prisma.orderItem.findMany({
      where: { order: { userId } },
      include: { product: true },
    });

    const boughtIds = [...new Set(orderItems.map((i) => i.productId))];
    const boughtCategories = [...new Set(orderItems.map((i) => i.product.category))];

    let recommended = [];
    let mode = "inconnu";

    // Aucun historique
    if (boughtIds.length === 0) {
      mode = "populaire (aucun historique)";
      const popular = await prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 8,
      });

      const ids = popular.map((p) => p.productId);
      recommended = await prisma.product.findMany({
        where: { id: { in: ids } }
      });

      return res.json({ mode, products: recommended, topRated: [] });
    }

    // 2. Détecter si l'utilisateur est "high tech"
    const isHighTech = boughtCategories.some((cat) =>
      ELECTRONICS_FAMILY.includes(cat)
    );

    if (isHighTech) {
      mode = "famille électronique";

      recommended = await prisma.product.findMany({
        where: {
          category: { in: ELECTRONICS_FAMILY },
          id: { notIn: boughtIds }
        },
        take: 8,
      });
    } else {
      mode = "mêmes catégories achetées";

      recommended = await prisma.product.findMany({
        where: {
          category: { in: boughtCategories },
          id: { notIn: boughtIds }
        },
        take: 8,
      });
    }

    // 3. Fallback si aucune reco
    if (recommended.length === 0) {
      const popular = await prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 15,
      });

      const ids = popular
        .map((p) => p.productId)
        .filter((id) => !boughtIds.includes(id));

      recommended = await prisma.product.findMany({
        where: { id: { in: ids } },
        take: 8,
      });

      mode += " + fallback populaire";
    }

    // 4. Produits les mieux notés (très simplifié pour éviter bug)
    const reviews = await prisma.review.findMany({
      include: { product: true },
    });

    const avgByProduct = {};

    reviews.forEach((r) => {
      if (!avgByProduct[r.productId]) {
        avgByProduct[r.productId] = { total: 0, count: 0, product: r.product };
      }
      avgByProduct[r.productId].total += r.rating;
      avgByProduct[r.productId].count += 1;
    });

    const topRated = Object.values(avgByProduct)
      .map((entry) => ({
        product: entry.product,
        rating: entry.total / entry.count,
        count: entry.count,
      }))
      .filter((e) => e.rating >= 4) // 4 étoiles minimum
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .map((e) => e.product);

    return res.json({
      mode,
      products: recommended,
      topRated,
    });

  } catch (error) {
    console.error("Erreur /recommendations :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;