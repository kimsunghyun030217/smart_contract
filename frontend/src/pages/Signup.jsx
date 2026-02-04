import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Signup.css";

// ✅ 내장지갑: 회원가입 성공 시 (username별) PK 생성/저장
import { createEmbeddedWalletIfMissing } from "../web3/embeddedWallet";

function Signup() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    const trimmedId = userId.trim();
    if (!trimmedId) return alert("아이디를 입력해주세요");

    try {
      const response = await fetch("http://localhost:8080/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedId,
          password: password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // ✅ 핵심: username을 넣어서 "계정별 PK"로 저장되게
        createEmbeddedWalletIfMissing(trimmedId);

        alert("회원가입 성공! 🎉");
        navigate("/login");
      } else {
        alert(data.message || "회원가입 실패!");
      }
    } catch (error) {
      console.error("회원가입 에러:", error);
      alert("서버와 통신 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-bg">
        <div className="signup-circle signup-circle1" />
        <div className="signup-circle signup-circle2" />
      </div>

      <div className="signup-card">
        <div className="signup-header">
          <div className="signup-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
                fill="url(#gradient)"
                stroke="url(#gradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient
                  id="gradient"
                  x1="3"
                  y1="2"
                  x2="21"
                  y2="22"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#10b981" />
                  <stop offset="1" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className="signup-title">P2P Energy Trading</h1>
          <p className="signup-subtitle">깨끗한 에너지 거래의 시작</p>
        </div>

        <form onSubmit={handleSignup} className="signup-form">
          {/* 아이디 */}
          <div className="signup-group">
            <label className="signup-label">아이디</label>
            <div className="signup-inputWrap">
              <svg
                className="signup-inputIcon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="7"
                  r="4"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="아이디를 입력하세요"
                className="signup-input"
                required
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div className="signup-group">
            <label className="signup-label">비밀번호</label>
            <div className="signup-inputWrap">
              <svg
                className="signup-inputIcon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="3"
                  y="11"
                  width="18"
                  height="11"
                  rx="2"
                  ry="2"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 11V7a5 5 0 0 1 10 0v4"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="signup-input"
                required
              />
            </div>
          </div>

          <button type="submit" className="signup-btn">
            <span>회원가입</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>

        <div className="signup-divider">
          <div className="signup-line" />
          <span className="signup-dividerText">또는</span>
          <div className="signup-line" />
        </div>

        <div className="signup-footer">
          <p className="signup-footerText">
            이미 계정이 있나요?{" "}
            <Link to="/login" className="signup-link">
              로그인하기
            </Link>
          </p>
        </div>

        <div className="signup-features">
          <div className="signup-feature">
            <span className="signup-featureIcon">⚡</span>
            <span className="signup-featureText">실시간 거래</span>
          </div>
          <div className="signup-feature">
            <span className="signup-featureIcon">🌱</span>
            <span className="signup-featureText">친환경 에너지</span>
          </div>
          <div className="signup-feature">
            <span className="signup-featureIcon">🔒</span>
            <span className="signup-featureText">안전한 거래</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
