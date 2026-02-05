import { useState } from "react";
import Sidebar from "./Sidebar";
import AutoMatcher from "./AutoMatcher";   // ✅ 이미 있음
import AutoSettler from "./AutoSettler";   // ✅ 추가

export default function Layout({ children }) {
  const [open, setOpen] = useState(true);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* ✅ 자동 매칭 엔진: 앱 켜져있는 동안 계속 돈다 */}
      <AutoMatcher />

      {/* ✅ 자동 정산 엔진: deliveryStart 지나면 settleTrade() 자동 호출 */}
      <AutoSettler />

      {open && <Sidebar />}

      <div
        style={{
          flex: 1,
          background: "#f8fafc",
          padding: 24,
          overflowY: "auto",
        }}
      >
        <button
          onClick={() => setOpen(!open)}
          style={{
            fontSize: 24,
            background: "white",
            border: "2px solid #e2e8f0",
            padding: "6px 12px",
            borderRadius: 8,
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          ☰
        </button>

        {children}
      </div>
    </div>
  );
}
