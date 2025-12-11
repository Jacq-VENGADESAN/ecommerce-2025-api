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
    <div style={{ padding: "20px" }}>
      <h1>Mes commandes</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {orders.length === 0 && !error && <p>Vous n'avez pas encore passé de commande.</p>}

      {orders.map((order) => (
        <div
          key={order.id}
          style={{
            border: "1px solid #ddd",
            padding: "10px",
            marginBottom: "15px",
          }}
        >
          <h3>Commande #{order.id}</h3>
          <p>
            Statut commande : <strong>{order.status}</strong>
          </p>
          <p>
            Total : <strong>{order.total.toFixed(2)} €</strong>
          </p>
          <p>
            Date :{" "}
            {new Date(order.createdAt).toLocaleString("fr-FR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>

          {order.delivery && (
            <p>
              Livraison : {order.delivery.status}
              {order.delivery.method ? ` (${order.delivery.method})` : ""}{" "}
              {order.delivery.address ? ` – ${order.delivery.address}` : ""}
              {order.delivery.estimatedAt
                ? ` (ETA: ${new Date(order.delivery.estimatedAt).toLocaleDateString("fr-FR")})`
                : ""}
            </p>
          )}

          {order.payment && (
            <p>
              Paiement : {order.payment.status} – {order.payment.amount} €
            </p>
          )}

          <h4>Articles :</h4>
          <ul>
            {order.items.map((item) => (
              <li key={item.id}>
                {item.product ? `${item.product.name} ` : `Produit #${item.productId} `}
                – {item.price} € x {item.quantity}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
