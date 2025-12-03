import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useCart } from "../context/CartContext";

export default function ProductDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const { addToCart } = useCart();

  useEffect(() => {
    if (!productId) return;

    // Charger le produit
    axiosClient
      .get(`/products/${productId}`)
      .then((res) => setProduct(res.data))
      .catch(() => setMessage("Produit introuvable."));

    // Charger les avis
    axiosClient
      .get(`/reviews/product/${productId}`)
      .then((res) => setReviews(res.data))
      .catch((err) => {
        console.error("Erreur avis :", err);
      });
  }, [productId]);

  async function handleAddReview(e) {
    e.preventDefault();
    setMessage("");

    try {
      const body = {
        productId: parseInt(productId),
        rating,
        comment,
      };

      const res = await axiosClient.post("/reviews", body);

      setReviews([res.data, ...reviews]); // on ajoute l'avis au début
      setComment("");
      setRating(5);
      setMessage("Avis ajouté !");
    } catch (error) {
      console.error(error);
      setMessage(
        error.response?.data?.error ||
          "Erreur lors de l'ajout de l'avis. Êtes-vous connecté ?"
      );
    }
  }

  if (!product) {
    return (
      <div style={{ padding: "20px" }}>
        <p>Chargement du produit...</p>
      </div>
    );
  }

  // Calcul de la note moyenne
  const average =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : "Aucune note";

  return (
    <div style={{ padding: "20px" }}>
      <h1>{product.name}</h1>
      <p>
        <strong>Prix :</strong> {product.price} €
      </p>
      <p>
        <strong>Stock :</strong> {product.stock}
      </p>
      <p>{product.description}</p>

      <button onClick={() => addToCart(product)}>Ajouter au panier</button>

      <h2 style={{ marginTop: "30px" }}>Avis ({reviews.length})</h2>
      <p>Note moyenne : {average} ⭐</p>

      {message && <p style={{ color: "green" }}>{message}</p>}

      {/* Formulaire d'ajout d'avis */}
      <form onSubmit={handleAddReview} style={{ marginTop: "15px" }}>
        <label>
          Note :
          <select
            value={rating}
            onChange={(e) => setRating(parseInt(e.target.value))}
            style={{ marginLeft: "10px" }}
          >
            <option value="5">5 ⭐</option>
            <option value="4">4 ⭐</option>
            <option value="3">3 ⭐</option>
            <option value="2">2 ⭐</option>
            <option value="1">1 ⭐</option>
          </select>
        </label>

        <br /><br />

        <textarea
          placeholder="Votre commentaire"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows="3"
          cols="40"
        />

        <br /><br />

        <button type="submit">Ajouter un avis</button>
      </form>

      <ul style={{ marginTop: "20px" }}>
        {reviews.map((r) => (
          <li
            key={r.id}
            style={{
              borderBottom: "1px solid #ccc",
              paddingBottom: "10px",
              marginBottom: "10px",
            }}
          >
            <strong>{r.rating} ⭐</strong> — {r.comment}
            <br />
            <small>
              Par {r.user?.name || "Utilisateur"} —{" "}
              {new Date(r.createdAt).toLocaleDateString()}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}
