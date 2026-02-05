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

  // ✅ 0) 컴포넌트가 화면에 올라왔는지(마운트) 확인
  console.log("🟦 AutoMatcher render", { enabled });

  useEffect(() => {
    console.log("🟩 AutoMatcher useEffect entered", { enabled });

    if (!enabled) {
      console.log("🟨 AutoMatcher disabled -> return");
      return;
    }

    const username = localStorage.getItem("username");
    console.log("🟨 localStorage username =", username);

    if (!username) {
      console.log("🟥 username 없음 -> AutoMatcher 중단 (로그인/키 확인)");
      return;
    }

    let stopped = false;
    let timer = null;

    async function tick() {
      if (stopped) return;

      console.log("⏱ AutoMatcher tick start", new Date().toLocaleTimeString());

      // 너무 자주 겹치 실행 방지
      const now = Date.now();
      if (now - lastRunAtRef.current < 3000) {
        console.log("🟧 skip: too frequent");
        return;
      }
      lastRunAtRef.current = now;

      if (inFlightRef.current) {
        console.log("🟧 skip: inFlight");
        return;
      }
      inFlightRef.current = true;

      try {
        console.log("🔵 getMarket start");
        const market = await getMarket(username);
        console.log("🔵 getMarket success", market?.target || market?.address || market);

        const me = await market.runner.getAddress();
        console.log("👤 my EOA =", me);

        const nowSec = Math.floor(Date.now() / 1000);

        // 1) 최근 주문들에서 "내 ACTIVE BUY" 찾기
        const nextId = Number(await market.nextOrderId());
        const from = Math.max(1, nextId - SCAN_LAST_N_ORDERS);
        console.log("📌 nextOrderId =", nextId, "scanFrom =", from, "nowSec =", nowSec);

        const activeBuyIds = [];

        // ✅ 샘플 1개는 꼭 찍어보자(최근 주문)
        if (nextId > 1) {
          const sample = await market.orders(BigInt(nextId - 1));
          console.log("🔍 sample last order raw =", sample);
        } else {
          console.log("ℹ️ 주문이 아직 1개도 없음(nextId<=1)");
        }

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

          // ✅ 너무 많으면 콘솔 폭탄이니까 "내 주문만" 간단히 출력
          if (isMine) {
            console.log("🧾 myOrder", { id, maker, side, status, endTime, notExpired });
          }

          if (isMine && isBuy && isActive && notExpired) {
            activeBuyIds.push(id);
          }
        }

        console.log("✅ activeBuyIds =", activeBuyIds);

        if (activeBuyIds.length === 0) {
          console.log("🟨 내 ACTIVE BUY가 없음 -> 매칭 시도 없음");
          return;
        }

        // 2) 각 BUY에 대해: "될 때만 tx" (시뮬레이션 -> 실제 실행)
        let matchedCount = 0;

        for (const buyId of activeBuyIds) {
          if (stopped) break;
          if (matchedCount >= MAX_MATCH_PER_TICK) break;

          console.log("🧪 try staticCall matchBuy", {
            buyId,
            RADIUS,
            SCAN_LIMIT_PER_BUCKET,
            MAX_EVAL,
          });

          // (A) 시뮬레이션: 성공 가능 여부만 확인
          let canMatch = true;
          try {
            await market.matchBuy.staticCall(
              BigInt(buyId),
              BigInt(RADIUS),
              BigInt(SCAN_LIMIT_PER_BUCKET),
              BigInt(MAX_EVAL)
            );
            console.log("🟩 staticCall SUCCESS -> canMatch = true", { buyId });
          } catch (e) {
            canMatch = false;
            console.log("🟥 staticCall FAILED -> canMatch = false", {
              buyId,
              short: e?.shortMessage,
              reason: e?.reason,
              message: e?.message,
              data: e?.data,
            });
          }

          if (!canMatch) continue;

          // (B) 실제 매칭 트랜잭션
          try {
            console.log("🟦 sending matchBuy tx...", { buyId });
            const tx = await market.matchBuy(
              BigInt(buyId),
              BigInt(RADIUS),
              BigInt(SCAN_LIMIT_PER_BUCKET),
              BigInt(MAX_EVAL)
            );
            console.log("🟦 tx sent:", tx.hash);

            const receipt = await tx.wait();
            console.log("🟦 tx confirmed", receipt?.hash);

            // OrderMatched 이벤트에서 tradeId 추출
            const ev = receipt.logs
              .map((log) => {
                try { return market.interface.parseLog(log); } catch { return null; }
              })
              .find((x) => x && x.name === "OrderMatched");

            if (ev) {
              const tradeId = ev.args.tradeId?.toString?.() ?? String(ev.args[2]);
              console.log("✅ AutoMatcher matched:", { buyId, tradeId });
            } else {
              console.log("✅ AutoMatcher matched (no event parsed):", { buyId });
            }

            matchedCount++;
          } catch (e) {
            console.warn("⚠️ matchBuy tx failed (race ok):", {
              buyId,
              short: e?.shortMessage,
              reason: e?.reason,
              message: e?.message,
            });
          }
        }
      } catch (e) {
        console.error("❌ AutoMatcher tick error:", {
          short: e?.shortMessage,
          reason: e?.reason,
          message: e?.message,
        });
      } finally {
        inFlightRef.current = false;
        console.log("⏱ AutoMatcher tick end");
      }
    }

    // 시작하자마자 1번 실행 + 주기 실행
    tick();
    timer = setInterval(tick, INTERVAL_MS);
    console.log("🟩 AutoMatcher interval started", INTERVAL_MS);

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      console.log("🟥 AutoMatcher cleanup (interval cleared)");
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
