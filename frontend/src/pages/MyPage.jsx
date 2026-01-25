import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { getCoordinates } from "../api/naverApi";
import { changePassword, updateLocation, getMyInfo } from "../api/authApi";
import { getMyWallet, setMyWalletBalance } from "../api/walletApi";

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

  // ✅ 지갑 상태
  const [wallet, setWallet] = useState({
    totalKrw: 0,
    lockedKrw: 0,
    availableKrw: 0,
    updatedAt: "",
  });

  // ✅ PoC: 테스트 잔고 입력값 (total_krw 세팅)
  const [testBalance, setTestBalance] = useState("");

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
        setTestBalance(String(w?.totalKrw ?? 0));
      } catch (error) {
        console.error(error);
      }
    };

    fetchUserInfo();
    fetchWallet();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    alert("로그아웃 되었습니다");
    navigate("/login");
  };

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
    if (!userProfile.address) {
      alert("주소를 입력해주세요");
      return;
    }

    if (!userProfile.latitude || !userProfile.longitude) {
      alert("주소 검색을 먼저 해주세요");
      return;
    }

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

  // ✅ PoC: 테스트 잔고 저장 (DB total_krw 업데이트)
  const handleWalletSave = async () => {
    const n = Number(testBalance);
    if (Number.isNaN(n) || n < 0) {
      alert("0 이상의 숫자를 입력해주세요");
      return;
    }

    try {
      await setMyWalletBalance(n);
      const w = await getMyWallet();
      setWallet(w);
      setTestBalance(String(w?.totalKrw ?? 0));
      alert("잔고가 저장되었습니다!");
    } catch (error) {
      console.error(error);
      alert("잔고 저장 실패");
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

        {/* ✅ 지갑(잔고) - PoC */}
        <div style={styles.settingsCard}>
          <h3 style={styles.settingsTitle}>지갑 💰</h3>

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

            <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>잔고 설정 (total_krw)</label>
              <input
                type="number"
                value={testBalance}
                onChange={(e) => setTestBalance(e.target.value)}
                style={styles.input}
                placeholder="예) 500000"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleWalletSave}
            style={styles.sectionSaveBtn}
          >
            💾 잔고 저장
          </button>
        </div>

        {/* (선택) 로그아웃 버튼이 MyPage에 필요하면 여기서 사용 가능 */}
        {/* <button onClick={handleLogout} style={styles.logoutBtn}>로그아웃</button> */}
      </div>
    </Layout>
  );
}

const styles = {
  container: { display: "flex", minHeight: "100vh", background: "#f8fafc" },
  sidebar: {
    width: "280px",
    background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "4px 0 24px rgba(0,0,0,0.1)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "32px",
    paddingBottom: "24px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  logoText: {
    fontSize: "20px",
    fontWeight: "800",
    color: "white",
    margin: 0,
  },
  nav: { display: "flex", flexDirection: "column", gap: "8px", flex: 1 },
  navDivider: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "1px",
    padding: "16px 16px 8px 16px",
    marginTop: "8px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    background: "transparent",
    border: "none",
    borderRadius: "12px",
    color: "#94a3b8",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "left",
  },
  navItemActive: {
    background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
    color: "white",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: "12px",
    color: "#ef4444",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    marginTop: "auto",
  },
  main: { flex: 1, padding: "32px", overflowY: "auto" },
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
  select: {
    padding: "14px 16px",
    fontSize: "15px",
    border: "2px solid #e2e8f0",
    borderRadius: "12px",
    fontWeight: "600",
    outline: "none",
    background: "white",
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
