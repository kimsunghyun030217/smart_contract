import React, { useMemo, useState, useEffect } from "react";
import Layout from "../components/Layout";
import { getMarket } from "../web3/market"; // ✅ 추가: 온체인 호출
import "./BuyPage.css";

const API_BASE = "http://localhost:8080"; // ✅ (선택) 최소 종료시간 계산용 백엔드

export default function BuyPage() {
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // ✅ 최소 종료시간 표시용
  const [minEndTime, setMinEndTime] = useState("");
  const [minEndMsg, setMinEndMsg] = useState("");

  // ✅ 추가: 가중치(0~1). 합은 자동으로 1 되게 정규화
  const [weights, setWeights] = useState({
    price: 0.6,
    distance: 0.3,
    trust: 0.1,
  });

  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  const normalize = (p, d, t) => {
    const sum = p + d + t;
    if (sum <= 0) return { price: 0.6, distance: 0.3, trust: 0.1 };
    return { price: p / sum, distance: d / sum, trust: t / sum };
  };

  const setWeight = (key, value) => {
    const v = clamp01(value);
    setWeights((prev) =>
      normalize(
        key === "price" ? v : prev.price,
        key === "distance" ? v : prev.distance,
        key === "trust" ? v : prev.trust
      )
    );
  };

  const presets = {
    cheap: { price: 0.7, distance: 0.2, trust: 0.1 },
    near: { price: 0.3, distance: 0.6, trust: 0.1 },
    safe: { price: 0.3, distance: 0.2, trust: 0.5 },
    balanced: { price: 0.6, distance: 0.3, trust: 0.1 },
  };

  const weightSummaryText = useMemo(() => {
    const p = Math.round(weights.price * 100);
    const d = Math.round(weights.distance * 100);
    const t = Math.round(weights.trust * 100);
    return `가격 ${p}% · 거리 ${d}% · 신뢰 ${t}%`;
  }, [weights]);

  // =========================================
  // ✅ 최소 종료시간(minEndTime) 조회 (백엔드)
  // =========================================
  useEffect(() => {
    async function fetchMinEndTime() {
      setMinEndMsg("");
      setMinEndTime("");

      if (!startTime || !amount) return;

      const amountNum = Number(amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) return;

      try {
        const qs = new URLSearchParams({
          startTime: startTime + ":00",
          amountKwh: String(amountNum),
        });

        const res = await fetch(`${API_BASE}/orders/min-end-time?${qs.toString()}`);
        const txt = await res.text();

        if (!res.ok) {
          setMinEndMsg(txt || "최소 종료시간 계산 실패");
          return;
        }

        const data = JSON.parse(txt);
        const iso = data.minEndTime;
        if (!iso) return;

        const localVal = iso.slice(0, 16); // YYYY-MM-DDTHH:mm
        setMinEndTime(localVal);

        if (!endTime || endTime < localVal) {
          setEndTime(localVal);
        }
      } catch (e) {
        console.error(e);
        setMinEndMsg("서버 연결 실패(최소 종료시간)");
      }
    }

    const t = setTimeout(fetchMinEndTime, 200);
    return () => clearTimeout(t);
  }, [startTime, amount]); // endTime 제외(의도)

  function onChangeEndTime(v) {
    if (minEndTime && v < minEndTime) {
      alert(`종료 시간은 최소 ${minEndTime.replace("T", " ")} 이후여야 합니다.`);
      setEndTime(minEndTime);
      return;
    }
    setEndTime(v);
  }

  // =========================================
  // ✅ 온체인 BUY 주문 등록
  // - side = 0 (BUY)
  // - fund()로 PoC 가상 KRW 충전(부족하면 자동 충전)
  // - createOrder() 트랜잭션 전송
  // =========================================
  async function submitBuyOrder() {
    try {
      if (!amount || !price || !startTime || !endTime) {
        alert("모든 값을 입력해주세요.");
        return;
      }

      if (minEndTime && endTime < minEndTime) {
        alert(`종료 시간은 최소 ${minEndTime.replace("T", " ")} 이후여야 합니다.`);
        return;
      }

      // 컨트랙트는 uint256이라 PoC에서는 정수로만 처리 권장
      const amountInt = Math.floor(Number(amount));
      const priceInt = Math.floor(Number(price));

      if (!Number.isFinite(amountInt) || amountInt <= 0) {
        alert("구매 전력량(kWh)은 1 이상 정수로 입력해주세요.");
        return;
      }
      if (!Number.isFinite(priceInt) || priceInt <= 0) {
        alert("가격(₩/kWh)은 1 이상 정수로 입력해주세요.");
        return;
      }

      // datetime-local -> unix seconds
      const startSec = Math.floor(new Date(startTime).getTime() / 1000);
      const endSec = Math.floor(new Date(endTime).getTime() / 1000);
      const nowSec = Math.floor(Date.now() / 1000);

      if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
        alert("시간 형식이 올바르지 않습니다.");
        return;
      }
      if (startSec >= endSec) {
        alert("종료 시간은 시작 시간 이후여야 합니다.");
        return;
      }
      if (endSec <= nowSec) {
        alert("종료 시간은 현재보다 미래여야 합니다.");
        return;
      }

      const market = await getMarket();

      // signer 주소
      const addr =
        market?.runner?.getAddress ? await market.runner.getAddress() : null;

      // 비용 = amount * price
      const cost = BigInt(amountInt) * BigInt(priceInt);

      // 현재 가상 KRW 잔고/잠금 조회해서 부족하면 자동 fund
      if (addr) {
        const bal = await market.krwBalance(addr); // bigint
        const locked = await market.krwLocked(addr); // bigint
        const available = bal - locked;

        if (available < cost) {
          const need = cost - available;
          // PoC: 부족분만큼 자동 충전
          const txFund = await market.fund(need, 0);
          await txFund.wait();
        }
      } else {
        // 주소 못 가져오면 그냥 넉넉히 충전(최후수단)
        const txFund = await market.fund(cost, 0);
        await txFund.wait();
      }

      // BUY=0
      const tx = await market.createOrder(
        0,
        BigInt(amountInt),
        BigInt(priceInt),
        BigInt(startSec),
        BigInt(endSec)
      );

      const receipt = await tx.wait();

      // 주문 id는 nextOrderId() - 1 로 추정(트랜잭션 완료 후)
      const nextId = await market.nextOrderId();
      const createdId = (BigInt(nextId) - 1n).toString();

      alert(
        `✅ 온체인 구매 주문 등록 완료!\n주문ID: ${createdId}\nTx: ${
          receipt?.hash || tx.hash
        }`
      );

      // 폼 리셋
      setAmount("");
      setPrice("");
      setStartTime("");
      setEndTime("");
      setMinEndTime("");
      setMinEndMsg("");
      setWeights(presets.balanced);
    } catch (e) {
      console.error(e);

      // 메타마스크 거절/리버트 메시지 간단 처리
      const msg = e?.shortMessage || e?.reason || e?.message || "알 수 없는 오류";
      alert("❌ 온체인 주문 등록 실패!\n" + msg);
    }
  }

  return (
    <Layout>
      <div className="bp-container">
        {/* 헤더 섹션 */}
        <div className="bp-header">
          <div className="bp-headerContent">
            <div className="bp-iconWrapper">
              <span className="bp-icon">⚡</span>
            </div>
            <div>
              <h1 className="bp-title">에너지 구매</h1>
              <p className="bp-subtitle">필요한 에너지를 원하는 가격과 시간에 구매하세요</p>
              <p className="bp-note">
                ※ PoC: 주문 등록은 <b>온체인(createOrder)</b>으로 처리됩니다.
                (가중치/최소종료시간은 화면 편의용)
              </p>
            </div>
          </div>
        </div>

        {/* 구매 카드 */}
        <div className="bp-cardWrapper">
          <div className="bp-card">
            <div className="bp-cardHeader">
              <h2 className="bp-cardTitle">구매 정보 입력</h2>
            </div>

            {/* 수량 & 가격 그리드 */}
            <div className="bp-formGrid">
              <div className="bp-inputGroup">
                <label className="bp-label">
                  <span className="bp-labelIcon">🔋</span>
                  구매 전력량
                </label>
                <div className="bp-inputWrapper">
                  <input
                    type="number"
                    placeholder="50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bp-input"
                  />
                  <span className="bp-inputUnit">kWh</span>
                </div>
              </div>

              <div className="bp-inputGroup">
                <label className="bp-label">
                  <span className="bp-labelIcon">💰</span>
                  희망 구매 가격
                </label>
                <div className="bp-inputWrapper">
                  <input
                    type="number"
                    placeholder="150"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="bp-input"
                  />
                  <span className="bp-inputUnit">₩/kWh</span>
                </div>
              </div>
            </div>

            {/* 시간 범위 */}
            <div className="bp-timeSection">
              <label className="bp-label">
                <span className="bp-labelIcon">⏰</span>
                구매 기간 설정
              </label>

              <div className="bp-timeRow">
                <div className="bp-timeBox">
                  <span className="bp-timeLabel">시작 시간</span>
                  <input
                    type="datetime-local"
                    className="bp-timeInput"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div className="bp-arrowIcon">→</div>

                <div className="bp-timeBox">
                  <span className="bp-timeLabel">종료 시간</span>
                  <input
                    type="datetime-local"
                    className="bp-timeInput"
                    value={endTime}
                    min={minEndTime || undefined}
                    onChange={(e) => onChangeEndTime(e.target.value)}
                  />
                </div>
              </div>

              {(minEndTime || minEndMsg) && (
                <div className="bp-minEndHint">
                  {minEndTime ? (
                    <>
                      ✅ 최소 종료시간: <b>{minEndTime.replace("T", " ")}</b>{" "}
                      (7kW 기준 + 버퍼)
                    </>
                  ) : (
                    <>⚠️ {minEndMsg}</>
                  )}
                </div>
              )}
            </div>

            {/* ✅ 매칭 가중치 카드 (PoC에서는 온체인 저장 안 함) */}
            <div className="bp-weightCard">
              <div className="bp-weightTop">
                <div className="bp-weightTitle">매칭 기준 설정</div>
                <div className="bp-weightSummary">{weightSummaryText}</div>
              </div>

              <div className="bp-presetRow">
                <button
                  className="bp-presetBtn"
                  onClick={() => setWeights(presets.cheap)}
                >
                  최저가 우선
                </button>
                <button
                  className="bp-presetBtn"
                  onClick={() => setWeights(presets.near)}
                >
                  가까운 거래
                </button>
                <button
                  className="bp-presetBtn"
                  onClick={() => setWeights(presets.safe)}
                >
                  안전 우선
                </button>
                <button
                  className="bp-presetBtn"
                  onClick={() => setWeights(presets.balanced)}
                >
                  기본값
                </button>
              </div>

              <div className="bp-weightGrid">
                <div className="bp-weightItem">
                  <div className="bp-weightLabelRow">
                    <span className="bp-weightLabel">가격 중요도</span>
                    <span className="bp-weightPct">
                      {Math.round(weights.price * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weights.price}
                    onChange={(e) => setWeight("price", Number(e.target.value))}
                    className="bp-range"
                  />
                  <div className="bp-weightHint">
                    가격이 유리한 상대를 더 우선 매칭
                  </div>
                </div>

                <div className="bp-weightItem">
                  <div className="bp-weightLabelRow">
                    <span className="bp-weightLabel">거리 중요도</span>
                    <span className="bp-weightPct">
                      {Math.round(weights.distance * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weights.distance}
                    onChange={(e) =>
                      setWeight("distance", Number(e.target.value))
                    }
                    className="bp-range"
                  />
                  <div className="bp-weightHint">
                    가까운 상대를 더 우선 매칭
                  </div>
                </div>

                <div className="bp-weightItem">
                  <div className="bp-weightLabelRow">
                    <span className="bp-weightLabel">신뢰 중요도</span>
                    <span className="bp-weightPct">
                      {Math.round(weights.trust * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weights.trust}
                    onChange={(e) => setWeight("trust", Number(e.target.value))}
                    className="bp-range"
                  />
                  <div className="bp-weightHint">
                    신뢰도 높은 상대를 더 우선 매칭
                  </div>
                </div>
              </div>

              <div className="bp-weightFootnote">
                합계는 자동으로 100%로 맞춰져요. (PoC: 이 값은 온체인에 저장되지
                않아요)
              </div>
            </div>

            {/* 예상 금액 카드 */}
            {amount && price && (
              <div className="bp-estimateCard">
                <div className="bp-estimateRow">
                  <span className="bp-estimateLabel">구매 수량</span>
                  <span className="bp-estimateValue">
                    {parseFloat(amount).toLocaleString()} kWh
                  </span>
                </div>
                <div className="bp-estimateRow">
                  <span className="bp-estimateLabel">희망 단가</span>
                  <span className="bp-estimateValue">
                    ₩{parseFloat(price).toLocaleString()}
                  </span>
                </div>
                <div className="bp-estimateDivider" />
                <div className="bp-estimateRow">
                  <span className="bp-estimateLabelTotal">예상 결제금액</span>
                  <span className="bp-estimateValueTotal">
                    ₩{(parseFloat(amount) * parseFloat(price)).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* ✅ 버튼: 백엔드 POST 대신 온체인 트랜잭션 */}
            <button className="bp-primaryBtn" onClick={submitBuyOrder}>
              <span className="bp-btnIcon">✓</span>
              구매 주문 등록하기 (온체인)
            </button>

            <div className="bp-notice">
              💡 PoC: 주문은 블록체인에 기록됩니다. (메타마스크 서명 필요)
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
