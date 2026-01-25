import axios from "axios";

const API_URL = "http://localhost:8080/api/wallet";

// 공통 axios instance
const api = axios.create({
  baseURL: API_URL,
});

// JWT 토큰 자동 포함
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ 내 지갑 조회
export const getMyWallet = async () => {
  const res = await api.get("/me");
  return res.data;
};

// ✅ PoC: 내 total_krw 직접 세팅
export const setMyWalletBalance = async (totalKrw) => {
  const res = await api.put("/me/balance", { totalKrw });
  return res.data;
};
