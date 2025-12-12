import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useCart } from "../context/CartContext";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [geoStatus, setGeoStatus] = useState("");
  const [coords, setCoords] = useState(null);
  const { addToCart } = useCart();

  useEffect(() => {
    axiosClient.get("/products").then((res) => setProducts(res.data)).catch(console.error);

    loadRecommendations();
  }, []);

  async function loadRecommendations(params) {
    try {
      const res = await axiosClient.get("/recommendations", { params });
      if (res.data.products) setRecommended(res.data.products);
      if (res.data.topRated) setTopRated(res.data.topRated);
      if (res.data.pickupPoints) setPickupPoints(res.data.pickupPoints);
    } catch (err) {
      console.error(err);
      setGeoStatus("Impossible de charger les recommandations.");
    }
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoStatus("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }
    setGeoStatus("Recherche de votre position...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });
        loadRecommendations({ lat, lon });
        setGeoStatus("Points de retrait mis à jour avec votre position.");
      },
      (err) => {
        console.error(err);
        setGeoStatus("Permission refusée ou échec de la géolocalisation.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

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
        <div className="inline" style={{ marginBottom: 10 }}>
          <button className="btn btn-secondary" onClick={handleGeolocate}>
            Utiliser ma position
          </button>
          {coords && (
            <span className="pill">
              lat: {coords.lat.toFixed(3)} · lon: {coords.lon.toFixed(3)}
            </span>
          )}
        </div>
        {geoStatus && <p className="message">{geoStatus}</p>}
        {pickupPoints.length === 0 && <p className="muted">Aucun point trouvé pour le moment.</p>}
        {pickupPoints.length > 0 && (
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
        )}
      </div>
    </div>
  );
}
