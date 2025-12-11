import { useState } from "react";
import axiosClient from "../api/axiosClient";

export default function GeoPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState(null);
  const [pickups, setPickups] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    setMessage("");
    setLocation(null);
    setPickups([]);
    if (!query.trim()) {
      setMessage("Merci de saisir une ville ou une adresse.");
      return;
    }

    try {
      setLoading(true);

      const searchRes = await axiosClient.get("/geo/search", { params: { query } });
      const loc = searchRes.data;
      setLocation(loc);

      const pickupRes = await axiosClient.get("/geo/pickup", {
        params: { lat: loc.lat, lon: loc.lon },
      });

      setPickups(pickupRes.data);
      if (pickupRes.data.length === 0) {
        setMessage("Aucun point de retrait trouvé à proximité.");
      }
    } catch (error) {
      console.error("Erreur GeoPage :", error);
      setMessage(error.response?.data?.error || "Erreur lors de la recherche des points de retrait.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-title">Points de retrait</div>
      <div className="card">
        <form onSubmit={handleSearch} className="form">
          <div className="form-group">
            <label className="form-label">Ville ou adresse</label>
            <input
              className="form-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paris, Marseille, Lyon..."
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Recherche..." : "Rechercher"}
          </button>
          {message && <p className="message">{message}</p>}
        </form>
      </div>

      {location && (
        <div className="card">
          <div className="section-title">Position trouvée</div>
          <p>
            <strong>{location.display_name}</strong>
          </p>
          <p className="muted">
            lat: {location.lat}, lon: {location.lon}
          </p>
        </div>
      )}

      {pickups.length > 0 && (
        <div className="card">
          <div className="section-title">Points de retrait à proximité</div>
          <ul className="list">
            {pickups.map((p, index) => (
              <li key={index} className="card" style={{ padding: 12 }}>
                <strong>{p.display_name}</strong>
                {p.address && (
                  <div className="muted">
                    {p.address.road && `${p.address.road}, `}
                    {p.address.postcode && `${p.address.postcode} `}
                    {p.address.city || p.address.town || p.address.village || ""}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
