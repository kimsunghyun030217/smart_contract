const hre = require("hardhat");

async function main() {
  const to = process.env.TO;
  const amount = process.env.AMOUNT || "1.0"; // 기본 1 ETH

  if (!to) throw new Error("TO 주소 필요. 예) TO=0xabc...");

  const [funder] = await hre.ethers.getSigners();

  // ✅ Hardhat에서 가끔 gasLimit이 비정상적으로 크게 잡히는 이슈 방지
  const tx = await funder.sendTransaction({
    to,
    value: hre.ethers.parseEther(amount),

    // ✅ 일반 송금은 21,000이면 충분 (여유로 30,000)
    gasLimit: 30000n,

    // ✅ 로컬 Hardhat은 EIP-1559 지원. 고정 값으로도 OK
    maxFeePerGas: hre.ethers.parseUnits("2", "gwei"),
    maxPriorityFeePerGas: hre.ethers.parseUnits("1", "gwei"),
  });

  await tx.wait();

  console.log("✅ Funded:", to);
  console.log("✅ Amount:", amount, "ETH");
  console.log("tx:", tx.hash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
