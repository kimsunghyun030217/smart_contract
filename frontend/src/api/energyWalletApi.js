// src/api/energyWalletApi.js
import { http } from "./http";

// ✅ 내 에너지 지갑 조회: GET /energy-wallet
export async function getMyEnergyWallet() {
  const { data } = await http.get("/energy-wallet");
  return data;
}

// ✅ 충전: POST /energy-wallet/charge
export async function chargeMyEnergy(amountKwh) {
  const { data } = await http.post("/energy-wallet/charge", { amountKwh });
  return data;
}
