// src/components/AutoMatcher.jsx
import { useEffect, useRef, useState } from "react";
import { getMarket } from "../web3/market";

// ===== 설정값 (PoC용) =====
const INTERVAL_MS = 15_000;          // 15초마다 자동 체크
const SCAN_LAST_N_ORDERS = 200;      // 최근 200개 주문만 스캔
const RADIUS = 1;                    // 주변 버킷 반경
const SCAN_LIMIT_PER_BUCKET = 20;    // 버킷당 스캔 수
const MAX_EVAL = 60;                 // 총 평가 개수
const MAX_MATCH_PER_TICK = 1;        // 한 번 tick에 최대 몇 건

// enum Status { ACTIVE, CANCELLED, MATCHED, COMPLETED, EXPIRED }
// enum Side { BUY, SELL }
const STATUS_ACTIVE = 0;
const SIDE_BUY = 0;

export default function AutoMatcher() {
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
      const now = Date.now();
      if (now - lastRunAtRef.current < 3000) return;
      lastRunAtRef.current = now;

      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const market = await getMarket(username);
        const me = await market.runner.getAddress();
        const nowSec = Math.floor(Date.now() / 1000);

        // 1) 최근 주문들에서 "내 ACTIVE BUY" 찾기
        const nextId = Number(await market.nextOrderId());
        const from = Math.max(1, nextId - SCAN_LAST_N_ORDERS);

        const activeBuyIds = [];

        for (let id = nextId - 1; id >= from; id--) {
          const o = await market.orders(BigInt(id));

          // ethers 반환이 구조체 형태일 수도, 배열 형태일 수도 있어 둘 다 대응
          const maker = (o.maker ?? o[1])?.toString?.() ?? "";
          const side = Number(o.side ?? o[2]);
          const status = Number(o.status ?? o[7]);
          const endTime = Number(o.endTime ?? o[6]);

          const isMine = maker.toLowerCase() === me.toLowerCase();
          const isBuy = side === SIDE_BUY;
          const isActive = status === STATUS_ACTIVE;
          const notExpired = endTime > nowSec;

          if (isMine && isBuy && isActive && notExpired) {
            activeBuyIds.push(id);
          }
        }

        if (activeBuyIds.length === 0) return;

        // 2) 각 BUY에 대해: "될 때만 tx" (시뮬레이션 -> 실제 실행)
        let matchedCount = 0;

        for (const buyId of activeBuyIds) {
          if (stopped) break;
          if (matchedCount >= MAX_MATCH_PER_TICK) break;

          // (A) 시뮬레이션: 성공 가능 여부만 확인
          let canMatch = true;
          try {
            await market.matchBuy.staticCall(
              BigInt(buyId),
              BigInt(RADIUS),
              BigInt(SCAN_LIMIT_PER_BUCKET),
              BigInt(MAX_EVAL)
            );
          } catch {
            canMatch = false;
          }

          if (!canMatch) continue;

          // (B) 실제 매칭 트랜잭션
          try {
            const tx = await market.matchBuy(
              BigInt(buyId),
              BigInt(RADIUS),
              BigInt(SCAN_LIMIT_PER_BUCKET),
              BigInt(MAX_EVAL)
            );

            const receipt = await tx.wait();

            // OrderMatched 이벤트에서 tradeId 추출 (있으면 사용)
            const ev = receipt.logs
              .map((log) => {
                try { return market.interface.parseLog(log); } catch { return null; }
              })
              .find((x) => x && x.name === "OrderMatched");

            // ev가 없어도 매칭 자체는 성공했을 수 있음
            void ev;

            matchedCount++;
          } catch {
            // race condition 등은 그냥 무시 (조용히)
          }
        }
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
    <div style={{ position: "fixed", right: 12, bottom: 12, zIndex: 9999 }}>
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
        자동 매칭 ON
      </label>
    </div>
  );
}
