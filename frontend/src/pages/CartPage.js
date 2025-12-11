import React, { useState } from "react";
import axiosClient from "../api/axiosClient";
import { useCart } from "../context/CartContext";

export default function CartPage() {
  const { items, total, removeFromCart, clearCart } = useCart();
  const [message, setMessage] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("delivery");
  const [address, setAddress] = useState("");
  const [pickupPoint, setPickupPoint] = useState("");

  async function handleCheckout() {
    setMessage("");

    if (items.length === 0) {
      setMessage("Votre panier est vide.");
      return;
    }

    if (deliveryMethod === "delivery" && address.trim().length < 5) {
      setMessage("Merci de renseigner une adresse de livraison.");
      return;
    }

    if (deliveryMethod === "pickup" && pickupPoint.trim().length < 3) {
      setMessage("Merci de renseigner un point de retrait.");
      return;
    }

    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        delivery: {
          method: deliveryMethod,
          address: deliveryMethod === "delivery" ? address : undefined,
          pickupPoint: deliveryMethod === "pickup" ? pickupPoint : undefined,
        },
      };

      const res = await axiosClient.post("/orders", payload);
      setMessage(`Commande créée avec l'id ${res.data.id}`);
      clearCart();
      setAddress("");
      setPickupPoint("");
    } catch (error) {
      console.error("Erreur /orders :", error);
      setMessage(error.response?.data?.error || "Erreur lors de la création de la commande.");
    }
  }

  return (
    <div className="page">
      <div className="page-title">Mon panier</div>

      <div className="card">
        {items.length === 0 && <p className="muted">Votre panier est vide.</p>}

        {items.length > 0 && (
          <div className="stack">
            <ul className="list">
              {items.map((item) => (
                <li key={item.productId} className="card" style={{ padding: 12 }}>
                  <div className="inline" style={{ justifyContent: "space-between" }}>
                    <div>
                      <strong>{item.name}</strong> · {item.price} € x {item.quantity}
                    </div>
                    <button className="btn btn-secondary" onClick={() => removeFromCart(item.productId)}>
                      Retirer
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="section-title">Total : {total.toFixed(2)} €</div>

            <div className="form-group">
              <label className="form-label">Mode de livraison</label>
              <select
                className="form-select"
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
              >
                <option value="delivery">Livraison</option>
                <option value="pickup">Point de retrait</option>
              </select>
            </div>

            {deliveryMethod === "delivery" && (
              <div className="form-group">
                <label className="form-label">Adresse</label>
                <input
                  className="form-input"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="12 rue Exemple, Paris"
                />
              </div>
            )}

            {deliveryMethod === "pickup" && (
              <div className="form-group">
                <label className="form-label">Point de retrait</label>
                <input
                  className="form-input"
                  type="text"
                  value={pickupPoint}
                  onChange={(e) => setPickupPoint(e.target.value)}
                  placeholder="Point relais ou bureau de poste"
                />
              </div>
            )}

            <button className="btn btn-primary" onClick={handleCheckout}>
              Passer commande
            </button>
          </div>
        )}

        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}
