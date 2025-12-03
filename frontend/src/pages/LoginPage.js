import React, { useState } from "react";
import axiosClient from "../api/axiosClient";

export default function LoginPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    try {
      const res = await axiosClient.post("/auth/login", form);
      const { token, user } = res.data;

      // Stocker le token en localStorage
      localStorage.setItem("token", token);
      setMessage(`Connecté en tant que ${user.email}`);
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.error || "Erreur de connexion");
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Connexion</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email :</label><br />
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Mot de passe :</label><br />
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" style={{ marginTop: "10px" }}>Se connecter</button>
      </form>
      {message && <p style={{ marginTop: "10px" }}>{message}</p>}
    </div>
  );
}
