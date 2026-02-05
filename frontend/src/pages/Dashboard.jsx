import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

import { getMarket } from "../web3/market";
import { getEmbeddedAddress, hasEmbeddedWallet } from "../web3/embeddedWallet";

const fmtInt = (n) => new Intl.NumberFormat("ko-KR").format(n);
const fmtKrw = (n) => `₩${new Intl.NumberFormat("ko-KR").format(n)}`;
const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "-");

// ✅ 컨트랙트 enum index → 영문 상태(내부 로직용)
const STATUS_LABEL = {
  0: "ACTIVE",
  1: "CANCELLED",
  2: "MATCHED",
  3: "COMPLETED",
  4: "EXPIRED",
};
const SIDE_LABEL = { 0: "BUY", 1: "SELL" };

// ✅ 화면 표시용(영문 → 한글)
const STATUS_KO = {
  ACTIVE: "대기",
  MATCHED: "매칭",
  COMPLETED: "완료",
  CANCELLED: "취소",
  EXPIRED: "만료",
};

const SIDE_KO = {
  BUY: "구매",
  SELL: "판매",
};

export default function Dashboard() {
  const nav = useNavigate();

  const [addr, setAddr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [wallet, setWallet] = useState({ krw: 0, krwLocked: 0, kwh: 0, kwhLocked: 0 });
  const [recentOrders, setRecentOrders] = useState([]);

  const stats = useMemo(() => {
    const my = recentOrders;

    const totalBuy = my.filter((o) => o.side === "BUY").reduce((acc, o) => acc + o.amountKwh, 0);
    const totalSell = my.filter((o) => o.side === "SELL").reduce((acc, o) => acc + o.amountKwh, 0);

    return [
      { label: "내 구매 주문량(최근)", value: fmtInt(totalBuy), unit: "kWh", hint: "내 주문 기준", icon: "🛒" },
      { label: "내 판매 주문량(최근)", value: fmtInt(totalSell), unit: "kWh", hint: "내 주문 기준", icon: "⚡" },
      { label: "잠금 금액", value: fmtKrw(wallet.krwLocked), unit: "", hint: "KRW locked", icon: "🔒" },
      { label: "잠금 에너지", value: fmtInt(wallet.kwhLocked), unit: "kWh", hint: "kWh locked", icon: "⛓️" },
    ];
  }, [recentOrders, wallet.krwLocked, wallet.kwhLocked]);

  const recent = useMemo(() => {
    return recentOrders.slice(0, 8).map((t) => ({
      id: t.id,
      type: t.side, // ✅ 내부는 BUY/SELL 유지
      amount: `${fmtInt(t.amountKwh)} kWh`,
      price: `₩${fmtInt(t.pricePerKwh)}/kWh`,
      status: t.status, // ✅ 내부는 ACTIVE/COMPLETED 유지
      time: t.startTime ? `start ${t.startTime}` : "on-chain",
    }));
  }, [recentOrders]);

  async function load({ silent = false } = {}) {
    try {
      setErr("");
      if (!silent) setLoading(true);

      if (!hasEmbeddedWallet()) {
        setErr("내장지갑이 없습니다. 회원가입/로그인 시 지갑 생성 흐름을 먼저 확인하세요.");
        setRecentOrders([]);
        setWallet({ krw: 0, krwLocked: 0, kwh: 0, kwhLocked: 0 });
        return;
      }

      const a = getEmbeddedAddress();
      setAddr(a);

      const market = await getMarket();

      const [krw, krwLocked, kwh, kwhLocked] = await Promise.all([
        market.krwBalance(a),
        market.krwLocked(a),
        market.kwhBalance(a),
        market.kwhLocked(a),
      ]);

      setWallet({
        krw: Number(krw),
        krwLocked: Number(krwLocked),
        kwh: Number(kwh),
        kwhLocked: Number(kwhLocked),
      });

      const nextOrderId = Number(await market.nextOrderId());
      const TAKE = 30;

      const ids = [];
      for (let id = nextOrderId - 1; id >= 0 && ids.length < TAKE; id--) ids.push(id);

      const raw = await Promise.all(
        ids.map(async (id) => {
          try {
            const o = await market.orders(id);
            return { id, o };
          } catch {
            return null;
          }
        })
      );

      const parsed = raw
        .filter(Boolean)
        .map(({ id, o }) => {
          const maker = o.maker ?? o[1];
          const sideIdx = Number(o.side ?? o[2]);
          const amountKwh = Number(o.amountKwh ?? o[3]);
          const price = Number(o.pricePerKwh ?? o[4]);
          const startTime = Number(o.startTime ?? o[5]);
          const endTime = Number(o.endTime ?? o[6]);
          const statusIdx = Number(o.status ?? o[7]);

          return {
            id,
            maker,
            side: SIDE_LABEL[sideIdx] ?? String(sideIdx), // ✅ BUY/SELL
            amountKwh,
            pricePerKwh: price,
            startTime,
            endTime,
            status: STATUS_LABEL[statusIdx] ?? String(statusIdx), // ✅ ACTIVE/COMPLETED...
          };
        })
        .filter((x) => (x.maker || "").toLowerCase() === a.toLowerCase());

      setRecentOrders(parsed);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "대시보드 로딩 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRefresh() {
    if (busy) return;
    setBusy(true);
    await load({ silent: true });
    setBusy(false);
  }

  return (
    <Layout>
      {/* ✅ wrapper를 두고 중앙 정렬 */}
      <div style={shell}>
        <div style={page}>
          {/* 헤더 */}
          <div style={header}>
            <div>
              <div style={kicker}>On-chain Dashboard</div>
              <h1 style={h1}>대시보드</h1>
              <p style={sub}>
                내장지갑 <b>{shortAddr(addr)}</b> 기준으로 체인 상태를 가져왔어요.
              </p>
            </div>

            {/* ✅ 헤더 버튼 */}
            <div style={headerRight}>
              <button style={primaryBtn} onClick={() => nav("/buy")}>BUY 주문</button>
              <button style={primaryBtn2} onClick={() => nav("/sell")}>SELL 주문</button>
              <button style={ghostBtn} onClick={onRefresh} disabled={busy}>
                {busy ? "새로고침..." : "새로고침"}
              </button>
            </div>
          </div>

          {err ? (
            <div style={alert}>
              <div style={alertTitle}>에러</div>
              <div style={alertBody}>{err}</div>
            </div>
          ) : null}

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
            {/* 왼쪽: 최근 활동 */}
            <div style={panel}>
              <div style={panelHeader}>
                <div style={panelTitle}>최근 활동</div>
                <div style={panelDesc}>내 주문(온체인 maker 기준) 최신 {recent.length}건</div>
              </div>

              <div style={list}>
                {loading ? (
                  <div style={skeleton}>불러오는 중...</div>
                ) : recent.length === 0 ? (
                  <div style={empty}>아직 내 주문이 없어요. BUY/SELL 주문을 먼저 만들어보세요.</div>
                ) : (
                  recent.map((t) => (
                    <div key={t.id} style={row}>
                      <div style={rowLeft}>
                        {/* ✅ BUY/SELL은 내부값 유지, 화면은 구매/판매 */}
                        <div style={pill(t.type === "BUY" ? "blue" : "green")}>
                          {SIDE_KO[t.type] ?? t.type}
                        </div>
                        <div>
                          <div style={rowMain}>{t.amount} · {t.price}</div>
                          <div style={rowSub}>#{t.id} · {t.time}</div>
                        </div>
                      </div>
                      <div style={rowRight}>
                        {/* ✅ status는 내부값 유지, 화면은 대기/완료 */}
                        <div style={statusBadge(t.status)}>
                          {STATUS_KO[t.status] ?? t.status}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={panelFooter}>
                <button style={ghostBtn} onClick={() => nav("/orders")}>주문 목록</button>
              </div>
            </div>

            {/* 오른쪽: 지갑 + 빠른 액션 */}
            <div style={panel}>
              <div style={panelHeader}>
                <div style={panelTitle}>내 지갑 상태</div>
                <div style={panelDesc}>온체인 잔고 / 잠금(locked) 상태</div>
              </div>

              <div style={walletBox}>
                <div style={walletRow}>
                  <div style={walletLabel}>KRW 총액</div>
                  <div style={walletValue}>{fmtKrw(wallet.krw)}</div>
                </div>
                <div style={walletRow}>
                  <div style={walletLabel}>KRW 잠금</div>
                  <div style={walletValue}>{fmtKrw(wallet.krwLocked)}</div>
                </div>
                <div style={divider} />
                <div style={walletRow}>
                  <div style={walletLabel}>kWh 총량</div>
                  <div style={walletValue}>{fmtInt(wallet.kwh)} kWh</div>
                </div>
                <div style={walletRow}>
                  <div style={walletLabel}>kWh 잠금</div>
                  <div style={walletValue}>{fmtInt(wallet.kwhLocked)} kWh</div>
                </div>
              </div>

              <div style={panelHeaderAlt}>
                <div style={panelTitle}>빠른 액션</div>
              </div>

              <div style={quickGrid}>
                <button style={quickCard} onClick={() => nav("/mypage")}>
                  <div style={quickIcon}>👤</div>
                  <div style={quickText}>
                    <div style={quickTitle}>마이페이지</div>
                    <div style={quickSub}>내 정보/주소/지갑</div>
                  </div>
                </button>

                <button style={quickCard} onClick={() => nav("/monitor")}>
                  <div style={quickIcon}>🧾</div>
                  <div style={quickText}>
                    <div style={quickTitle}>온체인 모니터</div>
                    <div style={quickSub}>블록/tx/events 확인</div>
                  </div>
                </button>
              </div>

              <div style={note}>
                <div style={noteTitle}>PoC 팁</div>
                <div style={noteBody}>
                  지금 대시보드는 <b>온체인 잔고/잠금</b> + <b>내 주문 상태</b> 흐름만 안정적으로 보이면 성공.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/* ---------------- styles ---------------- */

const shell = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  padding: "22px 22px 40px",
  boxSizing: "border-box",
  background: "#f8fafc",
};

const page = {
  width: "100%",
  maxWidth: 1280,
};

const kicker = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  color: "#64748b",
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
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const primaryBtn = {
  background: "#0f172a",
  color: "white",
  border: "1px solid #0f172a",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const primaryBtn2 = {
  background: "#111827",
  color: "white",
  border: "1px solid #111827",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
  opacity: 0.92,
};

const ghostBtn = {
  background: "white",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const alert = {
  marginTop: 16,
  borderRadius: 14,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  padding: 12,
};

const alertTitle = {
  fontWeight: 900,
  color: "#7f1d1d",
  marginBottom: 6,
};

const alertBody = {
  fontSize: 13,
  color: "#7f1d1d",
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
  width: 38,
  height: 38,
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
  gridTemplateColumns: "1.35fr 1fr",
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

const panelHeaderAlt = {
  padding: 16,
  borderTop: "1px solid #eef2f7",
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
  padding: 12,
};

const skeleton = {
  padding: 14,
  borderRadius: 12,
  border: "1px dashed #e2e8f0",
  color: "#64748b",
  background: "#f8fafc",
  fontWeight: 800,
};

const empty = {
  padding: 14,
  borderRadius: 12,
  border: "1px dashed #e2e8f0",
  color: "#64748b",
  background: "#f8fafc",
  fontSize: 13,
  lineHeight: 1.5,
};

const row = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #eef2f7",
  marginBottom: 10,
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
    minWidth: 56,
    textAlign: "center",
  };
};

const statusBadge = (s) => {
  const map = {
    ACTIVE: { bg: "#f8fafc", fg: "#334155", bd: "#e2e8f0" },
    MATCHED: { bg: "#fff7ed", fg: "#c2410c", bd: "#fed7aa" },
    COMPLETED: { bg: "#ecfdf5", fg: "#047857", bd: "#bbf7d0" },
    CANCELLED: { bg: "#f1f5f9", fg: "#475569", bd: "#e2e8f0" },
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

const walletBox = {
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const walletRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 10,
  borderRadius: 12,
  border: "1px solid #eef2f7",
  background: "#ffffff",
};

const walletLabel = {
  fontSize: 13,
  fontWeight: 900,
  color: "#0f172a",
};

const walletValue = {
  fontSize: 13,
  fontWeight: 900,
  color: "#0f172a",
};

const divider = {
  height: 1,
  background: "#eef2f7",
  margin: "2px 0",
};

const quickGrid = {
  padding: 14,
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
  width: 38,
  height: 38,
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
  margin: 14,
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
