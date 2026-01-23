import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation(); // 현재 URL 가져오기

  // 기본 스타일
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

  // 활성화 상태 스타일 (선택된 메뉴)
  const navItemActive = {
    background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
    color: "white"
  };

  // 현재 URL 기준으로 active 체크
  const isActive = (path) => location.pathname === path;

  return (
    <div
      style={{
        width: "260px",
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        padding: "32px 24px",
        color: "white",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <h2 style={{ marginBottom: "32px", fontSize: "22px", fontWeight: 800 }}>
        P2P Energy
      </h2>

      {/* 대시보드 */}
      <button
        style={{
          ...navItem,
          ...(isActive("/dashboard") ? navItemActive : {})
        }}
        onClick={() => navigate("/dashboard")}
      >
        대시보드
      </button>

      <div style={{ margin: "24px 0 12px", color: "#64748b", fontSize: "12px" }}>
        거래
      </div>

      {/* 에너지 판매 */}
      <button
        style={{
          ...navItem,
          ...(isActive("/sell") ? navItemActive : {})
        }}
        onClick={() => navigate("/sell")}
      >
        에너지 판매
      </button>

      {/* 에너지 구매 */}
      <button
        style={{
          ...navItem,
          ...(isActive("/buy") ? navItemActive : {})
        }}
        onClick={() => navigate("/buy")}
      >
        에너지 구매
      </button>

      <div style={{ margin: "24px 0 12px", color: "#64748b", fontSize: "12px" }}>
        기타
      </div>

      {/* 주문내역 */}
      <button
        style={{
          ...navItem,
          ...(isActive("/orders") ? navItemActive : {})
        }}
        onClick={() => navigate("/orders")}
      >
        주문내역
      </button>

      {/* 마이페이지 */}
      <button
        style={{
          ...navItem,
          ...(isActive("/mypage") ? navItemActive : {})
        }}
        onClick={() => navigate("/mypage")}
      >
        마이페이지
      </button>
    </div>
  );
}
