import React, { useState } from "react";
import Layout from "../components/Layout";

export default function BuyPage() {
  const [energyData] = useState({
    demandEnergy: 32.4,
    currentPrice: 1600,
    estimatedCost: 51840,
  });

  return (
    <Layout>
      <div style={{ padding: 32 }}>
        <h1>에너지 구매 ⚡</h1>
        <p>필요한 에너지를 저렴하게 구매하세요</p>

        {/* 구매 정보 카드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 20,
            marginTop: 32,
          }}
        >
          <div style={card}>
            <div style={label}>필요한 에너지</div>
            <div style={value}>{energyData.demandEnergy} kWh</div>
            <div style={desc}>이번 주 예상 필요량</div>
          </div>

          <div style={card}>
            <div style={label}>현재 구매 가격</div>
            <div style={value}>₩{energyData.currentPrice}/kWh</div>
            <div style={desc}>실시간 시장 가격</div>
          </div>

          <div style={card}>
            <div style={label}>예상 비용</div>
            <div style={value}>
              ₩{energyData.estimatedCost.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: "#3b82f6", fontWeight: 700 }}>
              ↓ 8.2% 지난주 대비
            </div>
          </div>
        </div>

        {/* 구매 액션 섹션 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: 24,
            marginTop: 32,
          }}
        >
          {/* 빠른 구매 */}
          <div style={card2}>
            <h3>빠른 구매</h3>
            <p>현재 시장 가격으로 즉시 구매</p>

            <input
              type="number"
              placeholder="구매할 에너지량 (kWh)"
              style={input}
            />

            <div style={priceInfo}>
              예상 비용: ₩
              {(energyData.demandEnergy * energyData.currentPrice).toLocaleString()}
            </div>

            <button
              style={{
                ...primaryBtn,
                background:
                  "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              }}
            >
              즉시 구매하기
            </button>
          </div>

          {/* 가격 설정 구매 */}
          <div style={card2}>
            <h3>가격 설정 구매</h3>
            <p>원하는 가격으로 구매 주문</p>

            <input
              type="number"
              placeholder="구매할 에너지량 (kWh)"
              style={input}
            />
            <input
              type="number"
              placeholder="희망 가격 (₩/kWh)"
              style={input}
            />

            <button style={secondaryBtn}>구매 주문하기</button>
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
