import React, { useState } from "react";
import axiosClient from "../api/axiosClient";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    try {
      const res = await axiosClient.post("/auth/login", form);
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      setMessage(`Connecté en tant que ${user.email}`);
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.error || "Erreur de connexion");
    }
  }

  return (
    <div className="page">
      <div className="page-title">Connexion</div>
      <div className="card">
        <form onSubmit={handleSubmit} className="form">
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
            Se connecter
          </button>
          {message && <p className="message">{message}</p>}
        </form>
      </div>
    </div>
  );
}
