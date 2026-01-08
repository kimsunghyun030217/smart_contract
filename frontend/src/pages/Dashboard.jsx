import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [energyData] = useState({
    production: 45.8,
    consumption: 32.4,
    trading: 13.4,
    savings: 156.7,
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    alert("로그아웃 되었습니다.");
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            style={{...styles.navItem, ...(activeTab === "dashboard" && styles.navItemActive)}}
            onClick={() => setActiveTab("dashboard")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>대시보드</span>
          </button>

          <button
            style={{...styles.navItem, ...(activeTab === "trading" && styles.navItemActive)}}
            onClick={() => setActiveTab("trading")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11l-3 3-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>에너지 거래</span>
          </button>

          <button
            style={{...styles.navItem, ...(activeTab === "production" && styles.navItemActive)}}
            onClick={() => setActiveTab("production")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v20M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>생산 관리</span>
          </button>

          <button
            style={{...styles.navItem, ...(activeTab === "analytics" && styles.navItemActive)}}
            onClick={() => setActiveTab("analytics")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>분석</span>
          </button>

          <button
            style={{...styles.navItem, ...(activeTab === "settings" && styles.navItemActive)}}
            onClick={() => setActiveTab("settings")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>설정</span>
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
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>안녕하세요! 👋</h1>
            <p style={styles.headerSubtitle}>오늘도 깨끗한 에너지로 시작하세요</p>
          </div>
          <div style={styles.headerRight}>
            <button style={styles.notificationBtn}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span style={styles.badge}>3</span>
            </button>
            <div style={styles.profile}>
              <div style={styles.avatar}>U</div>
              <div>
                <div style={styles.profileName}>사용자</div>
                <div style={styles.profileRole}>에너지 생산자</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon} className="stat-icon-green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="#10b981" stroke="#10b981" strokeWidth="2"/>
              </svg>
            </div>
            <div>
              <div style={styles.statLabel}>총 생산량</div>
              <div style={styles.statValue}>{energyData.production} kWh</div>
              <div style={styles.statChange}>
                <span style={styles.statChangeUp}>↑ 12.5%</span> 지난주 대비
              </div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"}} className="stat-icon-yellow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={styles.statLabel}>소비량</div>
              <div style={styles.statValue}>{energyData.consumption} kWh</div>
              <div style={styles.statChange}>
                <span style={styles.statChangeDown}>↓ 5.2%</span> 지난주 대비
              </div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)"}} className="stat-icon-blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11l-3 3-3-3" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={styles.statLabel}>거래량</div>
              <div style={styles.statValue}>{energyData.trading} kWh</div>
              <div style={styles.statChange}>
                <span style={styles.statChangeUp}>↑ 8.7%</span> 지난주 대비
              </div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)"}} className="stat-icon-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2v20M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={styles.statLabel}>총 수익</div>
              <div style={styles.statValue}>₩{energyData.savings.toLocaleString()}</div>
              <div style={styles.statChange}>
                <span style={styles.statChangeUp}>↑ 15.3%</span> 지난주 대비
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div style={styles.chartsGrid}>
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>에너지 생산/소비 추이</h3>
              <select style={styles.chartSelect}>
                <option>최근 7일</option>
                <option>최근 30일</option>
                <option>최근 90일</option>
              </select>
            </div>
            <div style={styles.chartPlaceholder}>
              <svg width="100%" height="200" viewBox="0 0 400 200">
                <defs>
                  <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M 0 150 Q 50 120 100 130 T 200 110 T 300 90 T 400 100" stroke="#10b981" strokeWidth="3" fill="url(#gradientGreen)"/>
                <path d="M 0 170 Q 50 160 100 165 T 200 150 T 300 140 T 400 145" stroke="#3b82f6" strokeWidth="3" fill="url(#gradientBlue)"/>
              </svg>
              <div style={styles.chartLegend}>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendDot, background: "#10b981"}}></div>
                  <span>생산량</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendDot, background: "#3b82f6"}}></div>
                  <span>소비량</span>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>최근 거래 내역</h3>
              <a href="#" style={styles.viewAll}>전체보기 →</a>
            </div>
            <div style={styles.transactionList}>
              {[
                { type: "판매", amount: "5.2 kWh", price: "₩8,400", time: "2시간 전", status: "완료" },
                { type: "구매", amount: "3.1 kWh", price: "₩4,960", time: "5시간 전", status: "완료" },
                { type: "판매", amount: "7.8 kWh", price: "₩12,480", time: "1일 전", status: "완료" },
                { type: "판매", amount: "4.5 kWh", price: "₩7,200", time: "1일 전", status: "대기" },
              ].map((tx, idx) => (
                <div key={idx} style={styles.transactionItem}>
                  <div style={styles.transactionLeft}>
                    <div style={{
                      ...styles.transactionIcon,
                      background: tx.type === "판매" ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" : "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)"
                    }}>
                      {tx.type === "판매" ? "↑" : "↓"}
                    </div>
                    <div>
                      <div style={styles.transactionType}>{tx.type}</div>
                      <div style={styles.transactionAmount}>{tx.amount}</div>
                    </div>
                  </div>
                  <div style={styles.transactionRight}>
                    <div style={styles.transactionPrice}>{tx.price}</div>
                    <div style={styles.transactionTime}>{tx.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={styles.quickActions}>
          <h3 style={styles.sectionTitle}>빠른 실행</h3>
          <div style={styles.actionsGrid}>
            <button style={styles.actionCard}>
              <div style={{...styles.actionIcon, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)"}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={styles.actionText}>에너지 판매</div>
            </button>

            <button style={styles.actionCard}>
              <div style={{...styles.actionIcon, background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3h18v18H3zM9 9h6v6H9z" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={styles.actionText}>에너지 구매</div>
            </button>

            <button style={styles.actionCard}>
              <div style={{...styles.actionIcon, background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={styles.actionText}>거래 내역</div>
            </button>

            <button style={styles.actionCard}>
              <div style={{...styles.actionIcon, background: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)"}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 20V10M12 20V4M6 20v-6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={styles.actionText}>상세 분석</div>
            </button>
          </div>
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
    marginBottom: "48px",
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  notificationBtn: {
    position: "relative",
    width: "48px",
    height: "48px",
    background: "white",
    border: "2px solid #e2e8f0",
    borderRadius: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  badge: {
    position: "absolute",
    top: "-4px",
    right: "-4px",
    background: "#ef4444",
    color: "white",
    fontSize: "11px",
    fontWeight: "700",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  profile: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 16px 8px 8px",
    background: "white",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: "700",
    fontSize: "16px",
  },
  profileName: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
  },
  profileRole: {
    fontSize: "12px",
    color: "#64748b",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "24px",
    marginBottom: "32px",
  },
  statCard: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    border: "2px solid #e2e8f0",
    display: "flex",
    gap: "16px",
    transition: "all 0.3s",
  },
  statIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statLabel: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "600",
    marginBottom: "8px",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "8px",
  },
  statChange: {
    fontSize: "13px",
    color: "#64748b",
  },
  statChangeUp: {
    color: "#10b981",
    fontWeight: "700",
  },
  statChangeDown: {
    color: "#ef4444",
    fontWeight: "700",
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
    gap: "24px",
    marginBottom: "32px",
  },
  chartCard: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    border: "2px solid #e2e8f0",
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  chartTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  chartSelect: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "2px solid #e2e8f0",
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748b",
    cursor: "pointer",
    background: "white",
  },
  viewAll: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#10b981",
    textDecoration: "none",
  },
  chartPlaceholder: {
    position: "relative",
  },
  chartLegend: {
    display: "flex",
    gap: "24px",
    marginTop: "16px",
    justifyContent: "center",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "600",
  },
  legendDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
  },
  transactionList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  transactionItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    background: "#f8fafc",
    borderRadius: "12px",
    transition: "all 0.2s",
  },
  transactionLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  transactionIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "700",
  },
  transactionType: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
  },
  transactionAmount: {
    fontSize: "13px",
    color: "#64748b",
  },
  transactionRight: {
    textAlign: "right",
  },
  transactionPrice: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  transactionTime: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  quickActions: {
    marginTop: "32px",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "20px",
  },
  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },
  actionCard: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    border: "2px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  actionIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
};

export default Dashboard;
