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
    axiosClient.get("/products").then((res) => setProducts(res.data)).catch(console.error);

    axiosClient
      .get("/recommendations")
      .then((res) => {
        if (res.data.products) setRecommended(res.data.products);
        if (res.data.topRated) setTopRated(res.data.topRated);
        if (res.data.pickupPoints) setPickupPoints(res.data.pickupPoints);
      })
      .catch(console.error);
  }, []);

  const ProductList = ({ title, items }) => (
    <div className="card">
      <div className="section-title">{title}</div>
      {(!items || items.length === 0) && <p className="muted">Aucun élément à afficher.</p>}
      <div className="grid">
        {items?.map((p) => (
          <div className="card product-card" key={p.id}>
            <div className="product-title">{p.name}</div>
            {p.category && <div className="product-category">{p.category}</div>}
            <div className="product-price">{p.price} €</div>
            <div className="product-actions">
              <button className="btn btn-primary" onClick={() => addToCart(p)}>
                Ajouter
              </button>
              <a className="btn btn-secondary" href={`/product?id=${p.id}`}>
                Détails
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="page">
      <div>
        <div className="page-title">Catalogue</div>
        <p className="muted">Découvrez les produits, vos recommandations et les points de retrait proches.</p>
      </div>

      <ProductList title="Tous les produits" items={products} />
      <ProductList title="Recommandations pour vous" items={recommended} />
      <ProductList title="Mieux notés" items={topRated} />

      <div className="card">
        <div className="section-title">Points de retrait proches</div>
        {pickupPoints.length === 0 && <p className="muted">Aucun point trouvé pour le moment.</p>}
        <ul className="list">
          {pickupPoints.map((p, idx) => (
            <li key={idx} className="card" style={{ padding: 12 }}>
              <div className="product-title">{p.display_name || p.name || "Point de retrait"}</div>
              <div className="muted">
                {p.address?.road && `${p.address.road}, `}
                {p.address?.postcode && `${p.address.postcode} `}
                {p.address?.city || p.address?.town || ""}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
