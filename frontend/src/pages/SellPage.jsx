import React, { useState } from "react";
import Layout from "../components/Layout";

export default function SellPage() {
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  async function submitSellOrder() {
    if (!amount || !price || !startTime || !endTime) {
      alert("모든 값을 입력해주세요.");
      return;
    }

    const order = {
      orderType: "sell",
      pricePerKwh: Number(price),
      amountKwh: Number(amount),
      startTime: startTime + ":00",
      endTime: endTime + ":00"
    };

    try {
      const res = await fetch("http://localhost:8080/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" ,"Authorization": "Bearer " + localStorage.getItem("token")},
        body: JSON.stringify(order),
      });

      if (res.ok) {
        alert("판매 주문이 등록되었습니다!");
        setAmount("");
        setPrice("");
        setStartTime("");
        setEndTime("");
      } else {
        alert("주문 등록 실패!");
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
              <span style={icon}>💰</span>
            </div>
            <div>
              <h1 style={title}>에너지 판매</h1>
              <p style={subtitle}>필요한 에너지를 원하는 가격과 시간에 판매하세요</p>
            </div>
          </div>
        </div>

        {/* 판매 카드 */}
        <div style={cardWrapper}>
          <div style={card}>
            <div style={cardHeader}>
              <h2 style={cardTitle}>판매 정보 입력</h2>
            </div>

            {/* 수량 & 가격 그리드 */}
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

            {/* 시간 범위 */}
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
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 예상 금액 카드 */}
            {amount && price && (
              <div style={estimateCard}>
                <div style={estimateRow}>
                  <span style={estimateLabel}>판매 수량</span>
                  <span style={estimateValue}>{parseFloat(amount).toLocaleString()} kWh</span>
                </div>
                <div style={estimateRow}>
                  <span style={estimateLabel}>희망 단가</span>
                  <span style={estimateValue}>₩{parseFloat(price).toLocaleString()}</span>
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

            <button
              style={primaryBtn}
              onClick={submitSellOrder}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 16px rgba(16, 185, 129, 0.3)";
              }}
            >
              <span style={btnIcon}>✓</span>
              판매 주문 등록하기
            </button>

            <div style={notice}>
              💡 등록된 주문은 매칭 시스템을 통해 자동으로 거래됩니다
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const container = {
  padding: "48px 32px",
  maxWidth: 800,
  margin: "0 auto",
};

const header = {
  marginBottom: 48,
};

const headerContent = {
  display: "flex",
  alignItems: "center",
  gap: 20,
};

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

const icon = {
  fontSize: 32,
};

const title = {
  fontSize: 36,
  fontWeight: 800,
  margin: 0,
  marginBottom: 4,
  background: "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitle = {
  fontSize: 16,
  color: "#64748b",
  margin: 0,
};

const cardWrapper = {
  display: "flex",
  justifyContent: "center",
};

const card = {
  background: "white",
  padding: 48,
  borderRadius: 24,
  border: "2px solid #e2e8f0",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
  width: "100%",
  maxWidth: 700,
};

const cardHeader = {
  marginBottom: 32,
};

const cardTitle = {
  fontSize: 28,
  fontWeight: 700,
  margin: 0,
  color: "#1f2937",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 24,
  marginBottom: 28,
};

const inputGroup = {
  display: "flex",
  flexDirection: "column",
};

const label = {
  display: "flex",
  alignItems: "center",
  fontSize: 14,
  fontWeight: 700,
  color: "#374151",
  marginBottom: 10,
  gap: 6,
};

const labelIcon = {
  fontSize: 16,
};

const inputWrapper = {
  position: "relative",
};

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

const timeSection = {
  marginBottom: 32,
};

const timeRow = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  gap: 16,
  alignItems: "center",
};

const timeBox = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const timeLabel = {
  fontSize: 13,
  fontWeight: 600,
  color: "#6b7280",
};

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
  color: "#10b981",
  fontWeight: 700,
  marginTop: 20,
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

const estimateLabel = {
  fontSize: 14,
  color: "#475569",
  fontWeight: 600,
};

const estimateValue = {
  fontSize: 15,
  fontWeight: 700,
  color: "#0f172a",
};

const estimateDivider = {
  height: 1,
  background: "#a7f3d0",
  margin: "16px 0",
};

const estimateLabelTotal = {
  fontSize: 15,
  color: "#065f46",
  fontWeight: 700,
};

const estimateValueTotal = {
  fontSize: 20,
  fontWeight: 900,
  color: "#065f46",
};

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

const btnIcon = {
  fontSize: 20,
};

const notice = {
  fontSize: 13,
  color: "#6b7280",
  textAlign: "center",
  padding: 16,
  background: "#f9fafb",
  borderRadius: 10,
};