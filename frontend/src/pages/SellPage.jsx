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
      <div style={pageContainer}>
        {/* 좌측 헤더 영역 */}
        <div style={leftSection}>
          <div style={headerContent}>
            <div style={iconLarge}>⚡</div>
            <h1 style={mainTitle}>에너지 판매 등록</h1>
            <p style={mainSubtitle}>
              남는 전력을 거래소에 등록하고<br />
              수익을 창출하세요
            </p>
            
            {amount && price && (
              <div style={estimateCard}>
                <div style={estimateTitle}>예상 수익</div>
                <div style={estimateAmount}>
                  ₩{(Number(amount) * Number(price)).toLocaleString()}
                </div>
                <div style={estimateDetail}>
                  {amount}kWh × ₩{Number(price).toLocaleString()}/kWh
                </div>
              </div>
            )}

            <div style={infoBox}>
              <div style={infoItem}>
                <span style={infoIcon}>📊</span>
                <div>
                  <div style={infoLabel}>평균 거래가</div>
                  <div style={infoValue}>₩145/kWh</div>
                </div>
              </div>
              <div style={infoItem}>
                <span style={infoIcon}>🔥</span>
                <div>
                  <div style={infoLabel}>오늘 거래량</div>
                  <div style={infoValue}>1,247kWh</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 우측 폼 영역 */}
        <div style={rightSection}>
          <div style={formCard}>
            <h2 style={formTitle}>판매 정보 입력</h2>
            
            <div style={formGrid}>
              {/* 전력량 */}
              <div style={inputGroup}>
                <label style={label}>
                  <span style={labelIcon}>🔋</span>
                  판매 전력량
                </label>
                <div style={inputWrapper}>
                  <input
                    type="number"
                    placeholder="50"
                    style={input}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span style={unit}>kWh</span>
                </div>
              </div>

              {/* 단가 */}
              <div style={inputGroup}>
                <label style={label}>
                  <span style={labelIcon}>💰</span>
                  희망 판매 가격
                </label>
                <div style={inputWrapper}>
                  <input
                    type="number"
                    placeholder="150"
                    style={input}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <span style={unit}>₩/kWh</span>
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

            {/* 제출 버튼 */}
            <button style={submitBtn} onClick={submitSellOrder}>
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

// 스타일
const pageContainer = {
  display: "grid",
  gridTemplateColumns: "45% 55%",
  minHeight: "100vh",
  background: "#f8fafc",
};

const leftSection = {
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  padding: "80px 60px",
  display: "flex",
  alignItems: "center",
  color: "white",
};

const headerContent = {
  maxWidth: 480,
};

const iconLarge = {
  fontSize: 72,
  marginBottom: 24,
};

const mainTitle = {
  fontSize: 48,
  fontWeight: 800,
  margin: "0 0 16px 0",
  lineHeight: 1.2,
  letterSpacing: "-1px",
};

const mainSubtitle = {
  fontSize: 18,
  lineHeight: 1.6,
  opacity: 0.95,
  marginBottom: 40,
};

const estimateCard = {
  background: "rgba(255,255,255,0.15)",
  backdropFilter: "blur(10px)",
  padding: 28,
  borderRadius: 20,
  border: "2px solid rgba(255,255,255,0.2)",
  marginBottom: 32,
};

const estimateTitle = {
  fontSize: 14,
  fontWeight: 600,
  opacity: 0.9,
  marginBottom: 8,
};

const estimateAmount = {
  fontSize: 42,
  fontWeight: 800,
  marginBottom: 8,
  letterSpacing: "-1px",
};

const estimateDetail = {
  fontSize: 14,
  opacity: 0.8,
};

const infoBox = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const infoItem = {
  background: "rgba(255,255,255,0.1)",
  padding: 20,
  borderRadius: 16,
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const infoIcon = {
  fontSize: 28,
};

const infoLabel = {
  fontSize: 13,
  opacity: 0.85,
  marginBottom: 4,
};

const infoValue = {
  fontSize: 20,
  fontWeight: 700,
};

const rightSection = {
  padding: "80px 60px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const formCard = {
  width: "100%",
  maxWidth: 600,
  background: "white",
  padding: 48,
  borderRadius: 24,
  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
};

const formTitle = {
  fontSize: 28,
  fontWeight: 700,
  color: "#1f2937",
  marginBottom: 32,
  marginTop: 0,
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
  display: "flex",
  alignItems: "center",
};

const input = {
  width: "100%",
  padding: "14px 16px",
  fontSize: 16,
  border: "2px solid #e5e7eb",
  borderRadius: 12,
  outline: "none",
  transition: "all 0.2s ease",
  fontWeight: 500,
  boxSizing: "border-box",
};

const unit = {
  position: "absolute",
  right: 16,
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
};

const arrowIcon = {
  fontSize: 24,
  color: "#10b981",
  fontWeight: 700,
  marginTop: 20,
};

const submitBtn = {
  width: "100%",
  padding: "18px 24px",
  fontSize: 17,
  fontWeight: 700,
  color: "white",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  border: "none",
  borderRadius: 14,
  cursor: "pointer",
  transition: "all 0.3s ease",
  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
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
