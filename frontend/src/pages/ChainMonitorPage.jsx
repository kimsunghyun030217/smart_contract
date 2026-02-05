import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { getMarket } from "../web3/market";
import { ethers } from "ethers";
import "./ChainMonitorPage.css";

export default function ChainMonitorPage() {
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [chainInfo, setChainInfo] = useState({
    rpc: "http://127.0.0.1:8545",
    latestBlock: 0,
    myAddress: "",
    myEth: "",
    contractAddress: "",
  });

  const [blocks, setBlocks] = useState([]); // [{ number, hash, timestamp, txs: [] }]
  const [events, setEvents] = useState([]); // [{ blockNumber, txHash, name, args }]
  const [orders, setOrders] = useState([]); // mapped orders

  const POLL_MS = 1500;
  const BLOCK_LOOKBACK = 8;

  const short = (v, n = 6) =>
    typeof v === "string" && v.startsWith("0x")
      ? `${v.slice(0, 2 + n)}…${v.slice(-4)}`
      : String(v ?? "");

  function safeToString(x) {
    try {
      if (x == null) return "";
      if (typeof x === "bigint") return x.toString();
      if (typeof x?.toString === "function") return x.toString();
      return String(x);
    } catch {
      return "";
    }
  }

  const getTxHash = (tx) => (typeof tx === "string" ? tx : tx?.hash);

  // ethers parseLog args 정리
  function normalizeArgs(args) {
    const out = {};
    for (const k of Object.keys(args)) {
      if (/^\d+$/.test(k)) continue;
      out[k] = safeToString(args[k]);
    }
    return out;
  }

  function mapOrder(o, fallbackId) {
    const id = o?.id != null ? Number(o.id) : fallbackId;

    const maker = o?.maker ?? o?.[1] ?? "";
    const side = o?.side ?? o?.[2] ?? "";
    const amountKwh = o?.amountKwh ?? o?.[3] ?? "";
    const pricePerKwh = o?.pricePerKwh ?? o?.[4] ?? "";
    const startTime = o?.startTime ?? o?.[5] ?? "";
    const endTime = o?.endTime ?? o?.[6] ?? "";
    const status = o?.status ?? o?.[7] ?? "";
    const w = o?.w ?? o?.wBps ?? o?.[8];

    return {
      id,
      maker: String(maker),
      side: safeToString(side),
      amountKwh: safeToString(amountKwh),
      pricePerKwh: safeToString(pricePerKwh),
      startTime: safeToString(startTime),
      endTime: safeToString(endTime),
      status: safeToString(status),
      w: w != null ? safeToString(w) : "",
    };
  }

  async function loadAll({ silent = false } = {}) {
    try {
      setErr("");
      if (!silent) setLoading(true);

      // ✅ 마이페이지랑 똑같이 username 기반 signer로 Contract 만들기
      const username = localStorage.getItem("username") || "";
      const contract = await getMarket(username);
      const provider = contract.runner?.provider || contract.provider;
      if (!provider) throw new Error("provider를 찾을 수 없어요. getMarket() 확인 필요");

      const contractAddress = await contract.getAddress();

      const signer =
        contract.runner && typeof contract.runner.getAddress === "function"
          ? contract.runner
          : null;

      const myAddress = signer ? await signer.getAddress() : "";
      const latestBlock = await provider.getBlockNumber();

      let myEth = "";
      if (myAddress) {
        const bal = await provider.getBalance(myAddress);
        myEth = ethers.formatEther(bal); // ✅ ETH로 보기 좋게
      }

      setChainInfo((prev) => ({
        ...prev,
        latestBlock,
        myAddress,
        myEth,
        contractAddress,
      }));

      // 최근 블록 범위
      const from = Math.max(0, latestBlock - (BLOCK_LOOKBACK - 1));
      const blockNums = [];
      for (let b = latestBlock; b >= from; b--) blockNums.push(b);

      const fetchedBlocks = [];
      const fetchedEvents = [];

      for (const b of blockNums) {
        const blk = await provider.getBlock(b, true);
        if (!blk) continue;

        // tx 해시 목록 뽑기
        const txHashes = (blk.transactions || [])
          .map(getTxHash)
          .filter(Boolean);

        // ✅ receipt/tx 상세를 미리 가져와서 표를 꽉 채움 (가스 포함)
        const receiptMap = new Map();
        const txMap = new Map();

        // receipts
        await Promise.all(
          txHashes.map(async (h) => {
            try {
              const r = await provider.getTransactionReceipt(h);
              if (r) receiptMap.set(h, r);
            } catch {}
          })
        );

        // transactions (from/to/value 채우기)
        await Promise.all(
          txHashes.map(async (h) => {
            try {
              const t = await provider.getTransaction(h);
              if (t) txMap.set(h, t);
            } catch {}
          })
        );

        const txs = txHashes.map((h) => {
          const t = txMap.get(h);
          const r = receiptMap.get(h);

          const gasUsed = r?.gasUsed ?? null; // BigInt
          const gasPrice = r?.effectiveGasPrice ?? null; // BigInt
          const feeWei =
            gasUsed != null && gasPrice != null ? gasUsed * gasPrice : null;

          return {
            hash: h,
            from: t?.from || "",
            to: t?.to || "",
            valueWei: t?.value != null ? safeToString(t.value) : "",
            gasUsed: gasUsed != null ? safeToString(gasUsed) : "",
            feeEth: feeWei != null ? ethers.formatEther(feeWei) : "",
          };
        });

        fetchedBlocks.push({
          number: blk.number,
          hash: blk.hash,
          timestamp: blk.timestamp,
          txs,
        });

        // ✅ 이벤트: receipt 로그에서 컨트랙트 주소만 추출/디코딩
        for (const h of txHashes) {
          const receipt = receiptMap.get(h);
          if (!receipt?.logs?.length) continue;

          for (const log of receipt.logs) {
            if (!log.address || log.address.toLowerCase() !== contractAddress.toLowerCase())
              continue;

            try {
              const parsed = contract.interface.parseLog({
                topics: log.topics,
                data: log.data,
              });
              fetchedEvents.push({
                blockNumber: receipt.blockNumber,
                txHash: receipt.hash,
                name: parsed?.name || "Event",
                args: parsed?.args ? normalizeArgs(parsed.args) : {},
              });
            } catch {
              fetchedEvents.push({
                blockNumber: receipt.blockNumber,
                txHash: receipt.hash,
                name: "UnknownLog",
                args: {},
              });
            }
          }
        }
      }

      fetchedBlocks.sort((a, b) => b.number - a.number);
      fetchedEvents.sort((a, b) => (b.blockNumber ?? 0) - (a.blockNumber ?? 0));

      setBlocks(fetchedBlocks);
      setEvents(fetchedEvents.slice(0, 50));

      // 주문 목록
      let nextId = 0;
      try {
        const v = await contract.nextOrderId();
        nextId = Number(v);
      } catch {
        nextId = 0;
      }

      const fetchedOrders = [];
      const maxOrdersToShow = Math.min(nextId, 200);
      for (let i = 0; i < maxOrdersToShow; i++) {
        try {
          const o = await contract.orders(i);
          fetchedOrders.push(mapOrder(o, i));
        } catch {}
      }

      setOrders(fetchedOrders);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      await loadAll();
      if (!alive) return;

      const t = setInterval(() => loadAll({ silent: true }), POLL_MS);
      return () => clearInterval(t);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const styles = useMemo(
    () => ({
      wrap: { padding: 16, display: "grid", gap: 16 },
      card: { border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, background: "#fff" },
      titleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
      h2: { margin: 0, fontSize: 16 },
      small: { fontSize: 12, opacity: 0.8 },
      mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12 },
      table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
      th: { textAlign: "left", borderBottom: "1px solid #eee", padding: "8px 6px" },
      td: { borderBottom: "1px solid #f3f4f6", padding: "8px 6px", verticalAlign: "top" },
      badge: { display: "inline-block", padding: "2px 8px", borderRadius: 999, border: "1px solid #ddd", fontSize: 12 },
      row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
    }),
    []
  );

  return (
    <Layout>
      <div style={styles.wrap}>
        <div style={styles.titleRow}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>온체인 기록 모니터</h1>
            <div style={styles.small}>블록/트랜잭션/이벤트/주문을 한 화면에서 확인</div>
          </div>
          <button
            onClick={() => loadAll()}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
          >
            새로고침
          </button>
        </div>

        {err && (
          <div style={{ ...styles.card, borderColor: "#fecaca", background: "#fff5f5" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>에러</div>
            <div style={styles.mono}>{err}</div>
          </div>
        )}

        <div style={styles.card}>
          <div style={styles.titleRow}>
            <h2 style={styles.h2}>체인 상태</h2>
            <span style={styles.badge}>{loading ? "로딩중…" : "live"}</span>
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            <div><b>RPC</b>: <span style={styles.mono}>{chainInfo.rpc}</span></div>
            <div><b>최신 블록</b>: <span style={styles.mono}>{chainInfo.latestBlock}</span></div>
            <div><b>내 주소</b>: <span style={styles.mono}>{chainInfo.myAddress || "(signer 없음)"}</span></div>
            <div><b>내 ETH</b>: <span style={styles.mono}>{chainInfo.myEth ? `${chainInfo.myEth} ETH` : "-"}</span></div>
            <div><b>컨트랙트</b>: <span style={styles.mono}>{chainInfo.contractAddress}</span></div>
          </div>
        </div>

        <div style={styles.row2}>
          <div style={styles.card}>
            <div style={styles.titleRow}>
              <h2 style={styles.h2}>최근 블록 / 트랜잭션</h2>
              <div style={styles.small}>최근 {BLOCK_LOOKBACK}개 블록</div>
            </div>

            {blocks.map((b) => (
              <div key={b.number} style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <b>Block #{b.number}</b> <span style={styles.mono}>{short(b.hash, 8)}</span>
                  </div>
                  <div style={styles.small}>{new Date(b.timestamp * 1000).toLocaleString()}</div>
                </div>

                <table style={{ ...styles.table, marginTop: 8 }} className="cm-table-wide">
                  <thead>
                    <tr>
                      <th style={styles.th}>Tx</th>
                      <th style={styles.th}>From</th>
                      <th style={styles.th}>To</th>
                      <th style={styles.th}>Value(wei)</th>
                      <th style={styles.th}>GasUsed</th>
                      <th style={styles.th}>수수료(ETH)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.txs.length === 0 ? (
                      <tr><td style={styles.td} colSpan={6}>트랜잭션 없음</td></tr>
                    ) : (
                      b.txs.map((t) => (
                        <tr key={t.hash}>
                          <td style={{ ...styles.td, ...styles.mono }}>{short(t.hash, 8)}</td>
                          <td style={{ ...styles.td, ...styles.mono }}>{t.from ? short(t.from, 8) : "-"}</td>
                          <td style={{ ...styles.td, ...styles.mono }}>{t.to ? short(t.to, 8) : "-"}</td>
                          <td style={{ ...styles.td, ...styles.mono }}>{t.valueWei || "-"}</td>
                          <td style={{ ...styles.td, ...styles.mono }}>{t.gasUsed || "-"}</td>
                          <td style={{ ...styles.td, ...styles.mono }}>{t.feeEth ? `${t.feeEth} ETH` : "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <div style={styles.titleRow}>
              <h2 style={styles.h2}>컨트랙트 이벤트 로그</h2>
              <div style={styles.small}>컨트랙트 주소에서 발생한 로그만</div>
            </div>

            <table style={{ ...styles.table, marginTop: 10 }}>
              <thead>
                <tr>
                  <th style={styles.th}>Block</th>
                  <th style={styles.th}>Tx</th>
                  <th style={styles.th}>Event</th>
                  <th style={styles.th}>Args</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={4}>
                      이벤트가 없거나, ABI에 이벤트 정의가 없을 수 있어요.
                    </td>
                  </tr>
                ) : (
                  events.map((ev, idx) => (
                    <tr key={`${ev.txHash}-${idx}`}>
                      <td style={{ ...styles.td, ...styles.mono }}>{ev.blockNumber}</td>
                      <td style={{ ...styles.td, ...styles.mono }}>{short(ev.txHash, 8)}</td>
                      <td style={styles.td}><b>{ev.name}</b></td>
                      <td style={{ ...styles.td, ...styles.mono }}>
                        {Object.keys(ev.args || {}).length === 0 ? "-" : JSON.stringify(ev.args)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.titleRow}>
            <h2 style={styles.h2}>온체인 주문 목록</h2>
            <div style={styles.small}>nextOrderId 기반 0..N-1 조회</div>
          </div>

          <table style={{ ...styles.table, marginTop: 10 }}>
            <thead>
              <tr>
                <th style={styles.th}>id</th>
                <th style={styles.th}>maker</th>
                <th style={styles.th}>side</th>
                <th style={styles.th}>amountKwh</th>
                <th style={styles.th}>pricePerKwh</th>
                <th style={styles.th}>start</th>
                <th style={styles.th}>end</th>
                <th style={styles.th}>status</th>
                <th style={styles.th}>w</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td style={styles.td} colSpan={9}>주문이 없거나 조회 함수가 없을 수 있어요.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ ...styles.td, ...styles.mono }}>{o.id}</td>
                    <td style={{ ...styles.td, ...styles.mono }}>{short(o.maker, 8)}</td>
                    <td style={{ ...styles.td, ...styles.mono }}>{o.side}</td>
                    <td style={{ ...styles.td, ...styles.mono }}>{o.amountKwh}</td>
                    <td style={{ ...styles.td, ...styles.mono }}>{o.pricePerKwh}</td>
                    <td style={{ ...styles.td, ...styles.mono }}>{o.startTime}</td>
                    <td style={{ ...styles.td, ...styles.mono }}>{o.endTime}</td>
                    <td style={{ ...styles.td, ...styles.mono }}>{o.status}</td>
                    <td style={{ ...styles.td, ...styles.mono }}>{o.w}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ ...styles.small, textAlign: "center", paddingBottom: 10 }}>
          끝: 이제 “내 ETH + 가스 사용량/수수료”까지 모니터에서 바로 확인 가능.
        </div>
      </div>
    </Layout>
  );
}
    