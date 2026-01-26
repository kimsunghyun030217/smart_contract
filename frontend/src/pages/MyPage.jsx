import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { getCoordinates } from "../api/naverApi";
import { changePassword, updateLocation, getMyInfo } from "../api/authApi";

// ✅ 현금 지갑 API (충전만 쓸거라 set 제거)
import { getMyWallet, chargeMyWallet } from "../api/walletApi";

// ✅ 에너지 지갑 API (충전만 쓸거라 set 제거)
import { getMyEnergyWallet, chargeMyEnergy } from "../api/energyWalletApi";

import Layout from "../components/Layout";

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
      <div style={{ padding: "32px" }}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>마이페이지 👤</h1>
          <p style={styles.headerSubtitle}>내 정보를 관리하세요</p>
        </div>

        {/* 계정 정보 */}
        <div style={styles.settingsCard}>
          <h3 style={styles.settingsTitle}>계정 정보</h3>

          <div style={styles.formGrid}>
            <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>아이디</label>
              <input
                type="text"
                value={userProfile.userId}
                style={{
                  ...styles.input,
                  background: "#f8fafc",
                  color: "#94a3b8",
                }}
                readOnly
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>현재 비밀번호</label>
              <input
                type="password"
                value={userProfile.currentPassword}
                onChange={(e) =>
                  setUserProfile((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                style={styles.input}
                placeholder="현재 비밀번호"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>새 비밀번호</label>
              <input
                type="password"
                value={userProfile.newPassword}
                onChange={(e) =>
                  setUserProfile((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                style={styles.input}
                placeholder="새 비밀번호"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>새 비밀번호 확인</label>
              <input
                type="password"
                value={userProfile.confirmPassword}
                onChange={(e) =>
                  setUserProfile((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                style={styles.input}
                placeholder="새 비밀번호 확인"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>&nbsp;</label>
              <button
                type="button"
                onClick={handlePasswordChange}
                style={styles.inlineBtn}
              >
                🔐 비밀번호 변경
              </button>
            </div>
          </div>
        </div>

        {/* 주소 정보 */}
        <div style={styles.settingsCard}>
          <h3 style={styles.settingsTitle}>주소 정보 📍</h3>

          <div style={styles.formGrid}>
            <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>주소</label>

              <div style={styles.addressInputGroup}>
                <input
                  type="text"
                  value={userProfile.address}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  style={styles.input}
                  placeholder="예) 서울시 강남구 테헤란로 123"
                />

                <button
                  type="button"
                  style={styles.searchBtn}
                  onClick={handleAddressSearch}
                >
                  주소 검색
                </button>
              </div>
            </div>

            <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>상세 주소</label>
              <input
                type="text"
                value={userProfile.detailAddress}
                onChange={(e) =>
                  setUserProfile((prev) => ({
                    ...prev,
                    detailAddress: e.target.value,
                  }))
                }
                style={styles.input}
                placeholder="예) 101동 1001호"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>위도</label>
              <input
                type="text"
                value={userProfile.latitude}
                style={{
                  ...styles.input,
                  background: "#f8fafc",
                  color: "#94a3b8",
                }}
                readOnly
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>경도</label>
              <input
                type="text"
                value={userProfile.longitude}
                style={{
                  ...styles.input,
                  background: "#f8fafc",
                  color: "#94a3b8",
                }}
                readOnly
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddressUpdate}
            style={styles.sectionSaveBtn}
          >
            📍 주소 정보 저장
          </button>
        </div>

        {/* ✅ 현금 지갑 */}
        <div style={styles.settingsCard}>
          <h3 style={styles.settingsTitle}>현금 지갑 💰</h3>

          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>총 보유금액</label>
              <input
                type="text"
                value={Number(wallet.totalKrw ?? 0).toLocaleString()}
                style={{
                  ...styles.input,
                  background: "#f8fafc",
                  color: "#94a3b8",
                }}
                readOnly
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>잠금 금액</label>
              <input
                type="text"
                value={Number(wallet.lockedKrw ?? 0).toLocaleString()}
                style={{
                  ...styles.input,
                  background: "#f8fafc",
                  color: "#94a3b8",
                }}
                readOnly
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>사용 가능</label>
              <input
                type="text"
                value={Number(wallet.availableKrw ?? 0).toLocaleString()}
                style={{
                  ...styles.input,
                  background: "#f8fafc",
                  color: "#94a3b8",
                }}
                readOnly
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>충전 금액(원)</label>
              <input
                type="number"
                value={cashChargeAmount}
                onChange={(e) => setCashChargeAmount(e.target.value)}
                style={styles.input}
                placeholder="예) 500000"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>&nbsp;</label>
              <button
                type="button"
                onClick={handleCashCharge}
                style={styles.inlineBtn}
              >
                💰 충전
              </button>
            </div>
          </div>
        </div>

        {/* ✅ 에너지 지갑 */}
        <div style={styles.settingsCard}>
          <h3 style={styles.settingsTitle}>에너지 지갑 ⚡</h3>

          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>총 보유 전력(kWh)</label>
              <input
                type="text"
                value={Number(energyWallet.totalKwh ?? 0).toLocaleString()}
                style={{
                  ...styles.input,
                  background: "#f8fafc",
                  color: "#94a3b8",
                }}
                readOnly
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>잠금 전력(kWh)</label>
              <input
                type="text"
                value={Number(energyWallet.lockedKwh ?? 0).toLocaleString()}
                style={{
                  ...styles.input,
                  background: "#f8fafc",
                  color: "#94a3b8",
                }}
                readOnly
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>사용 가능(kWh)</label>
              <input
                type="text"
                value={Number(energyWallet.availableKwh ?? 0).toLocaleString()}
                style={{
                  ...styles.input,
                  background: "#f8fafc",
                  color: "#94a3b8",
                }}
                readOnly
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>충전(kWh)</label>
              <input
                type="number"
                value={energyChargeAmount}
                onChange={(e) => setEnergyChargeAmount(e.target.value)}
                style={styles.input}
                placeholder="예) 10"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>&nbsp;</label>
              <button
                type="button"
                onClick={handleEnergyCharge}
                style={styles.inlineBtn}
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

const styles = {
  header: { marginBottom: "32px" },
  headerTitle: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 8px 0",
  },
  headerSubtitle: { fontSize: "16px", color: "#64748b", margin: 0 },
  settingsCard: {
    background: "white",
    padding: "32px",
    borderRadius: "16px",
    border: "2px solid #e2e8f0",
    marginBottom: "24px",
  },
  settingsTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 8px 0",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "20px",
  },
  formGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "14px", fontWeight: "600", color: "#0f172a" },
  input: {
    padding: "14px 16px",
    fontSize: "15px",
    border: "2px solid #e2e8f0",
    borderRadius: "12px",
    fontWeight: "600",
    outline: "none",
    transition: "all 0.2s",
  },
  addressInputGroup: { display: "flex", gap: "12px" },
  searchBtn: {
    padding: "14px 24px",
    fontSize: "14px",
    fontWeight: "700",
    color: "white",
    background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
  },
  sectionSaveBtn: {
    width: "100%",
    padding: "16px",
    fontSize: "16px",
    fontWeight: "700",
    color: "white",
    background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
  },
  inlineBtn: {
    width: "100%",
    padding: "14px 16px",
    fontSize: "15px",
    fontWeight: "700",
    color: "white",
    background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
  },
};
