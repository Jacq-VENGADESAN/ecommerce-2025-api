// backend/src/routes/reviews.js

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /reviews
 * Body :
 * {
 *   "productId": 1,
 *   "rating": 4,
 *   "comment": "Très bon produit"
 * }
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { productId, rating, comment } = req.body;

    if (!productId || !rating || !comment) {
      return res.status(400).json({
        error: "productId, rating et comment sont obligatoires.",
      });
    }

    const parsedProductId = parseInt(productId, 10);
    const parsedRating = parseInt(rating, 10);

    if (isNaN(parsedProductId) || isNaN(parsedRating)) {
      return res.status(400).json({ error: "productId et rating doivent être des nombres." });
    }

    if (parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: "rating doit être entre 1 et 5." });
    }

    // Vérifier que le produit existe
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
        comment,
      },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error("Erreur POST /reviews :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * GET /products/:id/reviews
 * Récupérer les avis d'un produit
 */
router.get("/product/:id", async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);

    if (isNaN(productId)) {
      return res.status(400).json({ error: "ID produit invalide." });
    }

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
    console.error("Erreur GET /reviews/product/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * DELETE /reviews/:id
 * Supprimer un avis (uniquement par son auteur)
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id, 10);
    const userId = req.userId;

    if (isNaN(reviewId)) {
      return res.status(400).json({ error: "ID d'avis invalide." });
    }

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

    res.json({ message: "Avis supprimé avec succès." });
  } catch (error) {
    console.error("Erreur DELETE /reviews/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
