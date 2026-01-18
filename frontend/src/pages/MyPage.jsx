import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCoordinates } from "../api/naverApi";
import { changePassword } from "../api/authApi";

function MyPage() {
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
    paymentMethod: "",
  });

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
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    alert("로그아웃 되었습니다");
    navigate("/login");
  };

  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = userProfile;

    if (!currentPassword) {
      alert("현재 비밀번호를 입력해주세요");
      return;
    }

    if (!newPassword) {
      alert("새 비밀번호를 입력해주세요");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("새 비밀번호가 일치하지 않습니다");
      return;
    }

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

  const handleAddressUpdate = () => {
    if (!userProfile.address) {
      alert("주소를 입력해주세요");
      return;
    }

    alert("주소 정보가 저장되었습니다");
    console.log("주소 저장:", {
      address: userProfile.address,
      detailAddress: userProfile.detailAddress,
      latitude: userProfile.latitude,
      longitude: userProfile.longitude,
    });
  };

  const handlePaymentUpdate = () => {
    if (!userProfile.paymentMethod) {
      alert("결제 수단을 선택해주세요");
      return;
    }

    alert("결제 정보가 저장되었습니다");
    console.log("결제 정보 저장:", {
      paymentMethod: userProfile.paymentMethod,
    });
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
        alert("주소를 찾을 수 없습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error(error);
      alert("주소 검색 중 오류가 발생했습니다");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>
          <h2 style={styles.logoText}>P2P Energy</h2>
        </div>

        <nav style={styles.nav}>
          <button style={styles.navItem} onClick={() => navigate("/dashboard")}>
            <span>대시보드</span>
          </button>

          <div style={styles.navDivider}>거래</div>

          <button style={styles.navItem} onClick={() => navigate("/dashboard")}>
            <span>에너지 판매</span>
          </button>

          <button style={styles.navItem} onClick={() => navigate("/dashboard")}>
            <span>에너지 구매</span>
          </button>

          <div style={styles.navDivider}>기타</div>

          <button style={styles.navItem} onClick={() => navigate("/dashboard")}>
            <span>거래 내역</span>
          </button>

          <button style={styles.navItem} onClick={() => navigate("/dashboard")}>
            <span>분석</span>
          </button>

          <button style={{ ...styles.navItem, ...styles.navItemActive }}>
            <span>마이페이지</span>
          </button>
        </nav>

        <button style={styles.logoutBtn} onClick={handleLogout}>
          <span>로그아웃</span>
        </button>
      </div>

      <div style={styles.main}>
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

        {/* 결제 정보 */}
        <div style={styles.settingsCard}>
          <h3 style={styles.settingsTitle}>결제 정보 💳</h3>

          <div style={styles.formGrid}>
            <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>결제 수단</label>
              <select
                value={userProfile.paymentMethod}
                onChange={(e) =>
                  setUserProfile((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value,
                  }))
                }
                style={styles.select}
              >
                <option value="">결제 수단 선택</option>
                <option value="card">신용/체크카드</option>
                <option value="bank">계좌이체</option>
                <option value="kakao">카카오페이</option>
                <option value="toss">토스페이</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePaymentUpdate}
            style={styles.sectionSaveBtn}
          >
            💳 결제 정보 저장
          </button>
        </div>
      </div>
    </div>
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

export default MyPage;
