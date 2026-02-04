import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getMarket } from "../web3/market";
import "./SellPage.css";

const API_BASE = "http://localhost:8080";

export default function SellPage() {
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [minEndTime, setMinEndTime] = useState("");
  const [minEndMsg, setMinEndMsg] = useState("");

  // =========================
  // 최소 종료시간 조회(백엔드)
  // =========================
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

        const res = await fetch(
          `${API_BASE}/orders/min-end-time?${qs.toString()}`
        );
        const txt = await res.text();

        if (!res.ok) {
          setMinEndMsg(txt || "최소 종료시간 계산 실패");
          return;
        }

        const data = JSON.parse(txt);
        const iso = data.minEndTime;
        if (!iso) return;

        const localVal = iso.slice(0, 16);
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
  }, [startTime, amount]);

  function onChangeEndTime(v) {
    if (minEndTime && v < minEndTime) {
      alert(`종료 시간은 최소 ${minEndTime.replace("T", " ")} 이후여야 합니다.`);
      setEndTime(minEndTime);
      return;
    }
    setEndTime(v);
  }

  // =========================
  // 온체인 SELL 주문 등록
  // - bucket 미등록이면 막기 ✅
  // - SELL은 가중치 없음(0/0/0 전송) ✅
  // =========================
  async function submitSellOrder() {
    try {
      if (!amount || !price || !startTime || !endTime) {
        alert("모든 값을 입력해주세요.");
        return;
      }

      if (minEndTime && endTime < minEndTime) {
        alert(`종료 시간은 최소 ${minEndTime.replace("T", " ")} 이후여야 합니다.`);
        return;
      }

      const amountInt = Math.floor(Number(amount));
      const priceInt = Math.floor(Number(price));

      if (!Number.isFinite(amountInt) || amountInt <= 0) {
        alert("판매 전력량(kWh)은 1 이상 정수로 입력해주세요.");
        return;
      }
      if (!Number.isFinite(priceInt) || priceInt <= 0) {
        alert("가격(₩/kWh)은 1 이상 정수로 입력해주세요.");
        return;
      }

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

      const username = localStorage.getItem("username");
      if (!username) {
        alert("로그인이 필요합니다.");
        return;
      }

      const market = await getMarket(username);

      const addr = market?.runner?.getAddress
        ? await market.runner.getAddress()
        : null;
      if (!addr) {
        alert("지갑 주소를 가져올 수 없습니다. (embedded wallet 확인)");
        return;
      }

      // ✅ bucket 확인
      const myBucket = await market.bucketOf(addr);
      if (myBucket === 0n) {
        alert(
          "❌ Bucket ID가 등록되어 있지 않습니다.\n" +
            "👉 MyPage에서 '주소 저장(DB + Bucket 온체인)'을 먼저 해주세요."
        );
        return;
      }

      // ✅ kWh available 체크
      const needKwh = BigInt(amountInt);
      const bal = await market.kwhBalance(addr);
      const lockedBefore = await market.kwhLocked(addr);
      const available = bal - lockedBefore;

      if (available < needKwh) {
        alert(
          `kWh 잔고 부족!\n` +
            `필요: ${needKwh.toString()} / 가능: ${available.toString()}\n` +
            `👉 MyPage에서 kWh를 먼저 충전해줘.`
        );
        return;
      }

      // ✅ SELL=1 createOrder(8 params)
      // ✅ SELL은 가중치 의미 없으니 0/0/0 (컨트랙트가 내부에서 0으로 고정)
      const tx = await market.createOrder(
        1,
        BigInt(amountInt),
        BigInt(priceInt),
        BigInt(startSec),
        BigInt(endSec),
        0n,
        0n,
        0n
      );

      const receipt = await tx.wait();

      const nextId = await market.nextOrderId();
      const createdId = (BigInt(nextId) - 1n).toString();

      const lockedAfter = await market.kwhLocked(addr);
      const lockedDiff = lockedAfter - lockedBefore;

      alert(
        `✅ 온체인 판매 주문 등록 완료!\n` +
          `내 Bucket: ${myBucket.toString()}\n` +
          `주문ID: ${createdId}\n` +
          `잠금 증가(kWh): ${lockedDiff.toString()}\n` +
          `Tx: ${receipt?.hash || tx.hash}`
      );

      setAmount("");
      setPrice("");
      setStartTime("");
      setEndTime("");
      setMinEndTime("");
      setMinEndMsg("");
    } catch (e) {
      console.error(e);
      const msg = e?.shortMessage || e?.reason || e?.message || "알 수 없는 오류";
      alert("❌ 온체인 주문 등록 실패!\n" + msg);
    }
  }

  return (
    <Layout>
      <div className="sp-container">
        <div className="sp-header">
          <div className="sp-headerContent">
            <div className="sp-iconWrapper">
              <span className="sp-icon">💰</span>
            </div>
            <div>
              <h1 className="sp-title">에너지 판매</h1>
              <p className="sp-subtitle">필요한 에너지를 원하는 가격과 시간에 판매하세요</p>
              <p className="sp-note">
                ※ PoC: 주문 등록은 <b>온체인(createOrder)</b>으로 처리됩니다.
                (SELL은 가중치 없음 / BUY 기준 매칭)
              </p>
            </div>
          </div>
        </div>

        <div className="sp-cardWrapper">
          <div className="sp-card">
            <div className="sp-cardHeader">
              <h2 className="sp-cardTitle">판매 정보 입력</h2>
            </div>

            <div className="sp-formGrid">
              <div className="sp-inputGroup">
                <label className="sp-label">
                  <span className="sp-labelIcon">🔋</span>
                  판매 전력량
                </label>
                <div className="sp-inputWrapper">
                  <input
                    type="number"
                    placeholder="50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="sp-input"
                  />
                  <span className="sp-inputUnit">kWh</span>
                </div>
              </div>

              <div className="sp-inputGroup">
                <label className="sp-label">
                  <span className="sp-labelIcon">💰</span>
                  희망 판매 가격
                </label>
                <div className="sp-inputWrapper">
                  <input
                    type="number"
                    placeholder="150"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="sp-input"
                  />
                  <span className="sp-inputUnit">₩/kWh</span>
                </div>
              </div>
            </div>

            <div className="sp-timeSection">
              <label className="sp-label">
                <span className="sp-labelIcon">⏰</span>
                판매 기간 설정
              </label>

              <div className="sp-timeRow">
                <div className="sp-timeBox">
                  <span className="sp-timeLabel">시작 시간</span>
                  <input
                    type="datetime-local"
                    className="sp-timeInput"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div className="sp-arrowIcon">→</div>

                <div className="sp-timeBox">
                  <span className="sp-timeLabel">종료 시간</span>
                  <input
                    type="datetime-local"
                    className="sp-timeInput"
                    value={endTime}
                    min={minEndTime || undefined}
                    onChange={(e) => onChangeEndTime(e.target.value)}
                  />
                </div>
              </div>

              {(minEndTime || minEndMsg) && (
                <div className="sp-minEndHint">
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

            {amount && price && (
              <div className="sp-estimateCard">
                <div className="sp-estimateRow">
                  <span className="sp-estimateLabel">판매 수량</span>
                  <span className="sp-estimateValue">
                    {parseFloat(amount).toLocaleString()} kWh
                  </span>
                </div>
                <div className="sp-estimateRow">
                  <span className="sp-estimateLabel">희망 단가</span>
                  <span className="sp-estimateValue">
                    ₩{parseFloat(price).toLocaleString()}
                  </span>
                </div>
                <div className="sp-estimateDivider" />
                <div className="sp-estimateRow">
                  <span className="sp-estimateLabelTotal">예상 수익</span>
                  <span className="sp-estimateValueTotal">
                    ₩{(parseFloat(amount) * parseFloat(price)).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <button className="sp-primaryBtn" onClick={submitSellOrder}>
              <span className="sp-btnIcon">✓</span>
              판매 주문 등록하기 (온체인)
            </button>

            <div className="sp-notice">
              💡 PoC: 주문은 블록체인에 기록됩니다. (SELL은 가중치 없이 등록)
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
