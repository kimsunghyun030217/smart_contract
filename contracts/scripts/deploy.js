const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const Market = await hre.ethers.getContractFactory("EnergyMarketPoC");
  const market = await Market.deploy({ gasLimit: 8_000_000 });
  await market.waitForDeployment();

  const addr = await market.getAddress();
  console.log("EnergyMarketPoC deployed to:", addr);

  // ✅ 프론트 web3 폴더 경로
  const feWeb3Dir = path.join(__dirname, "..", "..", "frontend", "src", "web3");
  if (!fs.existsSync(feWeb3Dir)) fs.mkdirSync(feWeb3Dir, { recursive: true });

  // ✅ 1) 주소 저장
  fs.writeFileSync(
    path.join(feWeb3Dir, "deployedAddress.json"),
    JSON.stringify({ MARKET_ADDRESS: addr }, null, 2)
  );

  // ✅ 2) ABI 저장 (경로 복사 대신 Hardhat에서 읽어서 저장)
  const artifact = await hre.artifacts.readArtifact("EnergyMarketPoC");
  fs.writeFileSync(
    path.join(feWeb3Dir, "EnergyMarketPoC.json"),
    JSON.stringify(artifact, null, 2)
  );

  console.log("✅ Saved address + ABI to frontend/src/web3/");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
