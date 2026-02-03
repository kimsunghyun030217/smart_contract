import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getMarket } from "../web3/market"; // ✅ 추가: 온체인 호출

const API_BASE = "http://localhost:8080"; // ✅ (선택) 최소 종료시간 계산용 백엔드

export default function SellPage() {
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // ✅ 최소 종료시간 표시용
  const [minEndTime, setMinEndTime] = useState("");
  const [minEndMsg, setMinEndMsg] = useState("");

  // =========================================
  // ✅ [유지] 최소 종료시간(minEndTime) 조회 (백엔드)
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

        const localVal = iso.slice(0, 16);
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
  }, [startTime, amount]);

  function onChangeEndTime(v) {
    if (minEndTime && v < minEndTime) {
      alert(`종료 시간은 최소 ${minEndTime.replace("T", " ")} 이후여야 합니다.`);
      setEndTime(minEndTime);
      return;
    }
    setEndTime(v);
  }

  // =========================================
  // ✅ 온체인 SELL 주문 등록
  // - side = 1 (SELL)
  // - fund()로 PoC 가상 kWh 충전(부족하면 자동 충전)
  // - createOrder() 트랜잭션 전송
  // =========================================
  async function submitSellOrder() {
    try {
      if (!amount || !price || !startTime || !endTime) {
        alert("모든 값을 입력해주세요.");
        return;
      }

      if (minEndTime && endTime < minEndTime) {
        alert(`종료 시간은 최소 ${minEndTime.replace("T", " ")} 이후여야 합니다.`);
        return;
      }

      // 컨트랙트는 uint256이라 PoC에서는 정수로 처리 권장
      const amountInt = Math.floor(Number(amount));
      const priceInt = Math.floor(Number(price));

      if (!Number.isFinite(amountInt) || amountInt <= 0) {
        alert("판매 전력량(kWh)은 1 이상 정수로 입력해주세요.");
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

      const needKwh = BigInt(amountInt);

      // 현재 가상 kWh 잔고/잠금 조회해서 부족하면 자동 fund
      if (addr) {
        const bal = await market.kwhBalance(addr);    // bigint
        const locked = await market.kwhLocked(addr);  // bigint
        const available = bal - locked;

        if (available < needKwh) {
          const add = needKwh - available;
          // PoC: 부족분만큼 자동 충전
          const txFund = await market.fund(0, add);
          await txFund.wait();
        }
      } else {
        // 주소 못 가져오면 그냥 필요량만큼 충전(최후수단)
        const txFund = await market.fund(0, needKwh);
        await txFund.wait();
      }

      // SELL=1
      const tx = await market.createOrder(
        1,
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
        `✅ 온체인 판매 주문 등록 완료!\n주문ID: ${createdId}\nTx: ${receipt?.hash || tx.hash}`
      );

      // 폼 리셋
      setAmount("");
      setPrice("");
      setStartTime("");
      setEndTime("");
      setMinEndTime("");
      setMinEndMsg("");
    } catch (e) {
      console.error(e);
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
        <div style={header}>
          <div style={headerContent}>
            <div style={iconWrapper}>
              <span style={icon}>💰</span>
            </div>
            <div>
              <h1 style={title}>에너지 판매</h1>
              <p style={subtitle}>필요한 에너지를 원하는 가격과 시간에 판매하세요</p>
              <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 12 }}>
                ※ PoC: 주문 등록은 <b>온체인(createOrder)</b>으로 처리됩니다. (최소종료시간은 화면 편의용)
              </p>
            </div>
          </div>
        </div>

        <div style={cardWrapper}>
          <div style={card}>
            <div style={cardHeader}>
              <h2 style={cardTitle}>판매 정보 입력</h2>
            </div>

            <div style={formGrid}>
              <div style={inputGroup}>
                <label style={label}>
                  <span style={labelIcon}>🔋</span>
                  판매 전력량
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
                  희망 판매 가격
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

            <div style={timeSection}>
              <label style={label}>
                <span style={labelIcon}>⏰</span>
                판매 기간 설정
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

            {amount && price && (
              <div style={estimateCard}>
                <div style={estimateRow}>
                  <span style={estimateLabel}>판매 수량</span>
                  <span style={estimateValue}>
                    {parseFloat(amount).toLocaleString()} kWh
                  </span>
                </div>
                <div style={estimateRow}>
                  <span style={estimateLabel}>희망 단가</span>
                  <span style={estimateValue}>
                    ₩{parseFloat(price).toLocaleString()}
                  </span>
                </div>
                <div style={estimateDivider} />
                <div style={estimateRow}>
                  <span style={estimateLabelTotal}>예상 수익</span>
                  <span style={estimateValueTotal}>
                    ₩{(parseFloat(amount) * parseFloat(price)).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <button style={primaryBtn} onClick={submitSellOrder}>
              <span style={btnIcon}>✓</span>
              판매 주문 등록하기 (온체인)
            </button>

            <div style={notice}>💡 PoC: 주문은 블록체인에 기록됩니다. (메타마스크 서명 필요)</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/* ===== styles (원본 유지 + minEndHint만 추가) ===== */

const container = { padding: "48px 32px", maxWidth: 800, margin: "0 auto" };
const header = { marginBottom: 48 };
const headerContent = { display: "flex", alignItems: "center", gap: 20 };
const iconWrapper = {
  width: 64,
  height: 64,
  borderRadius: 20,
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 8px 24px rgba(16, 185, 129, 0.3)",
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

const timeSection = { marginBottom: 32 };
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
const arrowIcon = { fontSize: 24, color: "#10b981", fontWeight: 700, marginTop: 20 };

const minEndHint = {
  marginTop: 10,
  fontSize: 12,
  color: "#475569",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  padding: "10px 12px",
  borderRadius: 12,
};

const estimateCard = {
  background: "#ecfdf5",
  padding: 24,
  borderRadius: 16,
  marginBottom: 24,
  border: "1px solid #a7f3d0",
};
const estimateRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};
const estimateLabel = { fontSize: 14, color: "#475569", fontWeight: 600 };
const estimateValue = { fontSize: 15, fontWeight: 700, color: "#0f172a" };
const estimateDivider = { height: 1, background: "#a7f3d0", margin: "16px 0" };
const estimateLabelTotal = { fontSize: 15, color: "#065f46", fontWeight: 700 };
const estimateValueTotal = { fontSize: 20, fontWeight: 900, color: "#065f46" };

const primaryBtn = {
  width: "100%",
  padding: "18px 24px",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
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
  boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3)",
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
