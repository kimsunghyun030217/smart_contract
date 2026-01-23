import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setErr("");
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:8080/orders", {
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
      setErr(e.message || "주문내역 불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  // ✅ 주문 취소(삭제): ACTIVE만 가능
  const cancelOrder = async (id) => {
    if (!confirm("이 주문을 취소(삭제)할까요?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`http://localhost:8080/orders/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "취소 실패");

      // ✅ 화면에서도 바로 제거 (또는 load()로 새로고침해도 됨)
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      alert(e.message || "취소 실패");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ✅ COMPLETED(완료)는 이 페이지에서 숨김
  const visibleOrders = useMemo(() => {
    return orders.filter((o) => String(o.status || "").toUpperCase() !== "COMPLETED");
  }, [orders]);

  const summary = useMemo(() => {
    const total = visibleOrders.length;
    const buy = visibleOrders.filter((o) => o.orderType === "buy").length;
    const sell = visibleOrders.filter((o) => o.orderType === "sell").length;
    return { total, buy, sell };
  }, [visibleOrders]);

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

  const statusPill = (status) => {
    const s = String(status || "").toUpperCase();

    const map = {
      ACTIVE: { label: "대기", bg: "rgba(16,185,129,0.10)", color: "#059669" },
      MATCHED: { label: "체결", bg: "rgba(59,130,246,0.10)", color: "#2563eb" },
      COMPLETED: { label: "완료", bg: "rgba(139,92,246,0.10)", color: "#7c3aed" },
      EXPIRED: { label: "만료", bg: "rgba(148,163,184,0.12)", color: "#64748b" },
    };

    const meta =
      map[s] || { label: s || "-", bg: "rgba(148,163,184,0.12)", color: "#64748b" };

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "6px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 900,
          border: "1px solid #e2e8f0",
          background: meta.bg,
          color: meta.color,
        }}
      >
        {meta.label}
      </span>
    );
  };

  const isActive = (o) => String(o.status || "").toUpperCase() === "ACTIVE";

  return (
    <Layout>
      <div style={{ padding: 32 }}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>주문내역 🧾</h1>
          <p style={styles.headerSubtitle}>내가 등록한 거래 주문을 확인할 수 있어요</p>
        </div>

        {/* 요약 카드 */}
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>전체 주문</div>
            <div style={styles.summaryValue}>{summary.total}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>구매</div>
            <div style={styles.summaryValue}>{summary.buy}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>판매</div>
            <div style={styles.summaryValue}>{summary.sell}</div>
          </div>
        </div>

        {/* 본문 카드 */}
        <div style={styles.card}>
          <div style={styles.cardTop}>
            <h3 style={styles.cardTitle}>내 주문 목록</h3>
            <button onClick={load} style={styles.refreshBtn}>
              새로고침
            </button>
          </div>

          {loading && <div style={{ color: "#64748b" }}>불러오는 중...</div>}
          {err && <div style={{ color: "#ef4444", marginTop: 8 }}>{err}</div>}

          {!loading && !err && visibleOrders.length === 0 && (
            <div style={{ color: "#94a3b8", padding: "14px 0" }}>주문 내역이 없어요.</div>
          )}

          {!loading && !err && visibleOrders.length > 0 && (
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
                    <th style={styles.th}>취소</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((o) => (
                    <tr key={o.id} style={styles.tr}>
                      <td style={styles.td}>{badge(o.orderType)}</td>
                      <td style={styles.tdRight}>{o.amountKwh}</td>
                      <td style={styles.tdRight}>{o.pricePerKwh}</td>
                      <td style={styles.td}>{formatDT(o.startTime)}</td>
                      <td style={styles.td}>{formatDT(o.endTime)}</td>
                      <td style={styles.td}>{statusPill(o.status)}</td>
                      <td style={styles.td}>{formatDT(o.createdAt)}</td>

                      <td style={styles.td}>
                        <button
                          onClick={() => cancelOrder(o.id)}
                          disabled={!isActive(o)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "2px solid #e2e8f0",
                            background: "white",
                            fontWeight: 900,
                            cursor: isActive(o) ? "pointer" : "not-allowed",
                            opacity: isActive(o) ? 1 : 0.35,
                          }}
                        >
                          취소
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: 10, color: "#94a3b8", fontSize: 12 }}>
                * “취소”는 대기(ACTIVE) 상태에서만 가능해요.
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  header: { marginBottom: 24 },
  headerTitle: {
    fontSize: 32,
    fontWeight: 800,
    color: "#0f172a",
    margin: "0 0 8px 0",
  },
  headerSubtitle: { fontSize: 16, color: "#64748b", margin: 0 },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 20,
  },
  summaryCard: {
    background: "white",
    borderRadius: 16,
    border: "2px solid #e2e8f0",
    padding: 18,
  },
  summaryLabel: { fontSize: 13, fontWeight: 800, color: "#64748b" },
  summaryValue: { fontSize: 26, fontWeight: 900, color: "#0f172a", marginTop: 6 },

  card: {
    background: "white",
    borderRadius: 16,
    border: "2px solid #e2e8f0",
    padding: 20,
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 },
  refreshBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "2px solid #e2e8f0",
    background: "white",
    fontWeight: 800,
    cursor: "pointer",
  },

  table: { width: "100%", borderCollapse: "collapse", minWidth: 860 },
  th: {
    textAlign: "left",
    padding: "12px 10px",
    fontSize: 12,
    color: "#64748b",
    borderBottom: "1px solid #e2e8f0",
    fontWeight: 900,
    letterSpacing: "0.4px",
    whiteSpace: "nowrap",
  },
  thRight: {
    textAlign: "right",
    padding: "12px 10px",
    fontSize: 12,
    color: "#64748b",
    borderBottom: "1px solid #e2e8f0",
    fontWeight: 900,
    letterSpacing: "0.4px",
    whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "12px 10px", fontSize: 14, color: "#0f172a", fontWeight: 700, whiteSpace: "nowrap" },
  tdRight: {
    padding: "12px 10px",
    fontSize: 14,
    color: "#0f172a",
    fontWeight: 800,
    textAlign: "right",
    whiteSpace: "nowrap",
  },
};
