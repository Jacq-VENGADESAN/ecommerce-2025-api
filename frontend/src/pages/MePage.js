import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";

export default function MePage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    axiosClient
      .get("/me")
      .then((res) => {
        setUser(res.data);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur");
      });
  }, []);

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Mon profil</h1>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Mon profil</h1>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Mon profil</h1>
      <p><strong>ID :</strong> {user.id}</p>
      <p><strong>Email :</strong> {user.email}</p>
      <p><strong>Nom :</strong> {user.name}</p>
      <p><strong>Créé le :</strong> {new Date(user.createdAt).toLocaleString()}</p>
    </div>
  );
}
