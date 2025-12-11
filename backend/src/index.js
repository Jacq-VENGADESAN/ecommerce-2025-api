// backend/src/index.js
const bcrypt = require("bcryptjs");
const setupSwagger = require("./swagger");
const recommendationsRouter = require("./routes/recommendations");
const geoRouter = require("./routes/geo");
const reviewsRouter = require("./routes/reviews");
const authRouter = require("./routes/auth");
const authMiddleware = require("./middlewares/authMiddleware");
const adminMiddleware = require("./middlewares/adminMiddleware"); // ✅ AJOUTÉ
const ordersRouter = require("./routes/orders");

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const rateLimit = require("express-rate-limit"); // ✅ AJOUTÉ

const app = express();
const prisma = new PrismaClient();

// ====================================
// ✅ AJOUTÉ : Configuration CORS sécurisée
// ====================================
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      // Ajouter votre domaine de production ici
    ];
    
    // Autoriser les requêtes sans origin (ex: Postman, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// ====================================
// ✅ AJOUTÉ : Rate limiting
// ====================================

// Limiter les tentatives de connexion/inscription
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  message: { 
    error: "Trop de tentatives. Veuillez réessayer dans 15 minutes." 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter les créations de commandes
const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 commandes max par minute
  message: { 
    error: "Trop de commandes créées. Veuillez patienter." 
  },
});

// Limiter les requêtes générales
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max
  message: { 
    error: "Trop de requêtes. Veuillez ralentir." 
  },
});

// Appliquer le rate limiting général (sauf pour les routes spécifiques)
app.use(generalLimiter);

// Middlewares
app.use(express.json());

// ====================================
// Routes avec rate limiting spécifique
// ====================================
app.use("/auth", authLimiter, authRouter);
app.use("/orders", orderLimiter, ordersRouter);
app.use("/reviews", reviewsRouter);
app.use("/geo", geoRouter);
app.use("/recommendations", recommendationsRouter);

setupSwagger(app);

// Route de test (pour voir si le backend tourne)
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running ✅" });
});

// Route protégée : récupérer les infos de l'utilisateur connecté
app.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    res.json(user);
  } catch (error) {
    console.error("Erreur /me :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Récupère tous les produits du catalogue
 *     tags: [Produits]
 *     responses:
 *       200:
 *         description: Liste des produits
 */
// ✅ ACCESSIBLE À TOUS : Récupérer tous les produits
app.get("/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    console.error("Erreur /products :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ✅ ACCESSIBLE À TOUS : Récupérer un produit par son id
app.get("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: "Produit introuvable" });
    }

    res.json(product);
  } catch (error) {
    console.error("Erreur GET /products/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ====================================
// ✅ PROTÉGÉ : Routes CRUD produits (réservées aux admins)
// ====================================

// Créer un produit (ADMIN SEULEMENT)
app.post("/products", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;

    // Vérification minimale
    if (!name || !description || price == null || stock == null || !category) {
      return res.status(400).json({ 
        error: "Tous les champs sont obligatoires (name, description, price, stock, category)." 
      });
    }

    // ✅ AJOUTÉ : Validation des types
    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: "Le prix doit être un nombre positif." });
    }

    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({ error: "Le stock doit être un nombre positif ou zéro." });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        category,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("Erreur POST /products :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Mettre à jour un produit (ADMIN SEULEMENT)
app.put("/products/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const { name, description, price, stock, category } = req.body;

    // On construit un objet "data" avec uniquement les champs envoyés
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) {
      if (typeof price !== 'number' || price <= 0) {
        return res.status(400).json({ error: "Le prix doit être un nombre positif." });
      }
      data.price = parseFloat(price);
    }
    if (stock !== undefined) {
      if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({ error: "Le stock doit être un nombre positif ou zéro." });
      }
      data.stock = parseInt(stock, 10);
    }
    if (category !== undefined) data.category = category;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour." });
    }

    // Vérifier d'abord que le produit existe
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Produit introuvable" });
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error) {
    console.error("Erreur PUT /products/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Supprimer un produit (ADMIN SEULEMENT)
app.delete("/products/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: "ID invalide" });
    }

    // Vérifier que le produit existe
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Produit introuvable" });
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({ message: "Produit supprimé avec succès" });
  } catch (error) {
    console.error("Erreur DELETE /products/:id :", error);
    
    // ✅ Gérer le cas où le produit est lié à des commandes
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        error: "Impossible de supprimer ce produit car il est lié à des commandes." 
      });
    }
    
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ====================================
// Routes utilisateur protégées
// ====================================

// Modifier son profil
app.put("/me", authMiddleware, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const data = {};

    if (name) data.name = name;
    if (email) data.email = email;

    if (password) {
      // ✅ AJOUTÉ : Validation du mot de passe
      if (password.length < 8) {
        return res.status(400).json({ 
          error: "Le mot de passe doit contenir au moins 8 caractères." 
        });
      }
      const hashed = await bcrypt.hash(password, 10);
      data.password = hashed;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Erreur PUT /me :", error);
    
    // ✅ Gérer l'erreur d'email déjà existant
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        error: "Cet email est déjà utilisé par un autre compte." 
      });
    }
    
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Supprimer son compte
app.delete("/me", authMiddleware, async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.userId },
    });

    res.json({ message: "Compte supprimé avec succès." });
  } catch (error) {
    console.error("Erreur DELETE /me :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Port (prend PORT du .env ou 4000 par défaut)
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Backend démarré sur http://localhost:${PORT}`);
  console.log(`📚 Documentation Swagger : http://localhost:${PORT}/api-docs`);
});