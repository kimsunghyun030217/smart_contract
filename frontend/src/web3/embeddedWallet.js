// 사용자 기기(브라우저)에 PK를 보관해두고,
// 필요할 때 주소/서명을 꺼내 쓰게 해주는 지갑 관리 파일
import { Wallet } from "ethers";

/**
 * ✅ 저장 전략 (호환 + 통일)
 * - 정식 기본키: embedded_pk
 * - 호환키(기존): embedded_pk_${username}
 * - username이 없더라도 "쓸 수 있는 pk"를 찾아서 조회 가능하게 함 (monitor/debug에서 유용)
 *
 * ✅ 안전 정책
 * - 지갑 초기화(삭제)는 실수로 돈/기록 접근을 잃을 수 있어서 기본 비활성화
 */

const DEFAULT_PK_KEY = "embedded_pk";
const pkKey = (username) => `embedded_pk_${username}`;

// ✅ localStorage에서 사용 가능한 embedded_pk* 키 중 하나를 자동 선택
function findAnyEmbeddedPkKey() {
  const keys = Object.keys(localStorage);

  // 1) 정식 기본키가 있으면 최우선
  if (localStorage.getItem(DEFAULT_PK_KEY)) return DEFAULT_PK_KEY;

  // 2) 그 외 embedded_pk_로 시작하는 키 중 하나
  const candidate = keys.find(
    (k) => k.startsWith("embedded_pk_") && localStorage.getItem(k)
  );
  return candidate || null;
}

// ✅ username을 받아서 PK 읽기 (username 없으면 fallback로 하나 찾아줌)
export function getEmbeddedPk(username) {
  // 1) username 키 우선
  if (username) {
    const v = localStorage.getItem(pkKey(username));
    if (v) return v;
  }

  // 2) 기본키
  const base = localStorage.getItem(DEFAULT_PK_KEY);
  if (base) return base;

  // 3) 아무 embedded_pk_* 하나라도
  const anyKey = findAnyEmbeddedPkKey();
  if (anyKey) return localStorage.getItem(anyKey);

  return null;
}

// ✅ 지갑 존재 여부
export function hasEmbeddedWallet(username) {
  return !!getEmbeddedPk(username);
}

// ✅ username 기준으로 없으면 생성 (+ 기본키/username키 동기화)
export function createEmbeddedWalletIfMissing(username) {
  if (!username) throw new Error("username이 필요합니다 (embedded wallet)");

  // username 키 or 기본키 중 하나라도 있으면 그걸 사용
  let pk = localStorage.getItem(pkKey(username)) || localStorage.getItem(DEFAULT_PK_KEY);

  if (!pk) {
    const w = Wallet.createRandom();
    pk = w.privateKey;

    // ✅ 둘 다 저장: 이후 어디서 읽어도 문제 없게
    localStorage.setItem(pkKey(username), pk);
    localStorage.setItem(DEFAULT_PK_KEY, pk);

    return { created: true, address: w.address };
  }

  // ✅ 동기화(혹시 한쪽만 있으면 반대쪽도 채움)
  if (!localStorage.getItem(DEFAULT_PK_KEY)) {
    localStorage.setItem(DEFAULT_PK_KEY, pk);
  }
  if (!localStorage.getItem(pkKey(username))) {
    localStorage.setItem(pkKey(username), pk);
  }

  return { created: false, address: new Wallet(pk).address };
}

// ✅ 주소 꺼내기 (username 없어도 fallback 가능)
export function getEmbeddedAddress(username) {
  const pk = getEmbeddedPk(username);
  if (!pk) return "";
  return new Wallet(pk).address;
}

// ✅ 지갑 초기화(삭제) 기능: 기본 비활성화 (실수 방지)
export function clearEmbeddedWallet() {
  throw new Error("지갑 초기화 기능은 비활성화되어 있습니다. (PK 삭제 방지)");
}
