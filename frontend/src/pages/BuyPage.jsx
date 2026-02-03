import React, { useMemo, useState, useEffect } from "react";
import Layout from "../components/Layout";
import { getMarket } from "../web3/market"; // ✅ 추가: 온체인 호출

const API_BASE = "http://localhost:8080"; // ✅ (선택) 최소 종료시간 계산용 백엔드

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
  // ✅ 최소 종료시간(minEndTime) 조회 (백엔드)
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
        const iso = data.minEndTime;
        if (!iso) return;

        const localVal = iso.slice(0, 16); // YYYY-MM-DDTHH:mm
        setMinEndTime(localVal);

        if (!endTime || endTime < localVal) {
          setEndTime(localVal);
        }
      } catch (e) {
        console.error(e);
        setMinEndMsg("서버 연결 실패(최소 종료시간)");
      }
    }

    const t = setTimeout(fetchMinEndTime, 200);
    return () => clearTimeout(t);
  }, [startTime, amount]); // endTime 제외(의도)

  function onChangeEndTime(v) {
    if (minEndTime && v < minEndTime) {
      alert(`종료 시간은 최소 ${minEndTime.replace("T", " ")} 이후여야 합니다.`);
      setEndTime(minEndTime);
      return;
    }
    setEndTime(v);
  }

  // =========================================
  // ✅ 온체인 BUY 주문 등록
  // - side = 0 (BUY)
  // - fund()로 PoC 가상 KRW 충전(부족하면 자동 충전)
  // - createOrder() 트랜잭션 전송
  // =========================================
  async function submitBuyOrder() {
    try {
      if (!amount || !price || !startTime || !endTime) {
        alert("모든 값을 입력해주세요.");
        return;
      }

      if (minEndTime && endTime < minEndTime) {
        alert(`종료 시간은 최소 ${minEndTime.replace("T", " ")} 이후여야 합니다.`);
        return;
      }

      // 컨트랙트는 uint256이라 PoC에서는 정수로만 처리 권장
      const amountInt = Math.floor(Number(amount));
      const priceInt = Math.floor(Number(price));

      if (!Number.isFinite(amountInt) || amountInt <= 0) {
        alert("구매 전력량(kWh)은 1 이상 정수로 입력해주세요.");
        return;
      }
      if (!Number.isFinite(priceInt) || priceInt <= 0) {
        alert("가격(₩/kWh)은 1 이상 정수로 입력해주세요.");
        return;
      }

      // datetime-local -> unix seconds
      const startSec = Math.floor(new Date(startTime).getTime() / 1000);
      const endSec = Math.floor(new Date(endTime).getTime() / 1000);
      const nowSec = Math.floor(Date.now() / 1000);

      if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
        alert("시간 형식이 올바르지 않습니다.");
        return;
      }
      if (startSec >= endSec) {
        alert("종료 시간은 시작 시간 이후여야 합니다.");
        return;
      }
      if (endSec <= nowSec) {
        alert("종료 시간은 현재보다 미래여야 합니다.");
        return;
      }

      const market = await getMarket();

      // signer 주소
      const addr =
        market?.runner?.getAddress ? await market.runner.getAddress() : null;

      // 비용 = amount * price
      const cost = BigInt(amountInt) * BigInt(priceInt);

      // 현재 가상 KRW 잔고/잠금 조회해서 부족하면 자동 fund
      if (addr) {
        const bal = await market.krwBalance(addr);   // bigint
        const locked = await market.krwLocked(addr); // bigint
        const available = bal - locked;

        if (available < cost) {
          const need = cost - available;
          // PoC: 부족분만큼 자동 충전
          const txFund = await market.fund(need, 0);
          await txFund.wait();
        }
      } else {
        // 주소 못 가져오면 그냥 넉넉히 충전(최후수단)
        const txFund = await market.fund(cost, 0);
        await txFund.wait();
      }

      // BUY=0
      const tx = await market.createOrder(
        0,
        BigInt(amountInt),
        BigInt(priceInt),
        BigInt(startSec),
        BigInt(endSec)
      );

      const receipt = await tx.wait();

      // 주문 id는 nextOrderId() - 1 로 추정(트랜잭션 완료 후)
      const nextId = await market.nextOrderId();
      const createdId = (BigInt(nextId) - 1n).toString();

      alert(
        `✅ 온체인 구매 주문 등록 완료!\n주문ID: ${createdId}\nTx: ${receipt?.hash || tx.hash}`
      );

      // 폼 리셋
      setAmount("");
      setPrice("");
      setStartTime("");
      setEndTime("");
      setMinEndTime("");
      setMinEndMsg("");
      setWeights(presets.balanced);
    } catch (e) {
      console.error(e);

      // 메타마스크 거절/리버트 메시지 간단 처리
      const msg =
        e?.shortMessage ||
        e?.reason ||
        e?.message ||
        "알 수 없는 오류";
      alert("❌ 온체인 주문 등록 실패!\n" + msg);
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
              <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 12 }}>
                ※ PoC: 주문 등록은 <b>온체인(createOrder)</b>으로 처리됩니다. (가중치/최소종료시간은 화면 편의용)
              </p>
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
                    min={minEndTime || undefined}
                    onChange={(e) => onChangeEndTime(e.target.value)}
                  />
                </div>
              </div>

              {(minEndTime || minEndMsg) && (
                <div style={minEndHint}>
                  {minEndTime ? (
                    <>
                      ✅ 최소 종료시간: <b>{minEndTime.replace("T", " ")}</b> (7kW 기준 + 버퍼)
                    </>
                  ) : (
                    <>⚠️ {minEndMsg}</>
                  )}
                </div>
              )}
            </div>

            {/* ✅ 매칭 가중치 카드 (PoC에서는 온체인 저장 안 함) */}
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

              <div style={weightFootnote}>
                합계는 자동으로 100%로 맞춰져요. (PoC: 이 값은 온체인에 저장되지 않아요)
              </div>
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

            {/* ✅ 버튼: 백엔드 POST 대신 온체인 트랜잭션 */}
            <button style={primaryBtn} onClick={submitBuyOrder}>
              <span style={btnIcon}>✓</span>
              구매 주문 등록하기 (온체인)
            </button>

            <div style={notice}>💡 PoC: 주문은 블록체인에 기록됩니다. (메타마스크 서명 필요)</div>
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
