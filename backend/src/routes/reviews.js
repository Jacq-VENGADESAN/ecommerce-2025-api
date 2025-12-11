// backend/src/routes/reviews.js

const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const prisma = require("../prisma");
const { validateId, sanitizeComment, requireNumber } = require("../utils/validation");

const router = express.Router();

/**
 * POST /reviews
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { productId, rating, comment } = req.body;

    const parsedProductId = validateId(productId);
    const parsedRating = requireNumber(parseInt(rating, 10), { min: 1, max: 5, field: "rating" });
    const safeComment = sanitizeComment(comment);

    const product = await prisma.product.findUnique({
      where: { id: parsedProductId },
    });

    if (!product) {
      return res.status(404).json({ error: "Produit introuvable." });
    }

    const review = await prisma.review.create({
      data: {
        userId,
        productId: parsedProductId,
        rating: parsedRating,
        comment: safeComment,
      },
    });

    res.status(201).json(review);
  } catch (error) {
    if (error.message?.includes("ID invalide") || error.message?.includes("doit")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Erreur POST /reviews :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * GET /products/:id/reviews
 */
router.get("/product/:id", async (req, res) => {
  try {
    const productId = validateId(req.params.id);

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(reviews);
  } catch (error) {
    if (error.message?.includes("ID invalide")) {
      return res.status(400).json({ error: "ID produit invalide." });
    }
    console.error("Erreur GET /reviews/product/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * DELETE /reviews/:id
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const reviewId = validateId(req.params.id);
    const userId = req.userId;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({ error: "Avis introuvable." });
    }

    if (review.userId !== userId) {
      return res.status(403).json({ error: "Vous ne pouvez supprimer que vos propres avis." });
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    res.json({ message: "Avis supprime avec succes." });
  } catch (error) {
    if (error.message?.includes("ID invalide")) {
      return res.status(400).json({ error: "ID d'avis invalide." });
    }
    console.error("Erreur DELETE /reviews/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
