// backend/src/routes/geo.js
/**
 * @swagger
 * tags:
 *   name: Geo
 *   description: Géolocalisation (OpenStreetMap/Nominatim)
 */
const express = require("express");
const axios = require("axios");

const router = express.Router();

/**
 * @swagger
 * /geo/search:
 *   get:
 *     summary: Chercher une adresse et retourner les coordonnées
 *     tags: [Geo]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Résultat géocodé
 */
router.get("/search", async (req, res) => {
  try {
    const query = req.query.query;

    if (!query) {
      return res.status(400).json({ error: "Paramètre 'query' requis." });
    }

    const url = "https://nominatim.openstreetmap.org/search";
    const response = await axios.get(url, {
      params: {
        q: query,
        format: "json",
        addressdetails: 1,
        limit: 1,
      },
      timeout: 5000,
      headers: { "User-Agent": "ecommerce-2025-student-project" },
    });

    if (!Array.isArray(response.data) || response.data.length === 0) {
      return res.status(404).json({ error: "Aucun résultat trouvé." });
    }

    const result = response.data[0];

    res.json({
      lat: result.lat,
      lon: result.lon,
      display_name: result.display_name,
      address: result.address,
    });
  } catch (error) {
    console.error("Erreur /geo/search :", error.response?.data || error.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * @swagger
 * /geo/pickup:
 *   get:
 *     summary: Chercher des points de retrait autour d'une position
 *     tags: [Geo]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Points de retrait
 */
router.get("/pickup", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: "Paramètres 'lat' et 'lon' requis." });
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({ error: "lat et lon doivent être des nombres." });
    }

    const url = "https://nominatim.openstreetmap.org/search";

    const response = await axios.get(url, {
      params: {
        q: "post office",
        format: "json",
        addressdetails: 1,
        limit: 10,
        bounded: 1,
        viewbox: `${lonNum - 0.02},${latNum + 0.02},${lonNum + 0.02},${latNum - 0.02}`,
      },
      timeout: 5000,
      headers: { "User-Agent": "ecommerce-2025-student-project" },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Erreur /geo/pickup :", error.response?.data || error.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
