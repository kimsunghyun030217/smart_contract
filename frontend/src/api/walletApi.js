import axios from "axios";

const API_URL = "http://localhost:8080/api/wallet";

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

// ✅ 내 지갑 조회: GET /api/wallet/me
export const getMyWallet = async () => {
  const res = await api.get("/me");
  return res.data;
};

// ✅ 충전(+누적): POST /api/wallet/me/charge
// 백엔드가 BigDecimal 받으니까 숫자/문자열 다 OK (ex: "1000000")
export const chargeMyWallet = async (amountKrw) => {
  const res = await api.post("/me/charge", { amountKrw });
  return res.data;
};
