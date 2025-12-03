// backend/src/routes/auth.js

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();
const prisma = new PrismaClient();

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

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Vérif basique
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password et name sont obligatoires." });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: "Un utilisateur avec cet email existe déjà." });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // On ne renvoie pas le mot de passe
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
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

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérif basique
    if (!email || !password) {
      return res.status(400).json({ error: "email et password sont obligatoires." });
    }

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Identifiants invalides." });
    }

    // Comparer les mots de passe
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Identifiants invalides." });
    }

    // Générer un token JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
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

module.exports = router;
