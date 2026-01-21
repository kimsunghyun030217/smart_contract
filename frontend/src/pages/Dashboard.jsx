import Layout from "../components/Layout";

export default function Dashboard() {
  return (
    <Layout>
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800 }}>대시보드 📊</h1>
        <p style={{ color: "#64748b", marginTop: 8 }}>
          에너지 거래 현황을 한눈에 확인하세요.
        </p>

        {/* 여기부터 너 원하는 대시보드 카드 UI 넣으면 됨 */}
        
        <div
          style={{
            marginTop: "32px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "24px",
          }}
        >
          <div style={card}>
            <h3 style={title}>총 판매량</h3>
            <p style={value}>128.4 kWh</p>
          </div>

          <div style={card}>
            <h3 style={title}>총 구매량</h3>
            <p style={value}>94.2 kWh</p>
          </div>

          <div style={card}>
            <h3 style={title}>이번달 수익</h3>
            <p style={value}>₩512,800</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const card = {
  background: "white",
  padding: "24px",
  borderRadius: "16px",
  border: "2px solid #e2e8f0",
};

const title = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#64748b",
};

const value = {
  marginTop: "12px",
  fontSize: "28px",
  fontWeight: 800,
};
