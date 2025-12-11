// backend/src/routes/orders.js
/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Gestion des commandes, paiements, livraisons
 */
const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const prisma = require("../prisma");

const router = express.Router();

const ORDER_STATUSES = ["pending", "paid", "preparing", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["processing", "paid", "failed", "cancelled", "refunded"];
const DELIVERY_STATUSES = ["preparing", "shipped", "delivered", "cancelled"];

function validateDeliveryPayload(delivery = {}) {
  const method = delivery.method || "delivery";
  if (!["delivery", "pickup"].includes(method)) {
    return { error: "delivery.method doit valoir 'delivery' ou 'pickup'." };
  }
  if (method === "delivery" && !delivery.address) {
    return { error: "delivery.address est requis pour une livraison." };
  }
  if (method === "pickup" && !delivery.pickupPoint) {
    return { error: "delivery.pickupPoint est requis pour un retrait." };
  }
  return { method, address: delivery.address || delivery.pickupPoint || null };
}

/**
 * Créer une commande complète
 * - Vérifie existence produits + stock
 * - Valide prix côté serveur
 * - Crée Order + OrderItems + Payment + Delivery
 * - Décrémente le stock
 */
/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Créer une commande avec paiement et livraison
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *               delivery:
 *                 type: object
 *                 properties:
 *                   method:
 *                     type: string
 *                     enum: [delivery, pickup]
 *                   address:
 *                     type: string
 *                   pickupPoint:
 *                     type: string
 *     responses:
 *       201:
 *         description: Commande créée
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { items, delivery } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "La commande doit contenir au moins un produit." });
    }

    for (const item of items) {
      if (!item.productId || !item.quantity) {
        return res
          .status(400)
          .json({ error: "Chaque item doit avoir un productId et une quantity." });
      }
      if (item.quantity < 1 || item.quantity > 100) {
        return res.status(400).json({ error: "La quantité doit être entre 1 et 100." });
      }
    }

    const deliveryCheck = validateDeliveryPayload(delivery);
    if (deliveryCheck.error) {
      return res.status(400).json({ error: deliveryCheck.error });
    }

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: "Certains produits n'existent pas." });
    }

    let total = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return res.status(400).json({ error: `Produit ${item.productId} introuvable.` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Stock insuffisant pour "${product.name}". Disponible : ${product.stock}, demandé : ${item.quantity}`,
        });
      }
      const itemTotal = product.price * item.quantity;
      total += itemTotal;
      validatedItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: req.userId,
          status: "pending",
          total,
          items: { create: validatedItems },
        },
      });

      for (const item of validatedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.payment.create({
        data: { orderId: createdOrder.id, amount: total, status: "processing" },
      });

      await tx.delivery.create({
        data: {
          orderId: createdOrder.id,
          status: "preparing",
          address: deliveryCheck.address,
          method: deliveryCheck.method,
        },
      });

      return tx.order.findUnique({
        where: { id: createdOrder.id },
        include: {
          items: { include: { product: true } },
          payment: true,
          delivery: true,
        },
      });
    });

    res.status(201).json(order);
  } catch (error) {
    console.error("Erreur POST /orders :", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Ressource non trouvée lors de la transaction." });
    }
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * Récupérer les commandes de l'utilisateur connecté
 */
/**
 * @swagger
 * /orders/me:
 *   get:
 *     summary: Historique des commandes de l'utilisateur connecté
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des commandes
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.userId },
      include: {
        items: { include: { product: true } },
        payment: true,
        delivery: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (error) {
    console.error("Erreur GET /orders/me :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * Détail d'une commande (propriétaire ou admin)
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID invalide." });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        payment: true,
        delivery: true,
        user: { select: { id: true, email: true, role: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Commande introuvable." });
    }

    if (order.userId !== req.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Accès non autorisé." });
    }

    res.json(order);
  } catch (error) {
    console.error("Erreur GET /orders/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * Listing des commandes (admin)
 */
router.get("/", authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true, payment: true, delivery: true, user: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (error) {
    console.error("Erreur GET /orders :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * Annuler une commande (user propriétaire)
 */
router.patch("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID invalide." });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payment: true, delivery: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Commande introuvable." });
    }
    if (order.userId !== req.userId) {
      return res.status(403).json({ error: "Accès non autorisé." });
    }
    if (order.status === "cancelled") {
      return res.status(400).json({ error: "Commande déjà annulée." });
    }
    if (!["pending", "preparing"].includes(order.status)) {
      return res.status(400).json({ error: "Seules les commandes en attente/préparation peuvent être annulées." });
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      const cancelledOrder = await tx.order.update({
        where: { id },
        data: { status: "cancelled" },
        include: { items: true, payment: true, delivery: true },
      });

      if (order.payment) {
        await tx.payment.update({ where: { id: order.payment.id }, data: { status: "cancelled" } });
      }
      if (order.delivery) {
        await tx.delivery.update({ where: { id: order.delivery.id }, data: { status: "cancelled" } });
      }

      return cancelledOrder;
    });

    res.json(updated);
  } catch (error) {
    console.error("Erreur PATCH /orders/:id/cancel :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * Mise à jour des statuts commande/paiement/livraison (admin)
 */
router.patch("/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { orderStatus, paymentStatus, deliveryStatus, estimatedAt } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: "ID invalide." });
    }

    const dataOrder = {};
    if (orderStatus) {
      if (!ORDER_STATUSES.includes(orderStatus)) {
        return res.status(400).json({ error: `orderStatus doit être dans ${ORDER_STATUSES.join(", ")}` });
      }
      dataOrder.status = orderStatus;
    }

    const paymentData = {};
    if (paymentStatus) {
      if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        return res
          .status(400)
          .json({ error: `paymentStatus doit être dans ${PAYMENT_STATUSES.join(", ")}` });
      }
      paymentData.status = paymentStatus;
    }

    const deliveryData = {};
    if (deliveryStatus) {
      if (!DELIVERY_STATUSES.includes(deliveryStatus)) {
        return res
          .status(400)
          .json({ error: `deliveryStatus doit être dans ${DELIVERY_STATUSES.join(", ")}` });
      }
      deliveryData.status = deliveryStatus;
    }
    if (estimatedAt) {
      const estimatedDate = new Date(estimatedAt);
      if (isNaN(estimatedDate.getTime())) {
        return res.status(400).json({ error: "estimatedAt doit être une date valide." });
      }
      deliveryData.estimatedAt = estimatedDate;
    }

    if (!Object.keys(dataOrder).length && !Object.keys(paymentData).length && !Object.keys(deliveryData).length) {
      return res.status(400).json({ error: "Aucune mise à jour fournie." });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({
        where: { id },
        include: { payment: true, delivery: true, items: { include: { product: true } } },
      });
      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: dataOrder,
        include: { items: true, payment: true, delivery: true },
      });

      if (existing.payment && Object.keys(paymentData).length) {
        await tx.payment.update({ where: { id: existing.payment.id }, data: paymentData });
      }
      if (existing.delivery && Object.keys(deliveryData).length) {
        await tx.delivery.update({ where: { id: existing.delivery.id }, data: deliveryData });
      }

      return updatedOrder;
    });

    res.json(updated);
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Commande introuvable." });
    }
    console.error("Erreur PATCH /orders/:id/status :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
