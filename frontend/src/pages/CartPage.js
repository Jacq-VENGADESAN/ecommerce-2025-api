import React, { useState } from "react";
import axiosClient from "../api/axiosClient";
import { useCart } from "../context/CartContext";

export default function CartPage() {
  const { items, total, removeFromCart, clearCart } = useCart();
  const [message, setMessage] = useState("");

  async function handleCheckout() {
    setMessage("");

    if (items.length === 0) {
      setMessage("Votre panier est vide.");
      return;
    }

    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const res = await axiosClient.post("/orders", payload);
      setMessage(`Commande créée avec l'id ${res.data.id}`);
      clearCart();
    } catch (error) {
      console.error("Erreur /orders :", error);
      setMessage(
        error.response?.data?.error ||
          "Erreur lors de la création de la commande."
      );
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Mon panier</h1>

      {items.length === 0 && <p>Votre panier est vide.</p>}

      {items.length > 0 && (
        <>
          <ul>
            {items.map((item) => (
              <li key={item.productId} style={{ marginBottom: "10px" }}>
                <strong>{item.name}</strong> — {item.price} € x {item.quantity}
                <button
                  style={{ marginLeft: "10px" }}
                  onClick={() => removeFromCart(item.productId)}
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>

          <h2>Total : {total.toFixed(2)} €</h2>

          <button onClick={handleCheckout}>Passer commande</button>
        </>
      )}

      {message && <p style={{ marginTop: "10px" }}>{message}</p>}
    </div>
  );
}
