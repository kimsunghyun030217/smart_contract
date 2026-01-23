import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItem = {
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: "12px",
    cursor: "pointer",
    border: "none",
    background: "transparent",
    textAlign: "left",
    width: "100%",
    fontSize: "15px",
    fontWeight: 600,
    marginBottom: "8px"
  };

  const navItemActive = {
    background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
    color: "white"
  };

  const logoutBtn = {
    ...navItem,
    marginTop: "auto",          // ✅ 맨 아래로 밀기
    marginBottom: 0,
    color: "#fca5a5"
  };

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    // 1) 저장된 인증정보 정리 (프로젝트에 맞게 조정)
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    sessionStorage.clear(); // 필요 없으면 제거

    // 2) 로그인 화면으로 이동
    navigate("/login");
  };

  return (
    <div
      style={{
        width: "260px",
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        padding: "32px 24px",
        color: "white",
        display: "flex",
        flexDirection: "column",
        height: "100vh" // ✅ 화면 높이 기준으로 '아래 고정'이 안정적
      }}
    >
      <h2 style={{ marginBottom: "32px", fontSize: "22px", fontWeight: 800 }}>
        P2P Energy
      </h2>

      <button
        style={{ ...navItem, ...(isActive("/dashboard") ? navItemActive : {}) }}
        onClick={() => navigate("/dashboard")}
      >
        대시보드
      </button>

      <div style={{ margin: "24px 0 12px", color: "#64748b", fontSize: "12px" }}>
        거래
      </div>

      <button
        style={{ ...navItem, ...(isActive("/sell") ? navItemActive : {}) }}
        onClick={() => navigate("/sell")}
      >
        에너지 판매
      </button>

      <button
        style={{ ...navItem, ...(isActive("/buy") ? navItemActive : {}) }}
        onClick={() => navigate("/buy")}
      >
        에너지 구매
      </button>

      <div style={{ margin: "24px 0 12px", color: "#64748b", fontSize: "12px" }}>
        기타
      </div>

      <button
        style={{ ...navItem, ...(isActive("/orders") ? navItemActive : {}) }}
        onClick={() => navigate("/orders")}
      >
        주문내역
      </button>

      <button
        style={{ ...navItem, ...(isActive("/completed") ? navItemActive : {}) }}
        onClick={() => navigate("/completed")}
      >
        거래완료 내역
      </button>

      <button
        style={{ ...navItem, ...(isActive("/mypage") ? navItemActive : {}) }}
        onClick={() => navigate("/mypage")}
      >
        마이페이지
      </button>

      {/* ✅ 맨 아래 로그아웃 */}
      <button style={logoutBtn} onClick={handleLogout}>
        로그아웃
      </button>
    </div>
  );
}
