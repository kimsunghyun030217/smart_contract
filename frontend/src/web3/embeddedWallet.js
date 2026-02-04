// 사용자 기기(브라우저)에 PK를 계정별로 보관해두고,
// 필요할 때 주소/서명을 꺼내 쓰게 해주는 지갑 관리 파일
import { Wallet } from "ethers";

// ✅ 핵심: username별로 키를 분리해서 저장
const pkKey = (username) => `embedded_pk_${username}`;

// ✅ username을 받아서 PK 읽기
export function getEmbeddedPk(username) {
  if (!username) return null;
  return localStorage.getItem(pkKey(username));
}

// ✅ username 기준으로 지갑 존재 여부
export function hasEmbeddedWallet(username) {
  return !!getEmbeddedPk(username);
}

// ✅ username 기준으로 없으면 생성
export function createEmbeddedWalletIfMissing(username) {
  if (!username) throw new Error("username이 필요합니다 (embedded wallet)");
  const KEY = pkKey(username);

  let pk = localStorage.getItem(KEY);
  if (!pk) {
    const w = Wallet.createRandom();
    pk = w.privateKey;
    localStorage.setItem(KEY, pk);
    return { created: true };
  }
  return { created: false };
}

// ✅ username 기준으로 주소 꺼내기
export function getEmbeddedAddress(username) {
  const pk = getEmbeddedPk(username);
  if (!pk) return "";
  return new Wallet(pk).address;
}

// (선택) username 지갑 삭제(로그아웃/초기화용)
export function clearEmbeddedWallet(username) {
  if (!username) return;
  localStorage.removeItem(pkKey(username));
}
