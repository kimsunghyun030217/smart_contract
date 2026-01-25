import Layout from "../components/Layout";

export default function Dashboard() {
  // ✅ PoC 임시 데이터 (나중에 API로 교체)
  const stats = [
    { label: "총 판매량", value: "128.400", unit: "kWh", hint: "누적", icon: "⚡" },
    { label: "총 구매량", value: "94.200", unit: "kWh", hint: "누적", icon: "🛒" },
    { label: "잠금 금액", value: "₩80,000", unit: "", hint: "BUY 예약", icon: "🔒" },
    { label: "이번달 정산", value: "₩512,800", unit: "", hint: "예상", icon: "💸" },
  ];

  const recentTrades = [
    { id: 31, type: "BUY", amount: "1.000 kWh", price: "₩80/kWh", status: "MATCHED", time: "방금" },
    { id: 30, type: "SELL", amount: "2.500 kWh", price: "₩75/kWh", status: "COMPLETED", time: "12분 전" },
    { id: 29, type: "BUY", amount: "1.200 kWh", price: "₩78/kWh", status: "ACTIVE", time: "1시간 전" },
  ];

  return (
    <Layout>
      <div style={page}>
        {/* 헤더 */}
        <div style={header}>
          <div>
            <h1 style={h1}>대시보드</h1>
            <p style={sub}>
              에너지 거래 현황을 한눈에 확인하세요.
            </p>
          </div>

          <div style={headerRight}>
            <button style={primaryBtn}>주문 넣기</button>
            <button style={ghostBtn}>새로고침</button>
          </div>
        </div>

        {/* 요약 카드 */}
        <div style={statGrid}>
          {stats.map((s) => (
            <div key={s.label} style={statCard}>
              <div style={statTop}>
                <div style={statIcon}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={statLabel}>{s.label}</div>
                  <div style={statHint}>{s.hint}</div>
                </div>
              </div>

              <div style={statValueRow}>
                <div style={statValue}>{s.value}</div>
                {s.unit ? <div style={statUnit}>{s.unit}</div> : null}
              </div>
            </div>
          ))}
        </div>

        {/* 본문 2열 */}
        <div style={grid2}>
          {/* 왼쪽: 최근 거래 */}
          <div style={panel}>
            <div style={panelHeader}>
              <div style={panelTitle}>최근 활동</div>
              <div style={panelDesc}>최근 주문/체결 상태</div>
            </div>

            <div style={list}>
              {recentTrades.map((t) => (
                <div key={t.id} style={row}>
                  <div style={rowLeft}>
                    <div style={pill(t.type === "BUY" ? "blue" : "green")}>
                      {t.type}
                    </div>
                    <div>
                      <div style={rowMain}>
                        {t.amount} · {t.price}
                      </div>
                      <div style={rowSub}>#{t.id} · {t.time}</div>
                    </div>
                  </div>

                  <div style={rowRight}>
                    <div style={statusBadge(t.status)}>{t.status}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={panelFooter}>
              <button style={ghostBtn}>전체 보기</button>
            </div>
          </div>

          {/* 오른쪽: 안내/퀵 액션 */}
          <div style={panel}>
            <div style={panelHeader}>
              <div style={panelTitle}>빠른 액션</div>
              <div style={panelDesc}>PoC 운영에 필요한 버튼</div>
            </div>

            <div style={quickGrid}>
              <button style={quickCard}>
                <div style={quickIcon}>🤝</div>
                <div style={quickText}>
                  <div style={quickTitle}>매칭 상태 확인</div>
                  <div style={quickSub}>ACTIVE → MATCHED 자동 반영</div>
                </div>
              </button>

              <button style={quickCard}>
                <div style={quickIcon}>💰</div>
                <div style={quickText}>
                  <div style={quickTitle}>지갑 확인</div>
                  <div style={quickSub}>total / locked 표시</div>
                </div>
              </button>

              <button style={quickCard}>
                <div style={quickIcon}>✅</div>
                <div style={quickText}>
                  <div style={quickTitle}>거래 완료 처리</div>
                  <div style={quickSub}>MATCHED → COMPLETED</div>
                </div>
              </button>

              <button style={quickCard}>
                <div style={quickIcon}>🧪</div>
                <div style={quickText}>
                  <div style={quickTitle}>테스트 데이터</div>
                  <div style={quickSub}>샘플 주문 생성</div>
                </div>
              </button>
            </div>

            <div style={note}>
              <div style={noteTitle}>PoC 팁</div>
              <div style={noteBody}>
                지금은 정산/이행이 실제로 연결되지 않으니, <b>상태 전환</b>과 <b>로그</b>를 중심으로 흐름을 검증하는 게 좋아.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/* ---------------- styles ---------------- */

const page = {
  padding: 28,
  maxWidth: 1100,
};

const header = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 16,
};

const h1 = {
  fontSize: 34,
  fontWeight: 900,
  margin: 0,
  letterSpacing: -0.5,
};

const sub = {
  marginTop: 8,
  marginBottom: 0,
  color: "#64748b",
  fontSize: 14,
};

const headerRight = {
  display: "flex",
  gap: 10,
};

const primaryBtn = {
  background: "#0f172a",
  color: "white",
  border: "1px solid #0f172a",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const ghostBtn = {
  background: "white",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const statGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
};

const statCard = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 1px 0 rgba(15, 23, 42, 0.02)",
};

const statTop = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const statIcon = {
  width: 36,
  height: 36,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  background: "#f1f5f9",
  fontSize: 18,
};

const statLabel = {
  fontSize: 13,
  fontWeight: 900,
  color: "#0f172a",
};

const statHint = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 2,
};

const statValueRow = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  marginTop: 14,
};

const statValue = {
  fontSize: 26,
  fontWeight: 900,
  letterSpacing: -0.3,
  color: "#0f172a",
};

const statUnit = {
  fontSize: 13,
  fontWeight: 800,
  color: "#64748b",
};

const grid2 = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "1.3fr 1fr",
  gap: 14,
};

const panel = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  overflow: "hidden",
};

const panelHeader = {
  padding: 16,
  borderBottom: "1px solid #eef2f7",
};

const panelTitle = {
  fontSize: 15,
  fontWeight: 900,
  color: "#0f172a",
};

const panelDesc = {
  marginTop: 6,
  fontSize: 12,
  color: "#64748b",
};

const list = {
  padding: 8,
};

const row = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #eef2f7",
  marginBottom: 8,
};

const rowLeft = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const rowMain = {
  fontSize: 14,
  fontWeight: 900,
  color: "#0f172a",
};

const rowSub = {
  marginTop: 4,
  fontSize: 12,
  color: "#64748b",
};

const rowRight = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const pill = (tone) => {
  const map = {
    blue: { bg: "#eff6ff", fg: "#1d4ed8", bd: "#bfdbfe" },
    green: { bg: "#ecfdf5", fg: "#047857", bd: "#bbf7d0" },
  };
  const t = map[tone] || map.blue;
  return {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    background: t.bg,
    color: t.fg,
    border: `1px solid ${t.bd}`,
    minWidth: 52,
    textAlign: "center",
  };
};

const statusBadge = (s) => {
  const map = {
    ACTIVE: { bg: "#f8fafc", fg: "#334155", bd: "#e2e8f0" },
    MATCHED: { bg: "#fff7ed", fg: "#c2410c", bd: "#fed7aa" },
    COMPLETED: { bg: "#ecfdf5", fg: "#047857", bd: "#bbf7d0" },
    EXPIRED: { bg: "#fef2f2", fg: "#b91c1c", bd: "#fecaca" },
  };
  const t = map[s] || map.ACTIVE;
  return {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    background: t.bg,
    color: t.fg,
    border: `1px solid ${t.bd}`,
  };
};

const panelFooter = {
  padding: 14,
  borderTop: "1px solid #eef2f7",
  display: "flex",
  justifyContent: "flex-end",
};

const quickGrid = {
  padding: 12,
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 10,
};

const quickCard = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  width: "100%",
  textAlign: "left",
  background: "white",
  border: "1px solid #eef2f7",
  borderRadius: 14,
  padding: 12,
  cursor: "pointer",
};

const quickIcon = {
  width: 36,
  height: 36,
  borderRadius: 12,
  background: "#f1f5f9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
};

const quickText = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const quickTitle = {
  fontSize: 13,
  fontWeight: 900,
  color: "#0f172a",
};

const quickSub = {
  fontSize: 12,
  color: "#64748b",
};

const note = {
  margin: 12,
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  padding: 12,
};

const noteTitle = {
  fontSize: 13,
  fontWeight: 900,
  color: "#0f172a",
};

const noteBody = {
  marginTop: 8,
  fontSize: 12,
  color: "#475569",
  lineHeight: 1.5,
};
