import { useState } from "react";
import { Link } from "react-router-dom";

function Signup() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = (e) => {
    e.preventDefault();

    const userData = { userId, password };
    localStorage.setItem("user", JSON.stringify(userData));

    alert("회원가입 완료!");
  };

  return (
    <div style={styles.container}>
      <div style={styles.background}>
        <div style={styles.circle1}></div>
        <div style={styles.circle2}></div>
      </div>
      
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="url(#gradient)" stroke="url(#gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="gradient" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#10b981"/>
                  <stop offset="1" stopColor="#3b82f6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 style={styles.title}>P2P Energy Trading</h1>
          <p style={styles.subtitle}>깨끗한 에너지 거래의 시작</p>
        </div>

        <form onSubmit={handleSignup} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <span>아이디</span>
            </label>
            <div style={styles.inputWrapper}>
              <svg style={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7" r="4" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="아이디를 입력하세요"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <span>비밀번호</span>
            </label>
            <div style={styles.inputWrapper}>
              <svg style={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                style={styles.input}
                required
              />
            </div>
          </div>

          <button type="submit" style={styles.button} className="signup-button">
            <span>회원가입</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>

        <div style={styles.divider}>
          <div style={styles.dividerLine}></div>
          <span style={styles.dividerText}>또는</span>
          <div style={styles.dividerLine}></div>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            이미 계정이 있나요?{" "}
            <Link to="/login" style={styles.link}>
              로그인하기
            </Link>
          </p>
        </div>

        <div style={styles.features}>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>⚡</span>
            <span style={styles.featureText}>실시간 거래</span>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>🌱</span>
            <span style={styles.featureText}>친환경 에너지</span>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>🔒</span>
            <span style={styles.featureText}>안전한 거래</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
    margin: 0,
    width: "100%",
  },
  background: {
    position: "absolute",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    top: 0,
    left: 0,
  },
  circle1: {
    position: "absolute",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)",
    top: "-300px",
    right: "-300px",
    animation: "pulse 8s ease-in-out infinite",
  },
  circle2: {
    position: "absolute",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)",
    bottom: "-250px",
    left: "-250px",
    animation: "pulse 6s ease-in-out infinite",
  },
  card: {
    background: "rgba(255, 255, 255, 0.98)",
    borderRadius: "24px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    padding: "48px",
    width: "100%",
    maxWidth: "500px",
    position: "relative",
    zIndex: 10,
    backdropFilter: "blur(10px)",
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "40px",
  },
  iconContainer: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "80px",
    height: "80px",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #ecfdf5 0%, #dbeafe 100%)",
    marginBottom: "20px",
    boxShadow: "0 10px 30px rgba(16, 185, 129, 0.2)",
  },
  title: {
    fontSize: "32px",
    fontWeight: "800",
    background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: "0 0 12px 0",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "15px",
    color: "#64748b",
    margin: 0,
    fontWeight: "500",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "16px",
    pointerEvents: "none",
    zIndex: 1,
  },
  input: {
    width: "100%",
    padding: "14px 16px 14px 48px",
    fontSize: "15px",
    border: "2px solid #e2e8f0",
    borderRadius: "12px",
    outline: "none",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    fontFamily: "inherit",
    backgroundColor: "#f8fafc",
    boxSizing: "border-box",
  },
  button: {
    marginTop: "8px",
    padding: "16px",
    fontSize: "16px",
    fontWeight: "700",
    color: "white",
    background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    margin: "32px 0 24px 0",
    gap: "12px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#e2e8f0",
  },
  dividerText: {
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: "500",
    padding: "0 8px",
  },
  footer: {
    textAlign: "center",
    marginBottom: "24px",
  },
  footerText: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
    fontWeight: "500",
  },
  link: {
    color: "#10b981",
    textDecoration: "none",
    fontWeight: "700",
    transition: "color 0.2s",
  },
  features: {
    display: "flex",
    justifyContent: "space-around",
    paddingTop: "24px",
    borderTop: "1px solid #e2e8f0",
  },
  feature: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  featureIcon: {
    fontSize: "24px",
  },
  featureText: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "600",
  },
};

export default Signup;
