// src/api/walletApi.js
import { http } from "./http";

const API_URL = "/api/wallet";

// 내 지갑 조회
export const getMyWallet = async () => {
  const { data } = await http.get(`${API_URL}/me`);
  return data;
};

// 충전
export const chargeMyWallet = async (amountKrw) => {
  const { data } = await http.post(`${API_URL}/me/charge`, { amountKrw });
  return data;
};
