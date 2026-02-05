// src/api/http.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

export const http = axios.create({
  baseURL: API_BASE,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let redirected = false;

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 && !redirected) {
      redirected = true;
      localStorage.removeItem("token");
      const here = window.location.pathname + window.location.search;
      window.location.replace(`/login?next=${encodeURIComponent(here)}`);
    }
    return Promise.reject(err);
  }
);
