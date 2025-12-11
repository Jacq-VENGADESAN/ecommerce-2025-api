import React, { useState } from "react";
import axiosClient from "../api/axiosClient";

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [message, setMessage] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    try {
      const res = await axiosClient.post("/auth/register", form);
      setMessage(`Compte créé pour ${res.data.email}`);
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.error || "Erreur lors de l'inscription");
    }
  }

  return (
    <div className="page">
      <div className="page-title">Inscription</div>
      <div className="card">
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label className="form-label">Nom</label>
            <input className="form-input" name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              className="form-input"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Créer un compte
          </button>
          {message && <p className="message">{message}</p>}
        </form>
      </div>
    </div>
  );
}
