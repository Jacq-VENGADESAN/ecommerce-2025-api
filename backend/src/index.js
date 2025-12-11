// backend/src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");

const setupSwagger = require("./swagger");
const prisma = require("./prisma");
const { validateId, requireString, requireNumber, requireEmail } = require("./utils/validation");

const recommendationsRouter = require("./routes/recommendations");
const geoRouter = require("./routes/geo");
const reviewsRouter = require("./routes/reviews");
const authRouter = require("./routes/auth");
const ordersRouter = require("./routes/orders");

const authMiddleware = require("./middlewares/authMiddleware");
const adminMiddleware = require("./middlewares/adminMiddleware");

if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
  throw new Error("Variables d'environnement manquantes (JWT_SECRET, DATABASE_URL)");
}

const app = express();

// CORS
const allowedOrigins = ["http://localhost:3000", "http://localhost:3001"];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Non autorise par CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Trop de tentatives. Veuillez reessayer dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Trop de commandes creees. Veuillez patienter." },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Trop de requetes. Veuillez ralentir." },
});

app.use(generalLimiter);
app.use(express.json({ limit: "1mb" }));
app.disable("x-powered-by");
app.use(helmet());

// Refuser les Content-Type non JSON (sauf GET/HEAD/OPTIONS) et gérer Accept
app.use((req, res, next) => {
  const method = req.method.toUpperCase();
  const contentType = req.headers["content-type"];
  const accept = req.headers["accept"];

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (!contentType || !contentType.includes("application/json")) {
      return res.status(415).json({ error: "Content-Type doit être application/json" });
    }
  }

  if (accept && !accept.includes("application/json") && accept !== "*/*") {
    return res.status(406).json({ error: "Format non supporté. Utilisez application/json" });
  }

  next();
});

// Routes
app.use("/auth", authLimiter, authRouter);
app.use("/orders", orderLimiter, ordersRouter);
app.use("/reviews", reviewsRouter);
app.use("/geo", geoRouter);
app.use("/recommendations", recommendationsRouter);

setupSwagger(app);

// Health
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running." });
});

// Profil utilisateur
app.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouve." });
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
 *     summary: Recupere tous les produits du catalogue
 *     tags: [Produits]
 *     responses:
 *       200:
 *         description: Liste des produits
 */
app.get("/products", async (_req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    console.error("Erreur /products :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const id = validateId(req.params.id);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ error: "Produit introuvable" });
    }

    res.json(product);
  } catch (error) {
    if (error.message?.includes("ID invalide")) {
      return res.status(400).json({ error: "ID invalide" });
    }
    console.error("Erreur GET /products/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// CRUD produits (admins)
app.post("/products", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;

    const safeName = requireString(name, 2, 200, "name");
    const safeDescription = requireString(description, 5, 2000, "description");
    const safeCategory = requireString(category, 2, 120, "category");
    const safePrice = requireNumber(price, { min: 0.01, max: 1_000_000, field: "price" });
    const safeStock = requireNumber(stock, { min: 0, max: 1_000_000, field: "stock" });

    const product = await prisma.product.create({
      data: {
        name: safeName,
        description: safeDescription,
        price: parseFloat(safePrice),
        stock: parseInt(safeStock, 10),
        category: safeCategory,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    if (error.message?.includes("doit")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Erreur POST /products :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/products/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = validateId(req.params.id);
    const { name, description, price, stock, category } = req.body;

    const data = {};
    if (name !== undefined) data.name = requireString(name, 2, 200, "name");
    if (description !== undefined) data.description = requireString(description, 5, 2000, "description");
    if (price !== undefined) data.price = requireNumber(price, { min: 0.01, max: 1_000_000, field: "price" });
    if (stock !== undefined) data.stock = requireNumber(stock, { min: 0, max: 1_000_000, field: "stock" });
    if (category !== undefined) data.category = requireString(category, 2, 120, "category");

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Aucun champ a mettre a jour." });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Produit introuvable" });
    }

    const updated = await prisma.product.update({ where: { id }, data });
    res.json(updated);
  } catch (error) {
    if (error.message?.includes("ID invalide") || error.message?.includes("doit")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Erreur PUT /products/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.delete("/products/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = validateId(req.params.id);

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Produit introuvable" });
    }

    await prisma.product.delete({ where: { id } });
    res.json({ message: "Produit supprime avec succes" });
  } catch (error) {
    if (error.code === "P2003") {
      return res
        .status(400)
        .json({ error: "Impossible de supprimer ce produit car il est lie a des commandes." });
    }
    if (error.message?.includes("ID invalide")) {
      return res.status(400).json({ error: "ID invalide" });
    }
    console.error("Erreur DELETE /products/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Mise a jour de profil
app.put("/me", authMiddleware, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const data = {};

    if (name) data.name = requireString(name, 2, 120, "name");
    if (email) data.email = requireEmail(email);
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caracteres." });
      }
      const hashed = await bcrypt.hash(password, 10);
      data.password = hashed;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Aucun champ a mettre a jour." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    res.json(updatedUser);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Cet email est deja utilise par un autre compte." });
    }
    console.error("Erreur PUT /me :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Suppression de compte
app.delete("/me", authMiddleware, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.userId } });
    res.json({ message: "Compte supprime avec succes." });
  } catch (error) {
    console.error("Erreur DELETE /me :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Middleware d'erreur
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Erreur non capturee :", err);
  res.status(500).json({ error: "Erreur serveur" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend demarre sur http://localhost:${PORT}`);
  console.log(`Documentation Swagger : http://localhost:${PORT}/api-docs`);
});
