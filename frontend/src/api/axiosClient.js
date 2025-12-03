import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:4000",
});

// Intercepteur pour ajouter le token automatiquement
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc2NDc3OTU1MSwiZXhwIjoxNzY1Mzg0MzUxfQ.rbILITiuuvi3Rgg520RsX0xT-dVCZmreHVAcf3-XVEE");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default axiosClient;
