// backend/src/routes/orders.js

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Créer une commande
 * - Vérifie que les produits existent
 * - Vérifie le stock
 * - ✅ VALIDE LES PRIX CÔTÉ BACKEND (ne fait pas confiance au client)
 * - Calcule le total
 * - Crée Order + OrderItems
 * - Décrémente le stock
 * - Crée Payment + Delivery
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { items } = req.body;

    // Validation de base
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: "La commande doit contenir au moins un produit." 
      });
    }

    // ✅ AJOUTÉ : Validation des quantités
    for (const item of items) {
      if (!item.productId || !item.quantity) {
        return res.status(400).json({ 
          error: "Chaque item doit avoir un productId et une quantity." 
        });
      }

      if (item.quantity < 1 || item.quantity > 100) {
        return res.status(400).json({ 
          error: "La quantité doit être entre 1 et 100." 
        });
      }
    }

    const productIds = items.map((i) => i.productId);

    // Récupérer tous les produits concernés
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ 
        error: "Certains produits n'existent pas." 
      });
    }

    // ✅ CRITIQUE : Valider le stock ET les prix côté backend
    let total = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      
      if (!product) {
        return res.status(400).json({ 
          error: `Produit ${item.productId} introuvable.` 
        });
      }

      // Vérifier le stock
      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Stock insuffisant pour le produit "${product.name}". ` +
                 `Disponible : ${product.stock}, demandé : ${item.quantity}`,
        });
      }

      // ✅ SÉCURITÉ : Utiliser TOUJOURS le prix de la base de données
      // Ne JAMAIS faire confiance au prix envoyé par le client
      const itemTotal = product.price * item.quantity;
      total += itemTotal;

      validatedItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price, // ✅ Prix validé depuis la base
      });
    }

    // Transaction : créer la commande + items + paiement + livraison + décrémenter le stock
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: req.userId,
          status: "pending",
          total, // ✅ Total calculé côté serveur
          items: {
            create: validatedItems, // ✅ Données validées
          },
        },
      });

      // Décrémenter le stock de chaque produit
      for (const item of validatedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Créer le paiement (simulé)
      await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          amount: total, // ✅ Montant validé
          status: "processing",
        },
      });

      // Créer la livraison (simulée)
      await tx.delivery.create({
        data: {
          orderId: createdOrder.id,
          status: "preparing",
        },
      });

      // Renvoyer la commande complète
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
    
    // ✅ AJOUTÉ : Gestion d'erreur plus granulaire
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        error: "Ressource non trouvée lors de la transaction." 
      });
    }
    
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * Récupérer les commandes de l'utilisateur connecté
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
 * Annuler une commande (et recréditer le stock)
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

    // ✅ SÉCURITÉ : Vérifier que l'utilisateur est propriétaire de la commande
    if (order.userId !== req.userId) {
      return res.status(403).json({ error: "Accès non autorisé." });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ error: "Commande déjà annulée." });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        error: "Seules les commandes en attente peuvent être annulées.",
      });
    }

    // Transaction : remettre le stock + changer les statuts
    const updated = await prisma.$transaction(async (tx) => {
      // Réincrémenter le stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      // Mettre à jour la commande
      const cancelledOrder = await tx.order.update({
        where: { id },
        data: { status: "cancelled" },
        include: { items: true, payment: true, delivery: true },
      });

      // Mettre à jour le paiement (simulé)
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: "cancelled" },
        });
      }

      // Mettre à jour la livraison (simulée)
      if (order.delivery) {
        await tx.delivery.update({
          where: { id: order.delivery.id },
          data: { status: "cancelled" },
        });
      }

      return cancelledOrder;
    });

    res.json(updated);
  } catch (error) {
    console.error("Erreur PATCH /orders/:id/cancel :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;