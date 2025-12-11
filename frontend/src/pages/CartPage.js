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
    <div style={{ padding: "20px" }}>
      <h1>Mon panier</h1>

      {items.length === 0 && <p>Votre panier est vide.</p>}

      {items.length > 0 && (
        <>
          <ul>
            {items.map((item) => (
              <li key={item.productId} style={{ marginBottom: "10px" }}>
                <strong>{item.name}</strong> – {item.price} € x {item.quantity}
                <button style={{ marginLeft: "10px" }} onClick={() => removeFromCart(item.productId)}>
                  Retirer
                </button>
              </li>
            ))}
          </ul>

          <h2>Total : {total.toFixed(2)} €</h2>

          <div style={{ margin: "10px 0" }}>
            <label>
              Mode de livraison :
              <select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
                style={{ marginLeft: 8 }}
              >
                <option value="delivery">Livraison</option>
                <option value="pickup">Point de retrait</option>
              </select>
            </label>
          </div>

          {deliveryMethod === "delivery" && (
            <div style={{ margin: "10px 0" }}>
              <label>
                Adresse :
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="12 rue Exemple, Paris"
                  style={{ marginLeft: 8, width: "300px" }}
                />
              </label>
            </div>
          )}

          {deliveryMethod === "pickup" && (
            <div style={{ margin: "10px 0" }}>
              <label>
                Point de retrait :
                <input
                  type="text"
                  value={pickupPoint}
                  onChange={(e) => setPickupPoint(e.target.value)}
                  placeholder="Point relais ou bureau de poste"
                  style={{ marginLeft: 8, width: "280px" }}
                />
              </label>
            </div>
          )}

          <button onClick={handleCheckout}>Passer commande</button>
        </>
      )}

      {message && <p style={{ marginTop: "10px" }}>{message}</p>}
    </div>
  );
}
