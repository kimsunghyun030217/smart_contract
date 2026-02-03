import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { getCoordinates } from "../api/naverApi";
import { changePassword, updateLocation, getMyInfo } from "../api/authApi";

// ✅ 현금 지갑 API (충전만 쓸거라 set 제거)
import { getMyWallet, chargeMyWallet } from "../api/walletApi";

// ✅ 에너지 지갑 API (충전만 쓸거라 set 제거)
import { getMyEnergyWallet, chargeMyEnergy } from "../api/energyWalletApi";

import Layout from "../components/Layout";
import "./MyPage.css";

const API_BASE = "http://localhost:8080"; // ✅ (선택) 최소 종료시간 계산용 백엔드 (현재 파일에서 사용 안 함)

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

  // ✅ 현금 지갑 상태
  const [wallet, setWallet] = useState({
    totalKrw: 0,
    lockedKrw: 0,
    availableKrw: 0,
    updatedAt: "",
  });

  // ✅ 에너지 지갑 상태
  const [energyWallet, setEnergyWallet] = useState({
    totalKwh: 0,
    lockedKwh: 0,
    availableKwh: 0,
  });

  // ✅ 충전 입력값들
  const [cashChargeAmount, setCashChargeAmount] = useState("");
  const [energyChargeAmount, setEnergyChargeAmount] = useState("");

  useEffect(() => {
    const username = localStorage.getItem("username");
    const token = localStorage.getItem("token");

    if (!username || !token) {
      alert("로그인이 필요합니다");
      navigate("/login");
      return;
    }

    setUserProfile((prev) => ({
      ...prev,
      userId: username,
    }));

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

    const fetchWallet = async () => {
      try {
        const w = await getMyWallet();
        setWallet(w);
      } catch (error) {
        console.error(error);
      }
    };

    const fetchEnergyWallet = async () => {
      try {
        const ew = await getMyEnergyWallet();
        setEnergyWallet(ew);
      } catch (error) {
        console.error(error);
      }
    };

    fetchUserInfo();
    fetchWallet();
    fetchEnergyWallet();
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

  const handleAddressUpdate = async () => {
    if (!userProfile.address) return alert("주소를 입력해주세요");
    if (!userProfile.latitude || !userProfile.longitude)
      return alert("주소 검색을 먼저 해주세요");

    try {
      await updateLocation(
        userProfile.latitude,
        userProfile.longitude,
        userProfile.address,
        userProfile.detailAddress
      );
      alert("주소 정보가 저장되었습니다!");
    } catch (error) {
      console.error(error);
      alert("주소 정보 저장 실패");
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

  // ✅ 현금 지갑 충전(total += amount)
  const handleCashCharge = async () => {
    const n = Number(cashChargeAmount);
    if (Number.isNaN(n) || n <= 0) return alert("0보다 큰 금액을 입력해주세요");

    try {
      await chargeMyWallet(n);
      const w = await getMyWallet();
      setWallet(w);
      setCashChargeAmount("");
      alert("현금이 충전되었습니다!");
    } catch (error) {
      console.error(error);
      alert("현금 충전 실패");
    }
  };

  // ✅ 에너지 지갑 충전(total += amount)
  const handleEnergyCharge = async () => {
    const n = Number(energyChargeAmount);
    if (Number.isNaN(n) || n <= 0) return alert("0보다 큰 kWh를 입력해주세요");

    try {
      await chargeMyEnergy(n);
      const ew = await getMyEnergyWallet();
      setEnergyWallet(ew);
      setEnergyChargeAmount("");
      alert("에너지가 충전되었습니다!");
    } catch (error) {
      console.error(error);
      alert("에너지 충전 실패");
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
            📍 주소 정보 저장
          </button>
        </div>

        {/* ✅ 현금 지갑 */}
        <div className="mp-settingsCard">
          <h3 className="mp-settingsTitle">현금 지갑 💰</h3>

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
                💰 충전
              </button>
            </div>
          </div>
        </div>

        {/* ✅ 에너지 지갑 */}
        <div className="mp-settingsCard">
          <h3 className="mp-settingsTitle">에너지 지갑 ⚡</h3>

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
                ⚡ 충전
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
