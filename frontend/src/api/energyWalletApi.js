const API_BASE = "http://localhost:8080";

function authHeaders() {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ✅ 내 에너지 지갑 조회: GET /energy-wallet
export async function getMyEnergyWallet() {
  const res = await fetch(`${API_BASE}/energy-wallet`, {
    method: "GET",
    headers: authHeaders(),
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(json?.message || `energy wallet fetch failed (${res.status})`);
  return json;
}

// ✅ 충전: POST /energy-wallet/charge
export async function chargeMyEnergy(amountKwh) {
  const res = await fetch(`${API_BASE}/energy-wallet/charge`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ amountKwh }),
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(json?.message || `energy wallet charge failed (${res.status})`);
  return json;
}
