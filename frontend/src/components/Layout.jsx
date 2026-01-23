import { useState } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const [open, setOpen] = useState(true);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",     // ✅ minHeight -> height
        overflow: "hidden",  // ✅ body 스크롤 막기(끊김 해결 핵심)
      }}
    >
      {open && <Sidebar />}

      <div
        style={{
          flex: 1,
          background: "#f8fafc",
          padding: 24,
          overflowY: "auto", // ✅ 오른쪽만 스크롤
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
