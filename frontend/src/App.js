import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import ProductsPage from "./pages/ProductsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MePage from "./pages/MePage";
import CartPage from "./pages/CartPage";
import OrdersPage from "./pages/OrdersPage";
import GeoPage from "./pages/GeoPage";
import ProductDetailPage from "./pages/ProductDetailPage";

import { CartProvider } from "./context/CartContext";

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <div className="app-root">
          <header className="app-header">
            <div className="app-logo">
              <span>EC</span> E-commerce 2025
            </div>
            <nav className="app-nav">
              <Link to="/">Produits</Link>
              <Link to="/cart">Panier</Link>
              <Link to="/orders">Commandes</Link>
              <Link to="/me">Profil</Link>
              <Link to="/pickup">Retrait</Link>
              <Link to="/login">Connexion</Link>
              <Link to="/register">Inscription</Link>
            </nav>
          </header>

          <main className="app-main">
            <Routes>
              <Route path="/" element={<ProductsPage />} />
              <Route path="/product" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/me" element={<MePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/pickup" element={<GeoPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;
