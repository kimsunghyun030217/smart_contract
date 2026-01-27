import React, { useMemo, useState, useEffect } from "react";
import Layout from "../components/Layout";

const API_BASE = "http://localhost:8080";

export default function BuyPage() {
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // ✅ 최소 종료시간 표시용
  const [minEndTime, setMinEndTime] = useState("");
  const [minEndMsg, setMinEndMsg] = useState("");

  // ✅ 추가: 가중치(0~1). 합은 자동으로 1 되게 정규화
  const [weights, setWeights] = useState({
    price: 0.6,
    distance: 0.3,
    trust: 0.1,
  });

  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  const normalize = (p, d, t) => {
    const sum = p + d + t;
    if (sum <= 0) return { price: 0.6, distance: 0.3, trust: 0.1 };
    return { price: p / sum, distance: d / sum, trust: t / sum };
  };

  const setWeight = (key, value) => {
    const v = clamp01(value);
    setWeights((prev) =>
      normalize(
        key === "price" ? v : prev.price,
        key === "distance" ? v : prev.distance,
        key === "trust" ? v : prev.trust
      )
    );
  };

  const presets = {
    cheap: { price: 0.7, distance: 0.2, trust: 0.1 },
    near: { price: 0.3, distance: 0.6, trust: 0.1 },
    safe: { price: 0.3, distance: 0.2, trust: 0.5 },
    balanced: { price: 0.6, distance: 0.3, trust: 0.1 },
  };

  const weightSummaryText = useMemo(() => {
    const p = Math.round(weights.price * 100);
    const d = Math.round(weights.distance * 100);
    const t = Math.round(weights.trust * 100);
    return `가격 ${p}% · 거리 ${d}% · 신뢰 ${t}%`;
  }, [weights]);

  // =========================================
  // ✅ [추가] 최소 종료시간(minEndTime) 조회
  // - startTime/amount 바뀌면 서버에 물어봄
  // - 너무 짧은 endTime이면 자동 보정
  // =========================================
  useEffect(() => {
    async function fetchMinEndTime() {
      setMinEndMsg("");
      setMinEndTime("");

      if (!startTime || !amount) return;

      const amountNum = Number(amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) return;

      try {
        const qs = new URLSearchParams({
          startTime: startTime + ":00",
          amountKwh: String(amountNum),
        });

        const res = await fetch(`${API_BASE}/orders/min-end-time?${qs.toString()}`);
        const txt = await res.text();

        if (!res.ok) {
          setMinEndMsg(txt || "최소 종료시간 계산 실패");
          return;
        }

        const data = JSON.parse(txt);
        const iso = data.minEndTime; // ex) "2026-01-27T22:30:00"
        if (!iso) return;

        const localVal = iso.slice(0, 16); // datetime-local 포맷(YYYY-MM-DDTHH:mm)
        setMinEndTime(localVal);

        // endTime이 없거나, minEndTime보다 빠르면 자동 보정
        if (!endTime || endTime < localVal) {
          setEndTime(localVal);
        }
      } catch (e) {
        console.error(e);
        setMinEndMsg("서버 연결 실패(최소 종료시간)");
      }
    }

    // 아주 짧은 디바운스(타이핑 중 과호출 방지)
    const t = setTimeout(fetchMinEndTime, 200);
    return () => clearTimeout(t);
  }, [startTime, amount]); // endTime은 의도적으로 제외

  // endTime을 사용자가 바꿀 때도 minEndTime보다 빠르면 막기
  function onChangeEndTime(v) {
    if (minEndTime && v < minEndTime) {
      alert(`종료 시간은 최소 ${minEndTime.replace("T", " ")} 이후여야 합니다.`);
      setEndTime(minEndTime);
      return;
    }
    setEndTime(v);
  }

  async function submitBuyOrder() {
    if (!amount || !price || !startTime || !endTime) {
      alert("모든 값을 입력해주세요.");
      return;
    }

    if (minEndTime && endTime < minEndTime) {
      alert(`종료 시간은 최소 ${minEndTime.replace("T", " ")} 이후여야 합니다.`);
      return;
    }

    const order = {
      orderType: "buy",
      pricePerKwh: Number(price),
      amountKwh: Number(amount),
      startTime: startTime + ":00",
      endTime: endTime + ":00",
      status: "ACTIVE",
      weightPrice: Number(weights.price.toFixed(4)),
      weightDistance: Number(weights.distance.toFixed(4)),
      weightTrust: Number(weights.trust.toFixed(4)),
    };

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: JSON.stringify(order),
      });

      if (res.ok) {
        alert("구매 주문이 등록되었습니다!");
        setAmount("");
        setPrice("");
        setStartTime("");
        setEndTime("");
        setMinEndTime("");
        setMinEndMsg("");
        setWeights(presets.balanced);
      } else {
        const msg = await res.text().catch(() => "");
        alert("주문 등록 실패! " + msg);
      }
    } catch (e) {
      console.error(e);
      alert("서버 연결 실패!");
    }
  }

  return (
    <Layout>
      <div style={container}>
        {/* 헤더 섹션 */}
        <div style={header}>
          <div style={headerContent}>
            <div style={iconWrapper}>
              <span style={icon}>⚡</span>
            </div>
            <div>
              <h1 style={title}>에너지 구매</h1>
              <p style={subtitle}>필요한 에너지를 원하는 가격과 시간에 구매하세요</p>
            </div>
          </div>
        </div>

        {/* 구매 카드 */}
        <div style={cardWrapper}>
          <div style={card}>
            <div style={cardHeader}>
              <h2 style={cardTitle}>구매 정보 입력</h2>
            </div>

            {/* 수량 & 가격 그리드 */}
            <div style={formGrid}>
              <div style={inputGroup}>
                <label style={label}>
                  <span style={labelIcon}>🔋</span>
                  구매 전력량
                </label>
                <div style={inputWrapper}>
                  <input
                    type="number"
                    placeholder="50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={input}
                  />
                  <span style={inputUnit}>kWh</span>
                </div>
              </div>

              <div style={inputGroup}>
                <label style={label}>
                  <span style={labelIcon}>💰</span>
                  희망 구매 가격
                </label>
                <div style={inputWrapper}>
                  <input
                    type="number"
                    placeholder="150"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={input}
                  />
                  <span style={inputUnit}>₩/kWh</span>
                </div>
              </div>
            </div>

            {/* 시간 범위 */}
            <div style={timeSection}>
              <label style={label}>
                <span style={labelIcon}>⏰</span>
                구매 기간 설정
              </label>

              <div style={timeRow}>
                <div style={timeBox}>
                  <span style={timeLabel}>시작 시간</span>
                  <input
                    type="datetime-local"
                    style={timeInput}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div style={arrowIcon}>→</div>

                <div style={timeBox}>
                  <span style={timeLabel}>종료 시간</span>
                  <input
                    type="datetime-local"
                    style={timeInput}
                    value={endTime}
                    min={minEndTime || undefined}   // ✅ 핵심: 최소값 제한
                    onChange={(e) => onChangeEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* ✅ 최소 종료시간 안내 */}
              {(minEndTime || minEndMsg) && (
                <div style={minEndHint}>
                  {minEndTime ? (
                    <>✅ 최소 종료시간: <b>{minEndTime.replace("T", " ")}</b> (7kW 기준 + 버퍼)</>
                  ) : (
                    <>⚠️ {minEndMsg}</>
                  )}
                </div>
              )}
            </div>

            {/* ✅ 매칭 가중치 카드 */}
            <div style={weightCard}>
              <div style={weightTop}>
                <div style={weightTitle}>매칭 기준 설정</div>
                <div style={weightSummary}>{weightSummaryText}</div>
              </div>

              <div style={presetRow}>
                <button style={presetBtn} onClick={() => setWeights(presets.cheap)}>
                  최저가 우선
                </button>
                <button style={presetBtn} onClick={() => setWeights(presets.near)}>
                  가까운 거래
                </button>
                <button style={presetBtn} onClick={() => setWeights(presets.safe)}>
                  안전 우선
                </button>
                <button style={presetBtn} onClick={() => setWeights(presets.balanced)}>
                  기본값
                </button>
              </div>

              <div style={weightGrid}>
                <div style={weightItem}>
                  <div style={weightLabelRow}>
                    <span style={weightLabel}>가격 중요도</span>
                    <span style={weightPct}>{Math.round(weights.price * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weights.price}
                    onChange={(e) => setWeight("price", Number(e.target.value))}
                    style={range}
                  />
                  <div style={weightHint}>가격이 유리한 상대를 더 우선 매칭</div>
                </div>

                <div style={weightItem}>
                  <div style={weightLabelRow}>
                    <span style={weightLabel}>거리 중요도</span>
                    <span style={weightPct}>{Math.round(weights.distance * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weights.distance}
                    onChange={(e) => setWeight("distance", Number(e.target.value))}
                    style={range}
                  />
                  <div style={weightHint}>가까운 상대를 더 우선 매칭</div>
                </div>

                <div style={weightItem}>
                  <div style={weightLabelRow}>
                    <span style={weightLabel}>신뢰 중요도</span>
                    <span style={weightPct}>{Math.round(weights.trust * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weights.trust}
                    onChange={(e) => setWeight("trust", Number(e.target.value))}
                    style={range}
                  />
                  <div style={weightHint}>신뢰도 높은 상대를 더 우선 매칭</div>
                </div>
              </div>

              <div style={weightFootnote}>합계는 자동으로 100%로 맞춰져요.</div>
            </div>

            {/* 예상 금액 카드 */}
            {amount && price && (
              <div style={estimateCard}>
                <div style={estimateRow}>
                  <span style={estimateLabel}>구매 수량</span>
                  <span style={estimateValue}>
                    {parseFloat(amount).toLocaleString()} kWh
                  </span>
                </div>
                <div style={estimateRow}>
                  <span style={estimateLabel}>희망 단가</span>
                  <span style={estimateValue}>₩{parseFloat(price).toLocaleString()}</span>
                </div>
                <div style={estimateDivider} />
                <div style={estimateRow}>
                  <span style={estimateLabelTotal}>예상 결제금액</span>
                  <span style={estimateValueTotal}>
                    ₩{(parseFloat(amount) * parseFloat(price)).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <button style={primaryBtn} onClick={submitBuyOrder}>
              <span style={btnIcon}>✓</span>
              구매 주문 등록하기
            </button>

            <div style={notice}>💡 등록된 주문은 매칭 시스템을 통해 자동으로 거래됩니다</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/* ===== styles ===== */

const container = { padding: "48px 32px", maxWidth: 800, margin: "0 auto" };
const header = { marginBottom: 48 };
const headerContent = { display: "flex", alignItems: "center", gap: 20 };
const iconWrapper = {
  width: 64,
  height: 64,
  borderRadius: 20,
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 8px 24px rgba(59, 130, 246, 0.3)",
};
const icon = { fontSize: 32 };
const title = {
  fontSize: 36,
  fontWeight: 800,
  margin: 0,
  marginBottom: 4,
  background: "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};
const subtitle = { fontSize: 16, color: "#64748b", margin: 0 };
const cardWrapper = { display: "flex", justifyContent: "center" };
const card = {
  background: "white",
  padding: 48,
  borderRadius: 24,
  border: "2px solid #e2e8f0",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
  width: "100%",
  maxWidth: 700,
};
const cardHeader = { marginBottom: 32 };
const cardTitle = { fontSize: 28, fontWeight: 700, margin: 0, color: "#1f2937" };

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 24,
  marginBottom: 28,
};
const inputGroup = { display: "flex", flexDirection: "column" };
const label = {
  display: "flex",
  alignItems: "center",
  fontSize: 14,
  fontWeight: 700,
  color: "#374151",
  marginBottom: 10,
  gap: 6,
};
const labelIcon = { fontSize: 16 };
const inputWrapper = { position: "relative" };
const input = {
  width: "100%",
  padding: "14px 16px",
  paddingRight: "60px",
  fontSize: 16,
  fontWeight: 500,
  border: "2px solid #e5e7eb",
  borderRadius: 12,
  outline: "none",
  transition: "all 0.2s ease",
  boxSizing: "border-box",
};
const inputUnit = {
  position: "absolute",
  right: 16,
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: 13,
  fontWeight: 600,
  color: "#9ca3af",
  pointerEvents: "none",
};

const timeSection = { marginBottom: 20 };
const timeRow = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  gap: 16,
  alignItems: "center",
};
const timeBox = { display: "flex", flexDirection: "column", gap: 8 };
const timeLabel = { fontSize: 13, fontWeight: 600, color: "#6b7280" };
const timeInput = {
  padding: "14px 12px",
  fontSize: 14,
  border: "2px solid #e5e7eb",
  borderRadius: 12,
  outline: "none",
  transition: "all 0.2s ease",
  fontWeight: 500,
  width: "100%",
  boxSizing: "border-box",
};
const arrowIcon = {
  fontSize: 24,
  color: "#3b82f6",
  fontWeight: 700,
  marginTop: 20,
};
const minEndHint = {
  marginTop: 10,
  fontSize: 12,
  color: "#475569",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  padding: "10px 12px",
  borderRadius: 12,
};

const weightCard = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  padding: 18,
  borderRadius: 16,
  marginBottom: 24,
};
const weightTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  marginBottom: 12,
};
const weightTitle = { fontWeight: 900, color: "#0f172a" };
const weightSummary = { fontSize: 12, fontWeight: 800, color: "#64748b" };
const presetRow = { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 };
const presetBtn = {
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "white",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 12,
  color: "#334155",
};
const weightGrid = { display: "grid", gap: 14 };
const weightItem = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 14,
};
const weightLabelRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
};
const weightLabel = { fontSize: 13, fontWeight: 900, color: "#0f172a" };
const weightPct = { fontSize: 12, fontWeight: 900, color: "#2563eb" };
const range = { width: "100%" };
const weightHint = { fontSize: 12, color: "#64748b", marginTop: 6 };
const weightFootnote = { fontSize: 12, color: "#94a3b8", marginTop: 10 };

const estimateCard = {
  background: "#f0f9ff",
  padding: 24,
  borderRadius: 16,
  marginBottom: 24,
  border: "1px solid #bae6fd",
};
const estimateRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};
const estimateLabel = { fontSize: 14, color: "#475569", fontWeight: 600 };
const estimateValue = { fontSize: 15, fontWeight: 700, color: "#0f172a" };
const estimateDivider = { height: 1, background: "#bae6fd", margin: "16px 0" };
const estimateLabelTotal = { fontSize: 15, color: "#0c4a6e", fontWeight: 700 };
const estimateValueTotal = { fontSize: 20, fontWeight: 900, color: "#0c4a6e" };

const primaryBtn = {
  width: "100%",
  padding: "18px 24px",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "white",
  border: "none",
  borderRadius: 14,
  fontWeight: 700,
  fontSize: 17,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: "0 4px 16px rgba(59, 130, 246, 0.3)",
  transition: "all 0.3s ease",
  marginBottom: 20,
};
const btnIcon = { fontSize: 20 };
const notice = {
  fontSize: 13,
  color: "#6b7280",
  textAlign: "center",
  padding: 16,
  background: "#f9fafb",
  borderRadius: 10,
};
