import { ethers } from "ethers";
import Artifact from "./EnergyMarketPoC.json";
import deployed from "./deployedAddress.json";
import { getEmbeddedPk } from "./embeddedWallet";

export const MARKET_ADDRESS = deployed.MARKET_ADDRESS;
const MARKET_ABI = Artifact.abi;

const RPC_URL = "http://127.0.0.1:8545"; // hardhat node

export function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

export function getEmbeddedSigner(username) {
  const pk = getEmbeddedPk(username);
  if (!pk)
    throw new Error("내장지갑 PK가 없습니다. (회원가입/로그인에서 생성됐는지 확인)");
  return new ethers.Wallet(pk, getProvider());
}

// ✅ 메타마스크 없이 컨트랙트 객체 반환
export async function getMarket(username) {
  const signer = getEmbeddedSigner(username);
  return new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, signer);
}

/**
 * ✅ Hardhat 전용: ETH 잔고 세팅(임시 충전)
 * - "추가"가 아니라 "해당 잔고로 덮어쓰기"임
 * - hardhat node(127.0.0.1:8545)에서만 동작
 */
export async function hardhatSetEthBalance(address, ethAmount = "1") {
  const provider = getProvider();
  await provider.send("hardhat_setBalance", [
    address,
    ethers.toBeHex(ethers.parseEther(String(ethAmount))),
  ]);
}
