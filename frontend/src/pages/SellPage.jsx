import React, { useState } from "react";
import Layout from "../components/Layout";

export default function SellPage() {
  const [energyData] = useState({
    availableEnergy: 45.8,
    currentPrice: 1600,
    todayEarnings: 12400,
  });

  return (
    <Layout>
      <div style={{ padding: 32 }}>
        <h1>에너지 판매 🔋</h1>
        <p>남는 에너지를 이웃에게 판매하세요</p>

        {/* 판매 정보 카드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 20,
            marginTop: 32,
          }}
        >
          <div style={card}>
            <div style={label}>판매 가능한 에너지</div>
            <div style={value}>{energyData.availableEnergy} kWh</div>
            <div style={desc}>현재 판매 가능</div>
          </div>

          <div style={card}>
            <div style={label}>현재 판매 가격</div>
            <div style={value}>₩{energyData.currentPrice}/kWh</div>
            <div style={desc}>실시간 시장 가격</div>
          </div>

          <div style={card}>
            <div style={label}>오늘 수익</div>
            <div style={value}>
              ₩{energyData.todayEarnings.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: "#10b981", fontWeight: 700 }}>
              ↑ 15.3% 어제 대비
            </div>
          </div>
        </div>

        {/* 판매 액션 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: 24,
            marginTop: 32,
          }}
        >
          {/* 빠른 판매 */}
          <div style={card2}>
            <h3>빠른 판매</h3>
            <p>현재 시장 가격으로 즉시 판매</p>

            <input
              type="number"
              placeholder="판매할 에너지량 (kWh)"
              style={input}
            />

            <div style={priceInfo}>
              예상 수익: ₩
              {(energyData.availableEnergy * energyData.currentPrice).toLocaleString()}
            </div>

            <button
              style={{
                ...primaryBtn,
                background:
                  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              }}
            >
              즉시 판매하기
            </button>
          </div>

          {/* 가격 설정 판매 */}
          <div style={card2}>
            <h3>가격 설정 판매</h3>
            <p>원하는 가격으로 판매 등록</p>

            <input
              type="number"
              placeholder="판매할 에너지량 (kWh)"
              style={input}
            />
            <input
              type="number"
              placeholder="희망 가격 (₩/kWh)"
              style={input}
            />

            <button style={secondaryBtn}>판매 등록하기</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
const card = {
  background: "white",
  padding: 24,
  borderRadius: 16,
  border: "2px solid #e2e8f0"
};

const label = { fontSize: 13, color: "#64748b", fontWeight: 600 };
const value = { fontSize: 32, fontWeight: 800, color: "#0f172a" };
const desc = { fontSize: 13, color: "#94a3b8" };

const card2 = {
  background: "white",
  padding: 32,
  borderRadius: 16,
  border: "2px solid #e2e8f0"
};

const input = {
  padding: "12px 14px",
  fontSize: 15,
  border: "2px solid #e2e8f0",
  borderRadius: 12,
  marginBottom: 12
};

const priceInfo = {
  background: "#f8fafc",
  padding: 12,
  borderRadius: 10,
  marginBottom: 16,
  fontWeight: 600
};

const primaryBtn = {
  width: "100%",
  padding: 16,
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "white",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer"
};

const secondaryBtn = {
  width: "100%",
  padding: 16,
  background: "white",
  border: "2px solid #e2e8f0",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer"
};
