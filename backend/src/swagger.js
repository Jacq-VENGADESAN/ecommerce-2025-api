const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API E-commerce 2025",
      version: "1.0.0",
      description:
        "Documentation de l'API e-commerce (auth, produits, commandes, avis, géolocalisation, recommandations).",
    },
    servers: [
      {
        url: "http://localhost:4000",
      },
    ],
  },

  // Tous les fichiers où Swagger va chercher des commentaires JSDoc
  apis: ["./src/routes/*.js", "./src/index.js"],
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;
