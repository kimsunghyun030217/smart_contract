import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCoordinates } from "../api/naverApi";



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
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    
    setUserProfile(prev => ({
      ...prev,
      userId: username
    }));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    alert("로그아웃 되었습니다.");
    navigate("/login");
  };

  const handlePasswordChange = () => {
    if (!userProfile.currentPassword) {
      alert("현재 비밀번호를 입력해주세요.");
      return;
    }
    
    if (!userProfile.newPassword) {
      alert("새 비밀번호를 입력해주세요.");
      return;
    }
    
    if (userProfile.newPassword !== userProfile.confirmPassword) {
      alert("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    
    alert("비밀번호가 변경되었습니다.");
    console.log("비밀번호 변경:", {
      currentPassword: userProfile.currentPassword,
      newPassword: userProfile.newPassword
    });
    
    setUserProfile({
      ...userProfile,
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
  };

  const handleAddressUpdate = () => {
    if (!userProfile.address) {
      alert("주소를 입력해주세요.");
      return;
    }
    
    alert("주소 정보가 저장되었습니다.");
    console.log("주소 저장:", {
      address: userProfile.address,
      detailAddress: userProfile.detailAddress,
      latitude: userProfile.latitude,
      longitude: userProfile.longitude
    });
  };

  const handlePaymentUpdate = () => {
    if (!userProfile.paymentMethod) {
      alert("결제 수단을 선택해주세요.");
      return;
    }
    
    alert("결제 정보가 저장되었습니다.");
    console.log("결제 정보 저장:", {
      paymentMethod: userProfile.paymentMethod
    });
  };

  const handleAddressSearch = async () => {
  const address = prompt("주소를 입력하세요\n예) 서울시 강남구 테헤란로 123");
  
  if (!address) return;
  
  try {
    const result = await getCoordinates(address);
    
    if (result) {
      setUserProfile({
        ...userProfile,
        address: result.fullAddress,
        latitude: result.latitude,
        longitude: result.longitude
      });
      alert("주소가 설정되었습니다!");
    } else {
      alert("주소를 찾을 수 없습니다. 다시 시도해주세요.");
    }
  } catch (error) {
    alert("주소 검색 중 오류가 발생했습니다.");
    console.error(error);
    }
};


  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="url(#gradient)" stroke="url(#gradient)" strokeWidth="2"/>
            <defs>
              <linearGradient id="gradient" x1="3" y1="2" x2="21" y2="22">
                <stop stopColor="#10b981"/>
                <stop offset="1" stopColor="#3b82f6"/>
              </linearGradient>
            </defs>
          </svg>
          <h2 style={styles.logoText}>P2P Energy</h2>
        </div>

        <nav style={styles.nav}>
          <button
            style={styles.navItem}
            onClick={() => navigate("/dashboard")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>대시보드</span>
          </button>

          <div style={styles.navDivider}>거래</div>
          
          <button
            style={styles.navItem}
            onClick={() => navigate("/dashboard")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>에너지 판매</span>
          </button>

          <button
            style={styles.navItem}
            onClick={() => navigate("/dashboard")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>에너지 구매</span>
          </button>

          <div style={styles.navDivider}>기타</div>

          <button
            style={styles.navItem}
            onClick={() => navigate("/dashboard")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>거래 내역</span>
          </button>

          <button
            style={styles.navItem}
            onClick={() => navigate("/dashboard")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>분석</span>
          </button>

          <button
            style={{...styles.navItem, ...styles.navItemActive}}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M5.5 21c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>마이페이지</span>
          </button>
        </nav>

        <button style={styles.logoutBtn} onClick={handleLogout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>로그아웃</span>
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>마이페이지 👤</h1>
            <p style={styles.headerSubtitle}>내 정보를 관리하세요</p>
          </div>
        </div>

        {/* 계정 정보 */}
        <div style={styles.settingsCard}>
          <h3 style={styles.settingsTitle}>계정 정보</h3>
          <div style={styles.formGrid}>
            <div style={{...styles.formGroup, gridColumn: "1 / -1"}}>
              <label style={styles.label}>아이디</label>
              <input
                type="text"
                value={userProfile.userId}
                style={{...styles.input, background: "#f8fafc", color: "#94a3b8"}}
                readOnly
              />
              <div style={styles.helperText}>아이디는 변경할 수 없습니다</div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>현재 비밀번호</label>
              <input
                type="password"
                value={userProfile.currentPassword}
                onChange={(e) => setUserProfile({...userProfile, currentPassword: e.target.value})}
                style={styles.input}
                placeholder="현재 비밀번호"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>새 비밀번호</label>
              <input
                type="password"
                value={userProfile.newPassword}
                onChange={(e) => setUserProfile({...userProfile, newPassword: e.target.value})}
                style={styles.input}
                placeholder="새 비밀번호"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>새 비밀번호 확인</label>
              <input
                type="password"
                value={userProfile.confirmPassword}
                onChange={(e) => setUserProfile({...userProfile, confirmPassword: e.target.value})}
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
          <p style={styles.settingsDesc}>
            전력 거래를 위해 정확한 위치 정보가 필요합니다
          </p>
          
          <div style={styles.formGrid}>
            <div style={{...styles.formGroup, gridColumn: "1 / -1"}}>
              <label style={styles.label}>주소</label>
              <div style={styles.addressInputGroup}>
                <input
                  type="text"
                  value={userProfile.address}
                  onChange={(e) => setUserProfile({...userProfile, address: e.target.value})}
                  style={styles.input}
                  placeholder="예) 서울시 강남구 테헤란로 123"
                />
                <button type="button" style={styles.searchBtn} onClick={handleAddressSearch}>
                  주소 검색
                </button>
              </div>
            </div>

            <div style={{...styles.formGroup, gridColumn: "1 / -1"}}>
              <label style={styles.label}>상세 주소</label>
              <input
                type="text"
                value={userProfile.detailAddress}
                onChange={(e) => setUserProfile({...userProfile, detailAddress: e.target.value})}
                style={styles.input}
                placeholder="예) 101동 1001호"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>위도 (Latitude)</label>
              <input
                type="text"
                value={userProfile.latitude}
                style={{...styles.input, background: "#f8fafc", color: "#94a3b8"}}
                placeholder="37.5665"
                readOnly
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>경도 (Longitude)</label>
              <input
                type="text"
                value={userProfile.longitude}
                style={{...styles.input, background: "#f8fafc", color: "#94a3b8"}}
                placeholder="126.9780"
                readOnly
              />
            </div>
          </div>

          <div style={styles.infoBox}>
            ℹ️ 주소 검색을 통해 입력하면 위도/경도가 자동으로 설정됩니다
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
            <div style={{...styles.formGroup, gridColumn: "1 / -1"}}>
              <label style={styles.label}>결제 수단</label>
              <select
                value={userProfile.paymentMethod}
                onChange={(e) => setUserProfile({...userProfile, paymentMethod: e.target.value})}
                style={styles.select}
              >
                <option value="">결제 수단을 선택하세요</option>
                <option value="card">신용/체크카드</option>
                <option value="bank">계좌이체</option>
                <option value="kakao">카카오페이</option>
                <option value="toss">토스페이</option>
              </select>
            </div>
          </div>

          {!userProfile.paymentMethod && (
            <div style={styles.warningBox}>
              ⚠️ 결제 수단을 등록하지 않으면 거래를 진행할 수 없습니다
            </div>
          )}

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
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f8fafc",
  },
  sidebar: {
    width: "280px",
    background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "4px 0 24px rgba(0, 0, 0, 0.1)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "32px",
    paddingBottom: "24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  },
  logoText: {
    fontSize: "20px",
    fontWeight: "800",
    color: "white",
    margin: 0,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1,
  },
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
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "12px",
    color: "#ef4444",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    marginTop: "auto",
  },
  main: {
    flex: 1,
    padding: "32px",
    overflowY: "auto",
  },
  header: {
    marginBottom: "32px",
  },
  headerTitle: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 8px 0",
  },
  headerSubtitle: {
    fontSize: "16px",
    color: "#64748b",
    margin: 0,
  },
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
  settingsDesc: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "24px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
  },
  input: {
    padding: "14px 16px",
    fontSize: "15px",
    border: "2px solid #e2e8f0",
    borderRadius: "12px",
    fontWeight: "600",
    outline: "none",
    transition: "all 0.2s",
  },
  helperText: {
    fontSize: "12px",
    color: "#94a3b8",
    marginTop: "-4px",
  },
  select: {
    padding: "14px 16px",
    fontSize: "15px",
    border: "2px solid #e2e8f0",
    borderRadius: "12px",
    fontWeight: "600",
    outline: "none",
    transition: "all 0.2s",
    background: "white",
    cursor: "pointer",
  },
  addressInputGroup: {
    display: "flex",
    gap: "12px",
  },
  searchBtn: {
    padding: "14px 24px",
    fontSize: "14px",
    fontWeight: "700",
    color: "white",
    background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  infoBox: {
    marginTop: "0px",
    marginBottom: "20px",
    padding: "16px",
    background: "#dbeafe",
    borderRadius: "12px",
    fontSize: "13px",
    color: "#1e40af",
  },
  warningBox: {
    marginTop: "0px",
    marginBottom: "20px",
    padding: "16px",
    background: "#fef3c7",
    borderRadius: "12px",
    fontSize: "13px",
    color: "#92400e",
    fontWeight: "600",
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
    transition: "all 0.3s",
    marginTop: "0px",
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
    transition: "all 0.3s",
    whiteSpace: "nowrap",
  },
};

export default MyPage;
