// backend/src/routes/recommendations.js
/**
 * @swagger
 * tags:
 *   name: Recommendations
 *   description: Recommandations produits (historique + géolocalisation)
 */
const express = require("express");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const prisma = require("../prisma");

const router = express.Router();

const ELECTRONICS_FAMILY = [
  "Électronique",
  "Smartphones",
  "Informatique",
  "Gaming",
  "Wearables",
  "High-Tech",
];

async function decodeOptionalUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (_err) {
    return null;
  }
}

async function fetchNearbyPickup(lat, lon) {
  if (!lat || !lon) return [];
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (isNaN(latNum) || isNaN(lonNum)) return [];

  const url = "https://nominatim.openstreetmap.org/search";
  const response = await axios.get(url, {
    params: {
      q: "post office",
      format: "json",
      addressdetails: 1,
      limit: 5,
      bounded: 1,
      viewbox: `${lonNum - 0.02},${latNum + 0.02},${lonNum + 0.02},${latNum - 0.02}`,
    },
    timeout: 5000,
    headers: { "User-Agent": "ecommerce-2025-student-project" },
  });
  return response.data;
}

/**
 * @swagger
 * /recommendations:
 *   get:
 *     summary: Recommandations produits (auth facultatif)
 *     tags: [Recommendations]
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude pour suggestions de points de retrait
 *       - in: query
 *         name: lon
 *         schema:
 *           type: number
 *         description: Longitude pour suggestions de points de retrait
 *     responses:
 *       200:
 *         description: Liste de recommandations
 */
router.get("/", async (req, res) => {
  try {
    const userId = await decodeOptionalUser(req);
    const { lat, lon } = req.query;

    // Fallback populaire (non connecté)
    if (!userId) {
      const popular = await prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 8,
      });
      const ids = popular.map((p) => p.productId);
      const products = await prisma.product.findMany({ where: { id: { in: ids } } });
      const pickupPoints = await fetchNearbyPickup(lat, lon);
      return res.json({ mode: "populaire (non connecté)", products, pickupPoints, topRated: [] });
    }

    const orderItems = await prisma.orderItem.findMany({
      where: { order: { userId } },
      include: { product: true },
    });

    const boughtIds = [...new Set(orderItems.map((i) => i.productId))];
    const boughtCategories = [...new Set(orderItems.map((i) => i.product.category))];

    let recommended = [];
    let mode = "inconnu";

    if (boughtIds.length === 0) {
      mode = "populaire (aucun historique)";
      const popular = await prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 8,
      });
      const ids = popular.map((p) => p.productId);
      recommended = await prisma.product.findMany({ where: { id: { in: ids } } });
      const pickupPoints = await fetchNearbyPickup(lat, lon);
      return res.json({ mode, products: recommended, topRated: [], pickupPoints });
    }

    const isHighTech = boughtCategories.some((cat) => ELECTRONICS_FAMILY.includes(cat));

    if (isHighTech) {
      mode = "famille électronique";
      recommended = await prisma.product.findMany({
        where: { category: { in: ELECTRONICS_FAMILY }, id: { notIn: boughtIds } },
        take: 8,
      });
    } else {
      mode = "mêmes catégories achetées";
      recommended = await prisma.product.findMany({
        where: { category: { in: boughtCategories }, id: { notIn: boughtIds } },
        take: 8,
      });
    }

    if (recommended.length === 0) {
      const popular = await prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 15,
      });
      const ids = popular.map((p) => p.productId).filter((id) => !boughtIds.includes(id));
      recommended = await prisma.product.findMany({ where: { id: { in: ids } }, take: 8 });
      mode += " + fallback populaire";
    }

    const reviews = await prisma.review.findMany({ include: { product: true } });
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
      .filter((e) => e.rating >= 4)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .map((e) => e.product);

    const pickupPoints = await fetchNearbyPickup(lat, lon);

    return res.json({
      mode,
      products: recommended,
      topRated,
      pickupPoints,
    });
  } catch (error) {
    console.error("Erreur /recommendations :", error?.response?.data || error.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
