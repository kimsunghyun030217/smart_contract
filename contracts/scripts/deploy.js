const hre = require("hardhat");

async function main() {
  const Market = await hre.ethers.getContractFactory("EnergyMarketPoC");

  // 가스가 자꾸 크게 잡히면 아래처럼 상한을 낮춰서 우회 가능
  const market = await Market.deploy({ gasLimit: 8_000_000 });

  await market.waitForDeployment();
  console.log("EnergyMarketPoC deployed to:", await market.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
