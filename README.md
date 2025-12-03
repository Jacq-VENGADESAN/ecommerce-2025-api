# 🛒 Projet E-commerce 2025  
API Node.js + Frontend React + PostgreSQL + API Géolocalisation

Ce projet est une application complète de e-commerce réalisée avec :
- Backend : Node.js / Express
- Base de données : PostgreSQL + Prisma ORM
- Frontend : React
- API externe : OpenStreetMap (Nominatim)
- Documentation API : Swagger
- Recommandations intelligentes basées sur l’historique utilisateur

---

# 📦 Fonctionnalités

## 👤 Authentification
- Inscription (POST /auth/register)
- Connexion (POST /auth/login)
- JWT sécurisé
- Récupération du profil utilisateur (/me)

## 🛍 Produits
- Liste des produits
- Page détail produit
- CRUD complet (backend)
- Gestion du stock

## ⭐ Avis clients
- Ajout d’un avis
- Note (1 à 5 étoiles)
- Commentaire texte
- Calcul automatique de la note moyenne

## 🛒 Panier
- Ajout au panier
- Persistance via localStorage
- Validation → création d’une commande

## 📦 Commandes
- Création d’une commande (Order + OrderItems)
- Paiement simulé
- Livraison simulée
- Historique utilisateur (/orders/me)

## 📍 API externe (géolocalisation)
Utilisation de Nominatim (OpenStreetMap) :
- Recherche d’adresse → /geo/search
- Points de retrait proches → /geo/pickup

## 🤖 Recommandations produits
Route : /recommendations  
Basées sur :
- l’historique utilisateur
- les produits populaires

## 📘 Swagger (Documentation API)
Disponible : http://localhost:4000/api-docs

---

# 🛠 Installation & Lancement

## 1️⃣ Cloner le projet

git clone https://github.com/<user>/ecommerce-2025-api.git  
cd ecommerce-2025-api

---

# ⚙ Backend (Node.js + Express)

## Installer les dépendances

cd backend  
npm install

## Fichier .env requis

DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce_db"  
JWT_SECRET="votre_secret"  
PORT=4000  

## Initialiser Prisma

npx prisma migrate dev --name init_schema  
npx prisma generate  

## Lancer le backend

npm run dev  

Backend → http://localhost:4000  
Swagger → http://localhost:4000/api-docs  

---

# 🎨 Frontend (React)

## Installation

cd ../frontend  
npm install  

## Lancement

npm start  

Frontend → http://localhost:3000  

---

# 🧪 Routes principales

## Authentification
POST /auth/register  
POST /auth/login  
GET /me  

## Produits
GET /products  
GET /products/:id  

## Avis
GET /reviews/product/:id  
POST /reviews  

## Commandes
POST /orders  
GET /orders/me  

## Géolocalisation
GET /geo/search?query=Paris  
GET /geo/pickup?lat=xx&lon=yy  

## Recommandations
GET /recommendations  

---

# 📚 Technologies utilisées

Backend : Node.js, Express, PostgreSQL, Prisma ORM, JWT, Swagger  
Frontend : React, Axios, Context API  
API externe : OpenStreetMap (Nominatim)

---

# 🏁 Conclusion

Ce projet implémente toutes les fonctionnalités essentielles d’un site e-commerce moderne :
- gestion des utilisateurs  
- catalogue produits  
- panier et commandes  
- avis clients  
- géolocalisation  
- recommandations intelligentes  

Le projet est complet, professionnel et conforme aux exigences d’un rendu universitaire 2025.
