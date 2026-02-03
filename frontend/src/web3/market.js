import { ethers } from "ethers";
import Artifact from "./EnergyMarketPoC.json";

export const MARKET_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const MARKET_ABI = Artifact.abi;

export async function getMarket() {
  if (!window.ethereum) throw new Error("MetaMask가 필요해요");
  await window.ethereum.request({ method: "eth_requestAccounts" });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, signer);
}
