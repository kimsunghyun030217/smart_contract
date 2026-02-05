import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { getMarket } from "../web3/market";
import { ethers } from "ethers";
import "./ChainMonitorPage.css";

export default function ChainMonitorPage() {
  const [에러, 에러설정] = useState("");
  const [로딩중, 로딩중설정] = useState(true);

  const [내것만보기, 내것만보기설정] = useState(false);

  const [체인정보, 체인정보설정] = useState({
    rpc: "http://127.0.0.1:8545",
    최신블록: 0,
    내주소: "",
    내이더: "",
    컨트랙트주소: "",
  });

  const [블록목록, 블록목록설정] = useState([]);
  const [주문목록, 주문목록설정] = useState([]);

  const 폴링간격MS = 1500;
  const 블록조회개수 = 200;

  const 짧게 = (값, n = 6) =>
    typeof 값 === "string" && 값.startsWith("0x")
      ? `${값.slice(0, 2 + n)}…${값.slice(-4)}`
      : String(값 ?? "");

  function 안전문자열(x) {
    try {
      if (x == null) return "";
      if (typeof x === "bigint") return x.toString();
      if (typeof x?.toString === "function") return x.toString();
      return String(x);
    } catch {
      return "";
    }
  }

  const 트랜잭션해시얻기 = (tx) => (typeof tx === "string" ? tx : tx?.hash);

  function 인자정리(args) {
    const out = {};
    for (const k of Object.keys(args)) {
      if (/^\d+$/.test(k)) continue;
      out[k] = 안전문자열(args[k]);
    }
    return out;
  }

  function 주문매핑(o, fallbackId) {
    const id = o?.id != null ? Number(o.id) : fallbackId;

    const maker = o?.maker ?? o?.[1] ?? "";
    const side = o?.side ?? o?.[2] ?? "";
    const amountKwh = o?.amountKwh ?? o?.[3] ?? "";
    const pricePerKwh = o?.pricePerKwh ?? o?.[4] ?? "";
    const startTime = o?.startTime ?? o?.[5] ?? "";
    const endTime = o?.endTime ?? o?.[6] ?? "";
    const status = o?.status ?? o?.[7] ?? "";

    const wPriceBps = o?.wPriceBps ?? o?.[8];
    const wDistBps = o?.wDistBps ?? o?.[9];
    const wTrustBps = o?.wTrustBps ?? o?.[10];
    const bucketId = o?.bucketId ?? o?.[11];

    return {
      id,
      maker: String(maker),
      side: 안전문자열(side),
      amountKwh: 안전문자열(amountKwh),
      pricePerKwh: 안전문자열(pricePerKwh),
      startTime: 안전문자열(startTime),
      endTime: 안전문자열(endTime),
      status: 안전문자열(status),
      wPriceBps: wPriceBps != null ? 안전문자열(wPriceBps) : "",
      wDistBps: wDistBps != null ? 안전문자열(wDistBps) : "",
      wTrustBps: wTrustBps != null ? 안전문자열(wTrustBps) : "",
      bucketId: bucketId != null ? 안전문자열(bucketId) : "",
    };
  }

  const 사이드라벨 = (v) => {
    const n = Number(안전문자열(v));
    if (Number.isNaN(n)) return String(v ?? "");
    return n === 0 ? "구매" : n === 1 ? "판매" : String(v ?? "");
  };

  const 상태라벨 = (v) => {
    const n = Number(안전문자열(v));
    if (Number.isNaN(n)) return String(v ?? "");
    if (n === 0) return "활성";
    if (n === 1) return "취소";
    if (n === 2) return "매칭";
    if (n === 3) return "완료";
    if (n === 4) return "만료";
    return String(v ?? "");
  };

  const 주소같음 = (a, b) => {
    if (!a || !b) return false;
    try {
      return String(a).toLowerCase() === String(b).toLowerCase();
    } catch {
      return false;
    }
  };

  function tx이벤트요약(receipt, 컨트랙트, 컨트랙트주소) {
    try {
      const logs = receipt?.logs || [];
      const cAddr = (컨트랙트주소 || "").toLowerCase();

      const out = [];
      for (const lg of logs) {
        if (!lg?.address) continue;
        if (lg.address.toLowerCase() !== cAddr) continue;

        try {
          const parsed = 컨트랙트.interface.parseLog({
            topics: lg.topics,
            data: lg.data,
          });
          out.push({
            name: parsed?.name || "이벤트",
            args: parsed?.args ? 인자정리(parsed.args) : {},
          });
        } catch {
          out.push({ name: "알수없는로그", args: {} });
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  async function 모두불러오기({ 조용히 = false } = {}) {
    try {
      에러설정("");
      if (!조용히) 로딩중설정(true);

      const username = localStorage.getItem("username") || "";
      const 컨트랙트 = await getMarket(username);
      const 프로바이더 = 컨트랙트.runner?.provider || 컨트랙트.provider;
      if (!프로바이더) throw new Error("프로바이더를 찾을 수 없어요. getMarket() 확인 필요");

      const 컨트랙트주소 = await 컨트랙트.getAddress();

      const 서명자 =
        컨트랙트.runner && typeof 컨트랙트.runner.getAddress === "function"
          ? 컨트랙트.runner
          : null;

      const 내주소 = 서명자 ? await 서명자.getAddress() : "";
      const 최신블록 = await 프로바이더.getBlockNumber();

      let 내이더 = "";
      if (내주소) {
        const 잔고 = await 프로바이더.getBalance(내주소);
        내이더 = ethers.formatEther(잔고);
      }

      체인정보설정((prev) => ({
        ...prev,
        최신블록,
        내주소,
        내이더,
        컨트랙트주소,
      }));

      const from = Math.max(0, 최신블록 - (블록조회개수 - 1));
      const 블록번호들 = [];
      for (let b = 최신블록; b >= from; b--) 블록번호들.push(b);

      const 불러온블록들 = [];

      for (const b of 블록번호들) {
        const blk = await 프로바이더.getBlock(b, true);
        if (!blk) continue;

        const txHashes = (blk.transactions || [])
          .map(트랜잭션해시얻기)
          .filter(Boolean);

        const 영수증맵 = new Map();
        const 트랜잭션맵 = new Map();

        await Promise.all(
          txHashes.map(async (h) => {
            try {
              const r = await 프로바이더.getTransactionReceipt(h);
              if (r) 영수증맵.set(h, r);
            } catch {}
          })
        );

        await Promise.all(
          txHashes.map(async (h) => {
            try {
              const t = await 프로바이더.getTransaction(h);
              if (t) 트랜잭션맵.set(h, t);
            } catch {}
          })
        );

        let 트랜잭션들 = txHashes.map((h) => {
          const t = 트랜잭션맵.get(h);
          const r = 영수증맵.get(h);

          const gasUsed = r?.gasUsed ?? null;
          const 이벤트들 = tx이벤트요약(r, 컨트랙트, 컨트랙트주소);

          return {
            해시: h,
            보낸주소: t?.from || "",
            받은주소: t?.to || "",
            가스사용량: gasUsed != null ? 안전문자열(gasUsed) : "",
            이벤트들,
          };
        });

        if (내것만보기 && 내주소) {
          트랜잭션들 = 트랜잭션들.filter(
            (t) => 주소같음(t.보낸주소, 내주소) || 주소같음(t.받은주소, 내주소)
          );
        }

        if (!내것만보기 || 트랜잭션들.length > 0) {
          불러온블록들.push({
            번호: blk.number,
            해시: blk.hash,
            타임스탬프: blk.timestamp,
            트랜잭션들,
          });
        }
      }

      불러온블록들.sort((a, b) => b.번호 - a.번호);
      블록목록설정(불러온블록들);

      let nextId = 1;
      try {
        const v = await 컨트랙트.nextOrderId();
        nextId = Number(v);
      } catch {
        nextId = 1;
      }

      const 불러온주문들 = [];
      const 상한 = Math.min(nextId, 201);
      for (let i = 1; i < 상한; i++) {
        try {
          const o = await 컨트랙트.orders(i);
          const 주문 = 주문매핑(o, i);
          if (!주문.maker || /^0x0{40}$/i.test(주문.maker)) continue;

          if (!내것만보기 || 주소같음(주문.maker, 내주소)) {
            불러온주문들.push(주문);
          }
        } catch {}
      }
      주문목록설정(불러온주문들);
    } catch (e) {
      에러설정(e?.message || String(e));
    } finally {
      로딩중설정(false);
    }
  }

  useEffect(() => {
    let alive = true;
    let timerId = null;
    let inFlight = false;

    const tick = async (silent) => {
      if (!alive) return;
      if (inFlight) return;
      inFlight = true;
      try {
        await 모두불러오기({ 조용히: silent });
      } finally {
        inFlight = false;
      }
    };

    tick(false);
    timerId = setInterval(() => tick(true), 폴링간격MS);

    return () => {
      alive = false;
      if (timerId) clearInterval(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [내것만보기]);

  return (
    <Layout>
      <div className="cm-wrap">
        <div className="cm-header">
          <div className="cm-header-left">
            <h1 className="cm-title">온체인 기록 모니터</h1>
            <div className="cm-subtitle">블록/트랜잭션/이벤트/주문을 한 화면에서 확인</div>
          </div>

          <div className="cm-actions">
            <button
              className={`cm-btn ${내것만보기 ? "cm-btn--primary" : ""}`}
              onClick={() => 내것만보기설정((v) => !v)}
              title="내 주소(보낸/받은/메이커)에 관련된 항목만 표시"
            >
              {내것만보기 ? "내 것만 보는 중" : "전체 보는 중"}
            </button>

            <button className="cm-btn" onClick={() => 모두불러오기()}>
              새로고침
            </button>
          </div>
        </div>

        {에러 && (
          <div className="cm-card cm-card--error">
            <div className="cm-card-title">에러</div>
            <div className="cm-mono">{에러}</div>
          </div>
        )}

        <div className="cm-card">
          <div className="cm-card-head">
            <h2 className="cm-h2">체인 상태</h2>
            <span className="cm-badge">{로딩중 ? "로딩중…" : "실시간"}</span>
          </div>

          <div className="cm-kv">
            <div className="cm-kv-row">
              <b>RPC</b> <span className="cm-mono">{체인정보.rpc}</span>
            </div>
            <div className="cm-kv-row">
              <b>최신 블록</b> <span className="cm-mono">{체인정보.최신블록}</span>
            </div>
            <div className="cm-kv-row">
              <b>내 주소</b>{" "}
              <span className="cm-mono">{체인정보.내주소 || "(서명자 없음)"}</span>
            </div>
            <div className="cm-kv-row">
              <b>내 ETH</b>{" "}
              <span className="cm-mono">
                {체인정보.내이더 ? `${체인정보.내이더} ETH` : "-"}
              </span>
            </div>
            <div className="cm-kv-row">
              <b>컨트랙트</b> <span className="cm-mono">{체인정보.컨트랙트주소}</span>
            </div>
          </div>
        </div>

        <div className="cm-card">
          <div className="cm-card-head">
            <h2 className="cm-h2">최근 블록 / 트랜잭션 (이벤트 포함)</h2>
            <div className="cm-muted">최근 {블록조회개수}개 블록</div>
          </div>

          {블록목록.map((b) => (
            <div key={b.번호} className="cm-block">
              <div className="cm-block-head">
                <div className="cm-block-title">
                  <b>Block #{b.번호}</b>{" "}
                  <span className="cm-mono cm-hash">{짧게(b.해시, 8)}</span>
                </div>
                <div className="cm-muted">
                  {new Date(b.타임스탬프 * 1000).toLocaleString()}
                </div>
              </div>

              <div className="cm-table-wrap">
                <table className="cm-table cm-table-wide">
                  <thead>
                    <tr>
                      <th>트랜잭션</th>
                      <th>이벤트</th>
                      <th>보낸 주소</th>
                      <th>받는 주소</th>
                      <th>가스 사용량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.트랜잭션들.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="cm-empty">
                          트랜잭션 없음
                        </td>
                      </tr>
                    ) : (
                      b.트랜잭션들.map((t) => (
                        <tr key={t.해시}>
                          <td className="cm-mono" title={t.해시}>
                            {짧게(t.해시, 8)}
                          </td>

                          <td>
                            {t.이벤트들?.length ? (
                              <div className="cm-event-wrap">
                                {t.이벤트들.map((ev, i) => (
                                  <span
                                    key={`${t.해시}-ev-${i}`}
                                    className="cm-event-chip"
                                    title={
                                      Object.keys(ev.args || {}).length
                                        ? JSON.stringify(ev.args)
                                        : ""
                                    }
                                  >
                                    <b>{ev.name}</b>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="cm-muted">-</span>
                            )}
                          </td>

                          <td className="cm-mono">{t.보낸주소 ? 짧게(t.보낸주소, 8) : "-"}</td>
                          <td className="cm-mono">{t.받은주소 ? 짧게(t.받은주소, 8) : "-"}</td>
                          <td className="cm-mono">{t.가스사용량 || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="cm-card">
          <div className="cm-card-head">
            <h2 className="cm-h2">온체인 주문 목록</h2>
            <div className="cm-muted">nextOrderId 기반 1..N-1 조회</div>
          </div>

          <div className="cm-table-wrap">
            <table className="cm-table">
              <thead>
                <tr>
                  <th>주문 ID</th>
                  <th>생성자(메이커)</th>
                  <th>구분</th>
                  <th>수량(kWh)</th>
                  <th>단가</th>
                  <th>시작 시간</th>
                  <th>종료 시간</th>
                  <th>상태</th>
                  <th>가중치(Price/Dist/Trust)</th>
                  <th>Bucket</th>
                </tr>
              </thead>
              <tbody>
                {주문목록.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="cm-empty">
                      주문이 없거나 조회가 안 됐을 수 있어요.
                    </td>
                  </tr>
                ) : (
                  주문목록.map((o) => (
                    <tr key={o.id}>
                      <td className="cm-mono">{o.id}</td>
                      <td className="cm-mono">{짧게(o.maker, 8)}</td>
                      <td className="cm-mono">{사이드라벨(o.side)}</td>
                      <td className="cm-mono">{o.amountKwh}</td>
                      <td className="cm-mono">{o.pricePerKwh}</td>
                      <td className="cm-mono">{o.startTime}</td>
                      <td className="cm-mono">{o.endTime}</td>
                      <td className="cm-mono">{상태라벨(o.status)}</td>
                      <td className="cm-mono">
                        {o.wPriceBps}/{o.wDistBps}/{o.wTrustBps}
                      </td>
                      <td className="cm-mono">{o.bucketId}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cm-footer">
          끝: 이제 “이벤트”는 트랜잭션 옆에서 바로 확인할 수 있어요.
        </div>
      </div>
    </Layout>
  );
}
