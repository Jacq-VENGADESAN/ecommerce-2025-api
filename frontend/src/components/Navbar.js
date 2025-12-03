import React from "react";

export default function Navbar() {
  return (
    <nav style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
      <a href="/" style={{ marginRight: "10px" }}>Produits</a>
      <a href="/cart" style={{ marginRight: "10px" }}>Panier</a>
      <a href="/orders" style={{ marginRight: "10px" }}>Mes commandes</a>
      <a href="/geo" style={{ marginRight: "10px" }}>Points de retrait</a>
      <a href="/me" style={{ marginRight: "10px" }}>Profil</a>
      <a href="/login" style={{ marginRight: "10px" }}>Login</a>
      <a href="/register">Register</a>
    </nav>
  );
}
