// src/components/AutoSettler.jsx
import { useEffect, useRef, useState } from "react";
import { getMarket } from "../web3/market";

/**
 * ✅ AutoSettler: deliveryStart 지난 trade를 자동으로 settleTrade() 호출
 * - "프론트가 켜져있는 동안"만 돌아감 (AutoMatcher랑 동일)
 * - 가스 아끼려고: staticCall로 먼저 가능 여부 확인 후 tx 실행
 */

// ===== 설정값 (PoC용) =====
const INTERVAL_MS = 15_000;          // 15초마다 자동 체크
const SCAN_LAST_N_TRADES = 200;      // 최근 200개 trade만 스캔
const MAX_SETTLE_PER_TICK = 1;       // 한 번 tick에 최대 몇 건 정산할지

// enum TradeStatus { MATCHED, COMPLETED }
const TRADE_MATCHED = 0; // 너 컨트랙트 enum 순서 기준

export default function AutoSettler() {
  const [enabled, setEnabled] = useState(true);
  const inFlightRef = useRef(false);
  const lastRunAtRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const username = localStorage.getItem("username");
    if (!username) return;

    let stopped = false;
    let timer = null;

    async function tick() {
      if (stopped) return;

      // 너무 자주 겹치 실행 방지
      const nowMs = Date.now();
      if (nowMs - lastRunAtRef.current < 3000) return;
      lastRunAtRef.current = nowMs;

      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const market = await getMarket(username);
        const me = (await market.runner.getAddress()).toLowerCase();
        const nowSec = Math.floor(Date.now() / 1000);

        // 컨트랙트에 nextTradeId 있음
        const nextTradeId = Number(await market.nextTradeId());
        const maxTid = nextTradeId - 1;

        if (maxTid <= 0) return;

        const from = Math.max(1, maxTid - SCAN_LAST_N_TRADES + 1);

        let settledCount = 0;

        // 최신 trade부터 훑기
        for (let tid = maxTid; tid >= from; tid--) {
          if (stopped) break;
          if (settledCount >= MAX_SETTLE_PER_TICK) break;

          let t;
          try {
            t = await market.trades(BigInt(tid));
          } catch {
            continue;
          }

          const id = Number(t.id ?? t[0] ?? 0);
          if (!id) continue;

          const tradeStatus = Number(t.status ?? t[7]); // 마지막 필드가 status
          if (tradeStatus !== TRADE_MATCHED) continue;

          const buyOrderId = Number(t.buyOrderId ?? t[1]);
          const sellOrderId = Number(t.sellOrderId ?? t[2]);
          const deliveryStart = Number(t.deliveryStart ?? t[5]);

          // 내 trade인지 확인
          let isMine = false;
          try {
            const buy = await market.orders(BigInt(buyOrderId));
            const sell = await market.orders(BigInt(sellOrderId));
            const buyMaker = String(buy.maker ?? buy[1] ?? "").toLowerCase();
            const sellMaker = String(sell.maker ?? sell[1] ?? "").toLowerCase();
            isMine = buyMaker === me || sellMaker === me;
          } catch {
            continue;
          }

          if (!isMine) continue;

          // 아직 시작 시간이 안 됐으면 정산 불가
          if (deliveryStart > nowSec) continue;

          // (A) 시뮬레이션: 정산 가능한지 확인
          let canSettle = true;
          try {
            await market.settleTrade.staticCall(BigInt(tid));
          } catch {
            canSettle = false;
          }
          if (!canSettle) continue;

          // (B) 실제 정산 트랜잭션
          try {
            const tx = await market.settleTrade(BigInt(tid));
            await tx.wait();
            settledCount++;
          } catch {
            // race condition 등은 그냥 무시 (조용히)
          }
        }

        void settledCount;
      } catch {
        // 조용히
      } finally {
        inFlightRef.current = false;
      }
    }

    // 시작하자마자 1번 실행 + 주기 실행
    tick();
    timer = setInterval(tick, INTERVAL_MS);

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
    };
  }, [enabled]);

  return (
    <div style={{ position: "fixed", right: 12, bottom: 54, zIndex: 9999 }}>
      <label
        style={{
          background: "white",
          border: "1px solid #ddd",
          padding: "8px 10px",
          borderRadius: 10,
          display: "flex",
          gap: 8,
          alignItems: "center",
          fontSize: 12,
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        자동 정산 ON
      </label>
    </div>
  );
}
