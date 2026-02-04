import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { ethers } from "ethers";

import { getCoordinates } from "../api/naverApi";
import { changePassword, updateLocation, getMyInfo } from "../api/authApi";

import Layout from "../components/Layout";
import "./MyPage.css";

// ✅ 내장지갑(Embedded Wallet) 유틸
import {
  createEmbeddedWalletIfMissing,
  hasEmbeddedWallet,
  getEmbeddedAddress,
} from "../web3/embeddedWallet";

// ✅ 온체인 Market 컨트랙트 + Hardhat ETH 세팅 유틸
import {
  getMarket,
  getProvider,
  hardhatSetEthBalance,
} from "../web3/market";

// ✅ 버킷 계산 유틸
import { calcBucketId } from "../utils/bucket";

export default function MyPage() {
  const navigate = useNavigate();

  const [userProfile, setUserProfile] = useState({
    userId: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    address: "",
    detailAddress: "",
    latitude: "",
    longitude: "",
  });

  // ✅ 온체인: 현금 지갑 상태
  const [wallet, setWallet] = useState({
    totalKrw: 0,
    lockedKrw: 0,
    availableKrw: 0,
  });

  // ✅ 온체인: 에너지 지갑 상태
  const [energyWallet, setEnergyWallet] = useState({
    totalKwh: 0,
    lockedKwh: 0,
    availableKwh: 0,
  });

  // ✅ 온체인: 내 bucket 상태
  const [bucketId, setBucketId] = useState(null);

  // ✅ 충전 입력값들
  const [cashChargeAmount, setCashChargeAmount] = useState("");
  const [energyChargeAmount, setEnergyChargeAmount] = useState("");

  // ✅ ETH(가스) 상태 + 입력값
  const [ethBalance, setEthBalance] = useState("0");
  const [ethChargeAmount, setEthChargeAmount] = useState("1");

  // ✅ 온체인 잔고 새로고침 함수
  const refreshOnchainBalances = async (username) => {
    const market = await getMarket(username);
    const me = await market.runner.getAddress();

    const [krw, krwL, kwh, kwhL] = await Promise.all([
      market.krwBalance(me),
      market.krwLocked(me),
      market.kwhBalance(me),
      market.kwhLocked(me),
    ]);

    const totalKrw = Number(krw);
    const lockedKrw = Number(krwL);
    const totalKwh = Number(kwh);
    const lockedKwh = Number(kwhL);

    setWallet({
      totalKrw,
      lockedKrw,
      availableKrw: Math.max(0, totalKrw - lockedKrw),
    });

    setEnergyWallet({
      totalKwh,
      lockedKwh,
      availableKwh: Math.max(0, totalKwh - lockedKwh),
    });
  };

  // ✅ 온체인 bucket 새로고침
  const refreshOnchainBucket = async (username) => {
    const market = await getMarket(username);
    const me = await market.runner.getAddress();

    const b = await market.bucketOf(me); // bigint 가능
    const bNum = Number(b);
    setBucketId(Number.isFinite(bNum) ? bNum : null);
  };

  // ✅ ETH 잔고 새로고침
  const refreshEthBalance = async (username) => {
    const market = await getMarket(username);
    const me = await market.runner.getAddress();
    const provider = getProvider();
    const bal = await provider.getBalance(me);
    setEthBalance(ethers.formatEther(bal));
  };

  useEffect(() => {
    const username = localStorage.getItem("username");
    const token = localStorage.getItem("token");

    if (!username || !token) {
      alert("로그인이 필요합니다");
      navigate("/login");
      return;
    }

    // ✅ 내장지갑 없으면 생성
    createEmbeddedWalletIfMissing(username);

    setUserProfile((prev) => ({
      ...prev,
      userId: username,
    }));

    // ✅ 프로필(주소) = Spring/JWT
    const fetchUserInfo = async () => {
      try {
        const data = await getMyInfo();
        setUserProfile((prev) => ({
          ...prev,
          address: data.address || "",
          detailAddress: data.detailAddress || "",
          latitude: data.latitude || "",
          longitude: data.longitude || "",
        }));
      } catch (error) {
        console.error(error);
      }
    };

    // ✅ 온체인 (잔고 + bucket + ETH)
    const fetchOnchain = async () => {
      try {
        await refreshOnchainBalances(username);
      } catch (e) {
        console.error("refreshOnchainBalances error:", e);
      }

      try {
        await refreshOnchainBucket(username);
      } catch (e) {
        console.error("refreshOnchainBucket error:", e);
      }

      try {
        await refreshEthBalance(username);
      } catch (e) {
        console.error("refreshEthBalance error:", e);
      }
    };

    fetchUserInfo();
    fetchOnchain();
  }, [navigate]);

  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = userProfile;

    if (!currentPassword) return alert("현재 비밀번호를 입력해주세요");
    if (!newPassword) return alert("새 비밀번호를 입력해주세요");
    if (newPassword !== confirmPassword)
      return alert("새 비밀번호가 일치하지 않습니다");

    try {
      await changePassword(currentPassword, newPassword);
      alert("비밀번호가 성공적으로 변경되었습니다");

      setUserProfile((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (error) {
      console.error(error);
      alert("비밀번호 변경 중 오류가 발생했습니다");
    }
  };

  // ✅ 주소 저장: DB 저장 + bucket 온체인 저장 (디버그: 무조건 로그)
  const handleAddressUpdate = async () => {
    console.log("✅ [STEP 0] handleAddressUpdate clicked");
    console.log("✅ [STEP 0-1] userProfile snapshot:", JSON.stringify(userProfile));

    const username = localStorage.getItem("username");
    console.log("✅ [STEP 0-2] username:", username);

    try {
      // STEP 1) 입력 검증
      console.log("✅ [STEP 1] validate inputs");

      if (!username) {
        console.log("❌ [STOP] username 없음");
        alert("로그인 필요");
        return;
      }

      if (!userProfile.address) {
        console.log("❌ [STOP] address 없음");
        alert("주소를 입력해주세요");
        return;
      }

      if (!userProfile.latitude || !userProfile.longitude) {
        console.log("❌ [STOP] lat/lng 없음");
        alert("주소 검색을 먼저 해주세요");
        return;
      }

      // STEP 2) DB 저장
      console.log("✅ [STEP 2] updateLocation(DB) start");
      await updateLocation(
        userProfile.latitude,
        userProfile.longitude,
        userProfile.address,
        userProfile.detailAddress
      );
      console.log("✅ [STEP 2] updateLocation(DB) success");

      // STEP 3) bucket 계산
      console.log("✅ [STEP 3] calcBucketId start");
      const lat = Number(userProfile.latitude);
      const lng = Number(userProfile.longitude);
      console.log("✅ [STEP 3-1] lat,lng:", lat, lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.log("❌ [STOP] lat/lng 숫자 변환 실패");
        alert("위도/경도 값이 올바르지 않습니다.");
        return;
      }

      const newBucketId = calcBucketId(lat, lng);
      console.log("✅ [STEP 3-2] newBucketId:", newBucketId);

      // STEP 4) market 만들기
      console.log("✅ [STEP 4] getMarket start");
      const market = await getMarket(username);
      console.log("✅ [STEP 4-1] getMarket success");

      // ABI 함수 덤프
      console.log("✅ [STEP 4-2] dump contract functions");
      const fragments =
        market?.interface?.fragments
          ?.filter((f) => f.type === "function")
          .map((f) => f.format()) || [];
      console.log("✅ [ABI FUNCTIONS]", fragments);

      // STEP 5) setBucket
      console.log("✅ [STEP 5] try setBucket(", newBucketId, ")");
      const tx = await market.setBucket(BigInt(newBucketId));
      console.log("✅ [STEP 5-1] tx sent:", tx.hash);

      console.log("✅ [STEP 6] wait tx...");
      await tx.wait();
      console.log("✅ [STEP 6-1] tx confirmed");

      // STEP 7) refresh
      console.log("✅ [STEP 7] refreshOnchainBucket start");
      await refreshOnchainBucket(username);
      console.log("✅ [STEP 7-1] refreshOnchainBucket success");

      alert(`✅ 주소(DB) + 버킷(온체인) 저장 완료!\nBucket: ${newBucketId}`);
    } catch (e) {
      console.error("❌ handleAddressUpdate error:", e);

      const msg =
        e?.shortMessage ||
        e?.reason ||
        e?.info?.error?.message ||
        e?.message ||
        "unknown";

      alert(
        `⚠️ 주소(DB)는 저장됐는데, 버킷(온체인) 저장이 실패했습니다.\n사유: ${msg}`
      );
    }
  };

  const handleAddressSearch = async () => {
    const address = prompt("주소를 입력하세요\n예) 서울시 강남구 테헤란로 123");
    if (!address) return;

    try {
      const result = await getCoordinates(address);

      if (result) {
        setUserProfile((prev) => ({
          ...prev,
          address: result.fullAddress,
          latitude: result.latitude,
          longitude: result.longitude,
        }));
        alert("주소가 설정되었습니다!");
      } else {
        alert("주소를 찾을 수 없습니다");
      }
    } catch (error) {
      console.error(error);
      alert("주소 검색 중 오류가 발생했습니다");
    }
  };

  // ✅ Hardhat ETH 충전(임시): 잔고를 N ETH로 "세팅"
  const handleEthCharge = async () => {
    const username = localStorage.getItem("username");
    if (!username) return alert("로그인 필요");

    const n = Number(ethChargeAmount);
    if (!Number.isFinite(n) || n <= 0) return alert("0보다 큰 ETH를 입력해주세요");

    try {
      const market = await getMarket(username);
      const me = await market.runner.getAddress();

      await hardhatSetEthBalance(me, String(n));
      await refreshEthBalance(username);

      alert(`✅ (Hardhat) ETH 잔고를 ${n} ETH로 설정했습니다`);
    } catch (e) {
      console.error(e);
      alert("❌ ETH 설정 실패: hardhat node(8545)가 켜져있는지 확인");
    }
  };

  // ✅ 온체인 현금 충전: fund(addKrw, 0)
  const handleCashCharge = async () => {
    const username = localStorage.getItem("username");
    const n = Number(cashChargeAmount);
    if (!username) return alert("로그인 필요");
    if (Number.isNaN(n) || n <= 0) return alert("0보다 큰 금액을 입력해주세요");

    try {
      const market = await getMarket(username);
      const tx = await market.fund(BigInt(n), 0n);
      await tx.wait();

      await refreshOnchainBalances(username);
      setCashChargeAmount("");
      alert("✅ (온체인) 현금이 충전되었습니다!");
    } catch (e) {
      console.error(e);
      alert("온체인 현금 충전 실패 (가스비/노드/컨트랙트 확인)");
    }
  };

  // ✅ 온체인 에너지 충전: fund(0, addKwh)
  const handleEnergyCharge = async () => {
    const username = localStorage.getItem("username");
    const n = Number(energyChargeAmount);
    if (!username) return alert("로그인 필요");
    if (Number.isNaN(n) || n <= 0) return alert("0보다 큰 kWh를 입력해주세요");

    try {
      const market = await getMarket(username);
      const tx = await market.fund(0n, BigInt(n));
      await tx.wait();

      await refreshOnchainBalances(username);
      setEnergyChargeAmount("");
      alert("✅ (온체인) 에너지가 충전되었습니다!");
    } catch (e) {
      console.error(e);
      alert("온체인 에너지 충전 실패 (가스비/노드/컨트랙트 확인)");
    }
  };

  return (
    <Layout>
      <div className="mp-page">
        <div className="mp-header">
          <h1 className="mp-headerTitle">마이페이지 👤</h1>
          <p className="mp-headerSubtitle">내 정보를 관리하세요</p>
        </div>

        {/* 계정 정보 */}
        <div className="mp-settingsCard">
          <h3 className="mp-settingsTitle">계정 정보</h3>

          <div className="mp-formGrid">
            <div className="mp-formGroup mp-spanAll">
              <label className="mp-label">아이디</label>
              <input
                type="text"
                value={userProfile.userId}
                className="mp-input mp-readonly"
                readOnly
              />
            </div>

            {/* ✅ 내장 지갑 주소 표시 */}
            <div className="mp-formGroup mp-spanAll">
              <label className="mp-label">내장 지갑 주소(EOA)</label>
              <input
                type="text"
                value={
                  hasEmbeddedWallet(userProfile.userId)
                    ? getEmbeddedAddress(userProfile.userId)
                    : "지갑 없음"
                }
                className="mp-input mp-readonly"
                readOnly
              />
            </div>

            {/* ✅ 내 bucket 표시 */}
            <div className="mp-formGroup mp-spanAll">
              <label className="mp-label">내 Bucket ID(온체인)</label>
              <input
                type="text"
                value={bucketId === null ? "불러오는 중..." : String(bucketId)}
                className="mp-input mp-readonly"
                readOnly
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">현재 비밀번호</label>
              <input
                type="password"
                value={userProfile.currentPassword}
                onChange={(e) =>
                  setUserProfile((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                className="mp-input"
                placeholder="현재 비밀번호"
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">새 비밀번호</label>
              <input
                type="password"
                value={userProfile.newPassword}
                onChange={(e) =>
                  setUserProfile((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                className="mp-input"
                placeholder="새 비밀번호"
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">새 비밀번호 확인</label>
              <input
                type="password"
                value={userProfile.confirmPassword}
                onChange={(e) =>
                  setUserProfile((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                className="mp-input"
                placeholder="새 비밀번호 확인"
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">&nbsp;</label>
              <button
                type="button"
                onClick={handlePasswordChange}
                className="mp-inlineBtn"
              >
                🔐 비밀번호 변경
              </button>
            </div>
          </div>
        </div>

        {/* ✅ 가스비(ETH) 카드 (Hardhat 임시) */}
        <div className="mp-settingsCard">
          <h3 className="mp-settingsTitle">가스비(ETH) (Hardhat 임시) ⛽</h3>

          <div className="mp-formGrid">
            <div className="mp-formGroup">
              <label className="mp-label">현재 ETH 잔고</label>
              <input
                type="text"
                value={ethBalance}
                className="mp-input mp-readonly"
                readOnly
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">설정할 ETH</label>
              <input
                type="number"
                value={ethChargeAmount}
                onChange={(e) => setEthChargeAmount(e.target.value)}
                className="mp-input"
                placeholder="예) 1"
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">&nbsp;</label>
              <button type="button" onClick={handleEthCharge} className="mp-inlineBtn">
                ⛽ ETH 설정
              </button>
            </div>
          </div>

          <p className="mp-hint">
            ※ Hardhat 로컬에서만 동작합니다. (테스트넷/메인넷에서는 불가)
          </p>
        </div>

        {/* 주소 정보 */}
        <div className="mp-settingsCard">
          <h3 className="mp-settingsTitle">주소 정보 📍</h3>

          <div className="mp-formGrid">
            <div className="mp-formGroup mp-spanAll">
              <label className="mp-label">주소</label>

              <div className="mp-addressInputGroup">
                <input
                  type="text"
                  value={userProfile.address}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="mp-input"
                  placeholder="예) 서울시 강남구 테헤란로 123"
                />

                <button
                  type="button"
                  className="mp-searchBtn"
                  onClick={handleAddressSearch}
                >
                  주소 검색
                </button>
              </div>
            </div>

            <div className="mp-formGroup mp-spanAll">
              <label className="mp-label">상세 주소</label>
              <input
                type="text"
                value={userProfile.detailAddress}
                onChange={(e) =>
                  setUserProfile((prev) => ({
                    ...prev,
                    detailAddress: e.target.value,
                  }))
                }
                className="mp-input"
                placeholder="예) 101동 1001호"
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">위도</label>
              <input
                type="text"
                value={userProfile.latitude}
                className="mp-input mp-readonly"
                readOnly
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">경도</label>
              <input
                type="text"
                value={userProfile.longitude}
                className="mp-input mp-readonly"
                readOnly
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddressUpdate}
            className="mp-sectionSaveBtn"
          >
            📍 주소 정보 저장 (DB + Bucket 온체인)
          </button>
        </div>

        {/* ✅ 온체인 현금 지갑 */}
        <div className="mp-settingsCard">
          <h3 className="mp-settingsTitle">현금 지갑(온체인) 💰</h3>

          <div className="mp-formGrid">
            <div className="mp-formGroup">
              <label className="mp-label">총 보유금액</label>
              <input
                type="text"
                value={Number(wallet.totalKrw ?? 0).toLocaleString()}
                className="mp-input mp-readonly"
                readOnly
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">잠금 금액</label>
              <input
                type="text"
                value={Number(wallet.lockedKrw ?? 0).toLocaleString()}
                className="mp-input mp-readonly"
                readOnly
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">사용 가능</label>
              <input
                type="text"
                value={Number(wallet.availableKrw ?? 0).toLocaleString()}
                className="mp-input mp-readonly"
                readOnly
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">충전 금액(원)</label>
              <input
                type="number"
                value={cashChargeAmount}
                onChange={(e) => setCashChargeAmount(e.target.value)}
                className="mp-input"
                placeholder="예) 500000"
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">&nbsp;</label>
              <button
                type="button"
                onClick={handleCashCharge}
                className="mp-inlineBtn"
              >
                💰 (온체인) 충전
              </button>
            </div>
          </div>
        </div>

        {/* ✅ 온체인 에너지 지갑 */}
        <div className="mp-settingsCard">
          <h3 className="mp-settingsTitle">에너지 지갑(온체인) ⚡</h3>

          <div className="mp-formGrid">
            <div className="mp-formGroup">
              <label className="mp-label">총 보유 전력(kWh)</label>
              <input
                type="text"
                value={Number(energyWallet.totalKwh ?? 0).toLocaleString()}
                className="mp-input mp-readonly"
                readOnly
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">잠금 전력(kWh)</label>
              <input
                type="text"
                value={Number(energyWallet.lockedKwh ?? 0).toLocaleString()}
                className="mp-input mp-readonly"
                readOnly
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">사용 가능(kWh)</label>
              <input
                type="text"
                value={Number(energyWallet.availableKwh ?? 0).toLocaleString()}
                className="mp-input mp-readonly"
                readOnly
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">충전(kWh)</label>
              <input
                type="number"
                value={energyChargeAmount}
                onChange={(e) => setEnergyChargeAmount(e.target.value)}
                className="mp-input"
                placeholder="예) 10"
              />
            </div>

            <div className="mp-formGroup">
              <label className="mp-label">&nbsp;</label>
              <button
                type="button"
                onClick={handleEnergyCharge}
                className="mp-inlineBtn"
              >
                ⚡ (온체인) 충전
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
