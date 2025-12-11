import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useCart } from "../context/CartContext";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    axiosClient
      .get("/products")
      .then((res) => setProducts(res.data))
      .catch((err) => {
        console.error("Erreur /products", err);
      });

    axiosClient
      .get("/recommendations")
      .then((res) => {
        if (res.data.products) setRecommended(res.data.products);
        if (res.data.topRated) setTopRated(res.data.topRated);
        if (res.data.pickupPoints) setPickupPoints(res.data.pickupPoints);
      })
      .catch((err) => console.error("Erreur recommandations", err));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Catalogue de produits</h1>

      {products.length === 0 && <p>Aucun produit pour le moment.</p>}
      <ul>
        {products.map((p) => (
          <li key={p.id} style={{ marginBottom: "10px" }}>
            <strong>{p.name}</strong> – {p.price} €
            <button style={{ marginLeft: "10px" }} onClick={() => addToCart(p)}>
              Ajouter au panier
            </button>
            <a href={`/product?id=${p.id}`} style={{ marginLeft: "10px", color: "blue" }}>
              Voir le détail
            </a>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: "40px" }}>Recommandations pour vous</h2>
      {recommended.length === 0 && <p>Aucune recommandation pour le moment.</p>}
      <ul>
        {recommended.map((prod) => (
          <li key={prod.id} style={{ marginBottom: "10px" }}>
            <strong>{prod.name}</strong> – {prod.price} €
            <a href={`/product?id=${prod.id}`} style={{ marginLeft: "10px", color: "blue" }}>
              Voir le détail
            </a>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: "40px" }}>Produits les mieux notés</h2>
      {topRated.length === 0 && <p>Aucun produit bien noté pour le moment.</p>}
      <ul>
        {topRated.map((prod) => (
          <li key={prod.id} style={{ marginBottom: "10px" }}>
            <strong>{prod.name}</strong> – {prod.price} €
            <a href={`/product?id=${prod.id}`} style={{ marginLeft: "10px", color: "blue" }}>
              Voir le détail
            </a>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: "40px" }}>Points de retrait proches</h2>
      {pickupPoints.length === 0 && <p>Aucun point trouvé (ajoutez lat/lon dans l’URL ou activez la géolocalisation côté API).</p>}
      <ul>
        {pickupPoints.map((p, idx) => (
          <li key={idx} style={{ marginBottom: "8px" }}>
            {p.display_name || p.name || "Point de retrait"} – {p.address?.city || p.address?.town || ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
