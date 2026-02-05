import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import "./OrdersPage.css";

import { getMarket } from "../web3/market";
import { createEmbeddedWalletIfMissing } from "../web3/embeddedWallet";

const STATUS_LABEL = {
  0: "대기",
  1: "취소됨",
  2: "체결",
  3: "완료",
  4: "기간 종료",
};

const SIDE_LABEL = {
  0: "buy",
  1: "sell",
};

export default function OrdersPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ 무조건 KST로 표시 (PC 타임존 상관없이 Asia/Seoul 고정)
  const fmtKST = (sec) => {
    if (!sec) return "-";
    const d = new Date(Number(sec) * 1000);
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

  async function load({ silent = false } = {}) {
    const username = localStorage.getItem("username");
    const token = localStorage.getItem("token");

    try {
      setErr("");
      if (!silent) setLoading(true);

      if (!username || !token) {
        setOrders([]);
        setErr("로그인이 필요합니다.");
        navigate("/login");
        return;
      }

      createEmbeddedWalletIfMissing(username);

      const market = await getMarket(username);
      const myAddr = (await market.runner.getAddress()).toLowerCase();
      if (!myAddr) throw new Error("내장지갑 주소를 찾을 수 없습니다.");

      const nextId = await market.nextOrderId(); // bigint
      const maxId = Number(nextId) - 1;

      if (maxId <= 0) {
        setOrders([]);
        return;
      }

      const list = [];

      for (let id = 1; id <= maxId; id++) {
        const o = await market.orders(BigInt(id));

        const oid = Number(o.id);
        if (!oid) continue;

        const maker = String(o.maker || "").toLowerCase();
        if (maker !== myAddr) continue;

        const sideNum = Number(o.side);
        const statusNum = Number(o.status);

        const amountKwh = Number(o.amountKwh);
        const pricePerKwh = Number(o.pricePerKwh);

        const startSec = Number(o.startTime);
        const endSec = Number(o.endTime);

        // ✅ 체결 정보(있으면) 채우기
        let tradeId = null;
        let executedPricePerKwh = null;
        let executedAmountKwh = null;
        let deliveryStart = null;
        let deliveryEnd = null;

        if (statusNum === 2 || statusNum === 3) {
          try {
            const tid = await market.orderToTradeId(BigInt(oid));
            const tidNum = Number(tid);

            if (tidNum > 0) {
              tradeId = tidNum;

              const t = await market.trades(BigInt(tidNum));
              executedPricePerKwh = Number(t.pricePerKwh);
              executedAmountKwh = Number(t.amountKwh);

              deliveryStart = fmtKST(Number(t.deliveryStart));
              deliveryEnd = fmtKST(Number(t.deliveryEnd));
            }
          } catch (e) {
            console.warn("trade info load failed:", e?.shortMessage || e?.message || e);
          }
        }

        list.push({
          id: oid,
          maker,
          orderType: SIDE_LABEL[sideNum] || "buy",
          amountKwh,
          pricePerKwh,
          startTime: fmtKST(startSec),
          endTime: fmtKST(endSec),
          status: statusNum,
          createdAt: "-",

          tradeId,
          executedPricePerKwh,
          executedAmountKwh,
          deliveryStart,
          deliveryEnd,
        });
      }

      list.sort((a, b) => b.id - a.id);
      setOrders(list);
    } catch (e) {
      console.error(e);
      setErr(e?.shortMessage || e?.reason || e?.message || "주문내역 불러오기 실패");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const cancelOrder = async (id) => {
    if (!confirm("이 주문을 취소할까요? (온체인 트랜잭션 발생)")) return;

    const username = localStorage.getItem("username");
    const token = localStorage.getItem("token");
    if (!username || !token) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    try {
      const market = await getMarket(username);
      const tx = await market.cancelOrder(BigInt(id));
      await tx.wait();

      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 1 } : o)));
    } catch (e) {
      console.error(e);
      alert(e?.shortMessage || e?.reason || e?.message || "취소 실패");
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => load({ silent: true }), 30_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 완료(3) 숨김 유지
  const visibleOrders = useMemo(() => {
    return orders.filter((o) => Number(o.status) !== 3);
  }, [orders]);

  const summary = useMemo(() => {
    const total = visibleOrders.length;
    const buy = visibleOrders.filter((o) => o.orderType === "buy").length;
    const sell = visibleOrders.filter((o) => o.orderType === "sell").length;
    return { total, buy, sell };
  }, [visibleOrders]);

  const badge = (type) => {
    const isBuy = type === "buy";
    return (
      <span className={`badge ${isBuy ? "badgeBuy" : "badgeSell"}`}>
        {isBuy ? "구매" : "판매"}
      </span>
    );
  };

  const statusPill = (statusNum) => {
    const s = Number(statusNum);

    const map = {
      0: { label: "대기", cls: "statusActive" },
      1: { label: "취소됨", cls: "statusExpired" },
      2: { label: "체결", cls: "statusMatched" },
      3: { label: "완료", cls: "statusCompleted" },
      4: { label: "기간 종료", cls: "statusExpired" },
    };

    const meta = map[s] || { label: STATUS_LABEL[s] || String(s), cls: "statusExpired" };
    return <span className={`statusPill ${meta.cls}`}>{meta.label}</span>;
  };

  const isCancelable = (o) => Number(o.status) === 0;

  return (
    <Layout>
      <div className="page">
        <div className="header">
          <h1 className="headerTitle">주문내역 🧾</h1>
          <p className="headerSubtitle">내가 등록한 거래 주문(온체인)을 확인할 수 있어요</p>
          <div className="autoRefreshMsg">* 30초마다 자동으로 상태가 갱신돼요.</div>
        </div>

        <div className="summaryGrid">
          <div className="summaryCard">
            <div className="summaryLabel">전체 주문</div>
            <div className="summaryValue">{summary.total}</div>
          </div>
          <div className="summaryCard">
            <div className="summaryLabel">구매</div>
            <div className="summaryValue">{summary.buy}</div>
          </div>
          <div className="summaryCard">
            <div className="summaryLabel">판매</div>
            <div className="summaryValue">{summary.sell}</div>
          </div>
        </div>

        <div className="card">
          <div className="cardTop">
            <h3 className="cardTitle">내 주문 목록</h3>
            <button onClick={() => load()} className="refreshBtn">
              새로고침
            </button>
          </div>

          {loading && <div className="muted">불러오는 중...</div>}
          {err && <div className="error">{err}</div>}

          {!loading && !err && visibleOrders.length === 0 && (
            <div className="empty">주문 내역이 없어요.</div>
          )}

          {!loading && !err && visibleOrders.length > 0 && (
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">구분</th>
                    <th className="th thRight">수량(kWh)</th>
                    <th className="th thRight">내가 건 가격</th>
                    <th className="th">시작</th>
                    <th className="th">종료</th>
                    <th className="th">상태</th>

                    {/* ✅ 유지: 체결 정보 */}
                    <th className="th thRight">체결가</th>
                    <th className="th thRight">체결수량</th>

                    {/* ✅ Trade 컬럼 제거, 배송시간만 유지 */}
                    <th className="th">배송시간</th>

                    <th className="th">등록일</th>
                    <th className="th">취소</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleOrders.map((o) => {
                    const canCancel = isCancelable(o);
                    const hasTrade = !!o.tradeId;

                    return (
                      <tr key={o.id} className="tr">
                        <td className="td">{badge(o.orderType)}</td>
                        <td className="td tdRight">{o.amountKwh}</td>
                        <td className="td tdRight">{o.pricePerKwh}</td>
                        <td className="td">{o.startTime}</td>
                        <td className="td">{o.endTime}</td>
                        <td className="td">{statusPill(o.status)}</td>

                        {/* ✅ 체결 정보 */}
                        <td className="td tdRight">{hasTrade ? o.executedPricePerKwh : "-"}</td>
                        <td className="td tdRight">{hasTrade ? o.executedAmountKwh : "-"}</td>

                        {/* ✅ 배송시간 */}
                        <td className="td">
                          {hasTrade && o.deliveryStart
                            ? `${o.deliveryStart} ~ ${o.deliveryEnd}`
                            : "-"}
                        </td>

                        <td className="td">{o.createdAt}</td>

                        <td className="td">
                          <button
                            onClick={() => cancelOrder(o.id)}
                            disabled={!canCancel}
                            className={`cancelBtn ${
                              canCancel ? "cancelBtnEnabled" : "cancelBtnDisabled"
                            }`}
                          >
                            취소
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="hint">
                * “취소”는 대기(ACTIVE) 상태에서 가능해요. (PoC 컨트랙트 기준)
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
