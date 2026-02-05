import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

import { getMarket, getProvider } from "../web3/market";
import { createEmbeddedWalletIfMissing } from "../web3/embeddedWallet";

// enum Status { ACTIVE, CANCELLED, MATCHED, COMPLETED, EXPIRED }
const STATUS_COMPLETED = 3;

// enum Side { BUY, SELL }
const SIDE_LABEL = { 0: "buy", 1: "sell" };

export default function CompletedPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ 무조건 KST로 표시 (PC 타임존 상관없이 Asia/Seoul 고정)
  const fmtKST = (sec) => {
    if (!sec) return "-";
    const d = new Date(Number(sec) * 1000);

    // "sv-SE"는 기본 포맷이 "YYYY-MM-DD HH:mm" 형태로 깔끔함
    // (브라우저별 안전성 좋음)
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  };

  async function getBlockTime(provider, blockNumber) {
    if (blockNumber == null) return null;
    const b = await provider.getBlock(blockNumber);
    return b?.timestamp ? fmtKST(b.timestamp) : null;
  }

  async function load({ silent = false } = {}) {
    const username = localStorage.getItem("username");
    const token = localStorage.getItem("token");

    try {
      setErr("");
      if (!silent) setLoading(true);

      if (!username || !token) {
        setRows([]);
        setErr("로그인이 필요합니다.");
        navigate("/login");
        return;
      }

      createEmbeddedWalletIfMissing(username);

      const market = await getMarket(username);
      const provider = getProvider();
      const myAddr = (await market.runner.getAddress()).toLowerCase();
      if (!myAddr) throw new Error("내장지갑 주소를 찾을 수 없습니다.");

      const nextId = await market.nextOrderId(); // bigint
      const maxId = Number(nextId) - 1;

      if (maxId <= 0) {
        setRows([]);
        return;
      }

      const list = [];

      for (let id = 1; id <= maxId; id++) {
        const o = await market.orders(BigInt(id));

        const oid = Number(o.id ?? o[0]);
        if (!oid) continue;

        const maker = String(o.maker ?? o[1] ?? "").toLowerCase();
        if (maker !== myAddr) continue;

        const sideNum = Number(o.side ?? o[2]);
        const statusNum = Number(o.status ?? o[7]);

        if (statusNum !== STATUS_COMPLETED) continue;

        const amountKwh = Number(o.amountKwh ?? o[3]);
        const bidPrice = Number(o.pricePerKwh ?? o[4]); // 내가 건 가격
        const startSec = Number(o.startTime ?? o[5]);
        const endSec = Number(o.endTime ?? o[6]);

        // ---- 체결/배송/시간 정보(Trade 기반) ----
        let executedPricePerKwh = null;
        let executedAmountKwh = null;
        let deliveryStart = null;
        let deliveryEnd = null;

        let matchedAt = null; // 매칭(체결) 시간
        let settledAt = null; // 정산(완료) 시간

        try {
          // orderToTradeId 있어야 함
          const tid = await market.orderToTradeId(BigInt(oid));
          const tidNum = Number(tid);

          if (tidNum > 0) {
            const t = await market.trades(BigInt(tidNum));

            executedPricePerKwh = Number(t.pricePerKwh ?? t[4]);
            executedAmountKwh = Number(t.amountKwh ?? t[3]);

            deliveryStart = fmtKST(Number(t.deliveryStart ?? t[5]));
            deliveryEnd = fmtKST(Number(t.deliveryEnd ?? t[6]));

            // ✅ 1) OrderMatched 이벤트 -> matchedAt
            try {
              const matchedFilter = market.filters.OrderMatched(null, null, BigInt(tidNum));
              const matchedLogs = await market.queryFilter(matchedFilter, 0, "latest");
              if (matchedLogs?.length) {
                const last = matchedLogs[matchedLogs.length - 1];
                matchedAt = await getBlockTime(provider, last.blockNumber);
              }
            } catch {}

            // ✅ 2) TradeSettled 이벤트 -> settledAt
            try {
              const settledFilter = market.filters.TradeSettled(BigInt(tidNum), null, null);
              const settledLogs = await market.queryFilter(settledFilter, 0, "latest");
              if (settledLogs?.length) {
                const last = settledLogs[settledLogs.length - 1];
                settledAt = await getBlockTime(provider, last.blockNumber);
              }
            } catch {}
          }
        } catch (e) {
          // 구버전 컨트랙트면 여기서 그냥 넘어감
        }

        list.push({
          id: oid,
          orderType: SIDE_LABEL[sideNum] || "buy",
          amountKwh,
          bidPrice,

          executedPricePerKwh,
          executedAmountKwh,

          // 배송시간은 유지(= delivery window)
          deliveryWindow:
            deliveryStart && deliveryEnd ? `${deliveryStart} ~ ${deliveryEnd}` : "-",

          matchedAt: matchedAt ?? "-",
          settledAt: settledAt ?? "-",

          // start/end는 화면에서 안 보여줄 거지만, 혹시 나중에 필요하면 남겨둠
          startTime: fmtKST(startSec),
          endTime: fmtKST(endSec),
        });
      }

      list.sort((a, b) => b.id - a.id);
      setRows(list);
    } catch (e) {
      console.error(e);
      setErr(e?.shortMessage || e?.reason || e?.message || "거래완료 내역 불러오기 실패");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => load({ silent: true }), 30_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const total = rows.length;
    const buy = rows.filter((o) => o.orderType === "buy").length;
    const sell = rows.filter((o) => o.orderType === "sell").length;
    return { total, buy, sell };
  }, [rows]);

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
        }}
      >
        {isBuy ? "구매" : "판매"}
      </span>
    );
  };

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
          <p style={styles.headerSubtitle}>온체인에서 완료(COMPLETED)된 내 주문만 표시돼요</p>
          <div style={{ color: "#64748b", marginTop: 6 }}>* 30초마다 자동 갱신</div>
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
            <button onClick={() => load()} style={styles.refreshBtn}>
              새로고침
            </button>
          </div>

          {loading && <div style={{ color: "#64748b" }}>불러오는 중...</div>}
          {err && <div style={{ color: "#ef4444", marginTop: 8 }}>{err}</div>}

          {!loading && !err && rows.length === 0 && (
            <div style={{ color: "#94a3b8", padding: "14px 0" }}>
              완료된 거래가 아직 없어요.
            </div>
          )}

          {!loading && !err && rows.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>구분</th>
                    <th style={styles.thRight}>수량(kWh)</th>

                    <th style={styles.thRight}>내가 건 가격</th>
                    <th style={styles.thRight}>체결가</th>
                    <th style={styles.thRight}>체결수량</th>

                    {/* ✅ 배송시간 유지 */}
                    <th style={styles.th}>배송시간</th>

                    {/* ✅ 새로 추가 */}
                    <th style={styles.th}>매칭시간</th>
                    <th style={styles.th}>정산완료시간</th>

                    <th style={styles.th}>상태</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} style={styles.tr}>
                      <td style={styles.td}>{badge(o.orderType)}</td>
                      <td style={styles.tdRight}>{o.amountKwh}</td>

                      <td style={styles.tdRight}>{o.bidPrice}</td>
                      <td style={styles.tdRight}>{o.executedPricePerKwh ?? "-"}</td>
                      <td style={styles.tdRight}>{o.executedAmountKwh ?? "-"}</td>

                      <td style={styles.td}>{o.deliveryWindow}</td>

                      <td style={styles.td}>{o.matchedAt}</td>
                      <td style={styles.td}>{o.settledAt}</td>

                      <td style={styles.td}>{statusPill()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ color: "#64748b", marginTop: 10, fontSize: 12 }}>
                * 매칭시간/정산완료시간은 이벤트가 찍힌 블록의 timestamp(KST) 기준이에요.
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

  table: { width: "100%", borderCollapse: "collapse", minWidth: 980 },
  th: { textAlign: "left", padding: "12px 10px", fontSize: 12, color: "#64748b", borderBottom: "1px solid #e2e8f0", fontWeight: 900 },
  thRight: { textAlign: "right", padding: "12px 10px", fontSize: 12, color: "#64748b", borderBottom: "1px solid #e2e8f0", fontWeight: 900 },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "12px 10px", fontSize: 14, color: "#0f172a", fontWeight: 700, whiteSpace: "nowrap" },
  tdRight: { padding: "12px 10px", fontSize: 14, color: "#0f172a", fontWeight: 800, textAlign: "right", whiteSpace: "nowrap" },
};
