// scripts/printBlocks.js
const { ethers } = require("ethers");

const RPC = "http://127.0.0.1:8545";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);

  const latest = await provider.getBlockNumber();
  const N = Number(process.argv[2] ?? 5); // 기본 5개

  console.log(`RPC: ${RPC}`);
  console.log(`Latest block: ${latest}`);
  console.log("=".repeat(60));

  for (let bn = Math.max(0, latest - (N - 1)); bn <= latest; bn++) {
    const b = await provider.getBlock(bn);
    console.log(
      `#${b.number}  hash=${b.hash.slice(0, 10)}…  tx=${b.transactions.length}  time=${new Date(Number(b.timestamp) * 1000).toISOString()}`
    );

    // tx 해시 몇 개만 미리보기
    for (let i = 0; i < Math.min(3, b.transactions.length); i++) {
      console.log(`  - ${b.transactions[i]}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
