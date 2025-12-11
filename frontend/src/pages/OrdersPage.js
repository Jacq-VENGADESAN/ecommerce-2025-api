import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    axiosClient
      .get("/orders/me")
      .then((res) => setOrders(res.data))
      .catch((err) => {
        console.error("Erreur /orders/me :", err);
        setError(err.response?.data?.error || "Erreur lors du chargement des commandes. Êtes-vous connecté ?");
      });
  }, []);

  return (
    <div className="page">
      <div className="page-title">Mes commandes</div>
      {error && <p className="message">{error}</p>}

      {orders.length === 0 && !error && <p className="muted">Vous n'avez pas encore passé de commande.</p>}

      <div className="stack">
        {orders.map((order) => (
          <div key={order.id} className="card">
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <h3>Commande #{order.id}</h3>
              <span className="pill">{new Date(order.createdAt).toLocaleString("fr-FR")}</span>
            </div>
            <p>
              Statut : <strong>{order.status}</strong>
            </p>
            <p>
              Total : <strong>{order.total.toFixed(2)} €</strong>
            </p>

            {order.delivery && (
              <p>
                Livraison : {order.delivery.status}
                {order.delivery.method ? ` (${order.delivery.method})` : ""} {order.delivery.address || ""}
              </p>
            )}

            {order.payment && (
              <p>
                Paiement : {order.payment.status} · {order.payment.amount} €
              </p>
            )}

            <div className="section-title">Articles</div>
            <ul className="list">
              {order.items.map((item) => (
                <li key={item.id} className="card" style={{ padding: 10 }}>
                  {item.product ? `${item.product.name}` : `Produit #${item.productId}`} · {item.price} € x{" "}
                  {item.quantity}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
