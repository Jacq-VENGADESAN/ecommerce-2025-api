// backend/src/routes/orders.js

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /orders
 * Créer une commande pour l'utilisateur connecté
 * Body attendu :
 * {
 *   "items": [
 *     { "productId": 1, "quantity": 2 },
 *     { "productId": 3, "quantity": 1 }
 *   ]
 * }
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "Le corps de la requête doit contenir un tableau 'items' non vide." });
    }

    // Récupérer les produits concernés
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    if (products.length !== items.length) {
      return res.status(400).json({ error: "Certains produits n'existent pas." });
    }

    // Calcul du total + vérif du stock
    let total = 0;
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;

      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Stock insuffisant pour le produit ID ${product.id} (${product.name}).`,
        });
      }

      total += product.price * item.quantity;
    }

    // Création de la commande + items dans une transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          status: "pending",
          total,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: products.find((p) => p.id === item.productId)?.price ?? 0,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Mise à jour des stocks
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Création d'un "Payment" associé (status = processing)
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount: total,
        },
      });

      // Création d'une "Delivery" associée (status = preparing)
      await tx.delivery.create({
        data: {
          orderId: newOrder.id,
          status: "preparing",
        },
      });

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    console.error("Erreur POST /orders :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * GET /orders/me
 * Récupérer les commandes de l'utilisateur connecté
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        delivery: true,
        payment: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(orders);
  } catch (error) {
    console.error("Erreur GET /orders/me :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * GET /orders/:id
 * Récupérer le détail d'une commande (si elle appartient à l'utilisateur connecté)
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const id = parseInt(req.params.id, 10);

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
        delivery: true,
        payment: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Commande introuvable." });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ error: "Accès refusé à cette commande." });
    }

    res.json(order);
  } catch (error) {
    console.error("Erreur GET /orders/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
