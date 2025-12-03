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

      // 1) On récupère lat/lon avec /geo/search
      const searchRes = await axiosClient.get("/geo/search", {
        params: { query },
      });

      const loc = searchRes.data;
      setLocation(loc);

      // 2) On récupère les points de retrait avec /geo/pickup
      const pickupRes = await axiosClient.get("/geo/pickup", {
        params: {
          lat: loc.lat,
          lon: loc.lon,
        },
      });

      setPickups(pickupRes.data);

      if (pickupRes.data.length === 0) {
        setMessage("Aucun point de retrait trouvé à proximité.");
      }
    } catch (error) {
      console.error("Erreur GeoPage :", error);
      setMessage(
        error.response?.data?.error ||
          "Erreur lors de la recherche des points de retrait."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Points de retrait proches</h1>

      <form onSubmit={handleSearch} style={{ marginBottom: "15px" }}>
        <label>
          Ville ou adresse :{" "}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ marginRight: "10px" }}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Recherche..." : "Rechercher"}
        </button>
      </form>

      {message && <p style={{ color: "red" }}>{message}</p>}

      {location && (
        <p>
          Position trouvée : <strong>{location.display_name}</strong>
          <br />
          (lat: {location.lat}, lon: {location.lon})
        </p>
      )}

      {pickups.length > 0 && (
        <>
          <h2>Points de retrait à proximité</h2>
          <ul>
            {pickups.map((p, index) => (
              <li key={index} style={{ marginBottom: "8px" }}>
                <strong>{p.display_name}</strong>
                {p.address && (
                  <>
                    <br />
                    {p.address.road && `${p.address.road}, `}
                    {p.address.postcode && `${p.address.postcode} `}
                    {p.address.city || p.address.town || p.address.village}
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
