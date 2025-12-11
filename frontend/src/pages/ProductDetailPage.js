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

    axiosClient
      .get(`/products/${productId}`)
      .then((res) => setProduct(res.data))
      .catch(() => setMessage("Produit introuvable."));

    axiosClient
      .get(`/reviews/product/${productId}`)
      .then((res) => setReviews(res.data))
      .catch((err) => console.error("Erreur avis :", err));
  }, [productId]);

  async function handleAddReview(e) {
    e.preventDefault();
    setMessage("");

    try {
      const body = {
        productId: parseInt(productId, 10),
        rating,
        comment,
      };

      const res = await axiosClient.post("/reviews", body);

      setReviews([res.data, ...reviews]);
      setComment("");
      setRating(5);
      setMessage("Avis ajouté !");
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.error || "Erreur lors de l'ajout de l'avis. Êtes-vous connecté ?");
    }
  }

  if (!product) {
    return (
      <div className="page">
        <p className="muted">Chargement du produit...</p>
      </div>
    );
  }

  const average =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "Aucune note";

  return (
    <div className="page">
      <div className="card">
        <div className="page-title">{product.name}</div>
        <p className="muted">{product.category}</p>
        <div className="product-price">{product.price} €</div>
        <p>{product.description}</p>
        <div className="inline">
          <span className="pill">Stock : {product.stock}</span>
          <span className="pill">Note moyenne : {average}</span>
        </div>
        <div className="product-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" onClick={() => addToCart(product)}>
            Ajouter au panier
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Avis ({reviews.length})</div>
        <form onSubmit={handleAddReview} className="form" style={{ marginBottom: 12 }}>
          <div className="form-group">
            <label className="form-label">Note</label>
            <select
              className="form-select"
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value, 10))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ★
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Commentaire</label>
            <textarea
              className="form-textarea"
              rows="3"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Votre avis..."
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Ajouter un avis
          </button>
          {message && <p className="message">{message}</p>}
        </form>

        <ul className="list">
          {reviews.map((r) => (
            <li key={r.id} className="card" style={{ padding: 12 }}>
              <div className="inline" style={{ justifyContent: "space-between" }}>
                <strong>{r.rating} ★</strong>
                <span className="muted">
                  {new Date(r.createdAt).toLocaleDateString()} · {r.user?.name || "Utilisateur"}
                </span>
              </div>
              <p>{r.comment}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
