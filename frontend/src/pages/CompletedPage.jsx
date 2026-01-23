import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";

export default function CompletedPage() {
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setErr("");
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:8080/orders/completed", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : [];

      if (!res.ok) throw new Error(text || "fetch failed");
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "거래내역 불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ✅ COMPLETED만 노출
  const completedOrders = useMemo(() => {
    return orders.filter((o) => String(o.status || "").toUpperCase() === "COMPLETED");
  }, [orders]);

  const summary = useMemo(() => {
    const total = completedOrders.length;
    const buy = completedOrders.filter((o) => o.orderType === "buy").length;
    const sell = completedOrders.filter((o) => o.orderType === "sell").length;
    return { total, buy, sell };
  }, [completedOrders]);

  const formatDT = (v) => String(v || "").replace("T", " ");

  const badge = (type) => {
    const isBuy = type === "buy";
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "6px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 800,
          border: "1px solid #e2e8f0",
          background: isBuy ? "rgba(59,130,246,0.10)" : "rgba(16,185,129,0.10)",
          color: isBuy ? "#2563eb" : "#059669",
          letterSpacing: "0.2px",
        }}
      >
        {isBuy ? "구매" : "판매"}
      </span>
    );
  };

  // ✅ COMPLETED는 “완료”로 고정 노출
  const statusPill = () => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        border: "1px solid #e2e8f0",
        background: "rgba(139,92,246,0.10)",
        color: "#7c3aed",
      }}
    >
      완료
    </span>
  );

  return (
    <Layout>
      <div style={{ padding: 32 }}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>거래완료 내역 ✅</h1>
          <p style={styles.headerSubtitle}>완료(COMPLETED)된 거래만 표시돼요</p>
        </div>

        {/* 요약 */}
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>완료 거래</div>
            <div style={styles.summaryValue}>{summary.total}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>구매 완료</div>
            <div style={styles.summaryValue}>{summary.buy}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>판매 완료</div>
            <div style={styles.summaryValue}>{summary.sell}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTop}>
            <h3 style={styles.cardTitle}>완료 거래 목록</h3>
            <button onClick={load} style={styles.refreshBtn}>
              새로고침
            </button>
          </div>

          {loading && <div style={{ color: "#64748b" }}>불러오는 중...</div>}
          {err && <div style={{ color: "#ef4444", marginTop: 8 }}>{err}</div>}

          {!loading && !err && completedOrders.length === 0 && (
            <div style={{ color: "#94a3b8", padding: "14px 0" }}>
              완료된 거래가 아직 없어요.
            </div>
          )}

          {!loading && !err && completedOrders.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>구분</th>
                    <th style={styles.thRight}>수량(kWh)</th>
                    <th style={styles.thRight}>가격(₩/kWh)</th>
                    <th style={styles.th}>시작</th>
                    <th style={styles.th}>종료</th>
                    <th style={styles.th}>상태</th>
                    <th style={styles.th}>등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrders.map((o) => (
                    <tr key={o.id} style={styles.tr}>
                      <td style={styles.td}>{badge(o.orderType)}</td>
                      <td style={styles.tdRight}>{o.amountKwh}</td>
                      <td style={styles.tdRight}>{o.pricePerKwh}</td>
                      <td style={styles.td}>{formatDT(o.startTime)}</td>
                      <td style={styles.td}>{formatDT(o.endTime)}</td>
                      <td style={styles.td}>{statusPill()}</td>
                      <td style={styles.td}>{formatDT(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" },
  headerSubtitle: { fontSize: 16, color: "#64748b", margin: 0 },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 20,
  },
  summaryCard: { background: "white", borderRadius: 16, border: "2px solid #e2e8f0", padding: 18 },
  summaryLabel: { fontSize: 13, fontWeight: 800, color: "#64748b" },
  summaryValue: { fontSize: 26, fontWeight: 900, color: "#0f172a", marginTop: 6 },

  card: { background: "white", borderRadius: 16, border: "2px solid #e2e8f0", padding: 20 },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 },
  refreshBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "2px solid #e2e8f0",
    background: "white",
    fontWeight: 800,
    cursor: "pointer",
  },

  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  th: { textAlign: "left", padding: "12px 10px", fontSize: 12, color: "#64748b", borderBottom: "1px solid #e2e8f0", fontWeight: 900, letterSpacing: "0.4px" },
  thRight: { textAlign: "right", padding: "12px 10px", fontSize: 12, color: "#64748b", borderBottom: "1px solid #e2e8f0", fontWeight: 900, letterSpacing: "0.4px" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "12px 10px", fontSize: 14, color: "#0f172a", fontWeight: 700 },
  tdRight: { padding: "12px 10px", fontSize: 14, color: "#0f172a", fontWeight: 800, textAlign: "right" },
};
