// backend/src/routes/auth.js

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../prisma");
const authMiddleware = require("../middlewares/authMiddleware");
const { addToBlacklist } = require("../utils/tokenBlacklist");
const { requireEmail, requirePassword, requireString } = require("../utils/validation");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Gestion de l'authentification
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Créer un nouvel utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@gmail.com
 *               password:
 *                 type: string
 *                 example: secret123
 *               name:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Champs manquants ou utilisateur déjà existant
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const safeEmail = requireEmail(email);
    requirePassword(password, 8);
    const safeName = requireString(name, 2, 120, "name");

    const existingUser = await prisma.user.findUnique({
      where: { email: safeEmail },
    });

    if (existingUser) {
      return res.status(409).json({ error: "Un utilisateur avec cet email existe déjà." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: safeEmail,
        password: hashedPassword,
        name: safeName,
      },
    });

    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Erreur /auth/register :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@gmail.com
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Connexion réussie + JWT retourné
 *       401:
 *         description: Identifiants invalides
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const safeEmail = requireEmail(email);
    requirePassword(password, 8);

    const user = await prisma.user.findUnique({
      where: { email: safeEmail },
    });

    if (!user) {
      return res.status(401).json({ error: "Identifiants invalides." });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Identifiants invalides." });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    res.json({
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Erreur /auth/login :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Déconnexion : révocation du JWT courant
router.post("/logout", authMiddleware, (req, res) => {
  try {
    if (req.tokenJti && req.tokenExp) {
      addToBlacklist(req.tokenJti, req.tokenExp);
    }
    res.json({ message: "Déconnexion effectuée." });
  } catch (error) {
    console.error("Erreur /auth/logout :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
