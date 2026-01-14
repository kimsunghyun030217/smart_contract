import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [tradeMode, setTradeMode] = useState("sell"); // 'sell' or 'buy'
  
  const [energyData] = useState({
    availableEnergy: 45.8, // 판매 가능한 에너지
    currentPrice: 1600, // 현재 kWh당 가격
    todayEarnings: 12400, // 오늘 수익
    monthlyEarnings: 156700, // 월 수익
    demandEnergy: 32.4, // 필요한 에너지
    estimatedCost: 51840, // 예상 비용
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

          {/* 판매/구매 네비게이션 */}
          <div style={styles.navDivider}>거래</div>
          
          <button
            style={{...styles.navItem, ...(activeTab === "sell" && styles.navItemActive)}}
            onClick={() => {
              setActiveTab("sell");
              setTradeMode("sell");
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>에너지 판매</span>
          </button>

          <button
            style={{...styles.navItem, ...(activeTab === "buy" && styles.navItemActive)}}
            onClick={() => {
              setActiveTab("buy");
              setTradeMode("buy");
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>에너지 구매</span>
          </button>

          <div style={styles.navDivider}>기타</div>

          <button
            style={{...styles.navItem, ...(activeTab === "history" && styles.navItemActive)}}
            onClick={() => setActiveTab("history")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>거래 내역</span>
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
          style={styles.navItem}
          onClick={() => navigate("/mypage")}
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
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>
              {tradeMode === "sell" ? "에너지 판매 🔋" : "에너지 구매 ⚡"}
            </h1>
            <p style={styles.headerSubtitle}>
              {tradeMode === "sell" 
                ? "남는 에너지를 이웃에게 판매하세요" 
                : "필요한 에너지를 저렴하게 구매하세요"}
            </p>
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
                <div style={styles.profileRole}>
                  {tradeMode === "sell" ? "에너지 판매자" : "에너지 구매자"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 판매/구매 모드 토글 */}
        <div style={styles.modeToggle}>
          <button
            style={{
              ...styles.modeBtn,
              ...(tradeMode === "sell" && styles.modeBtnActive),
              background: tradeMode === "sell" 
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                : "white"
            }}
            onClick={() => setTradeMode("sell")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={styles.modeBtnTitle}>판매하기</div>
              <div style={styles.modeBtnDesc}>남는 에너지 판매</div>
            </div>
          </button>

          <button
            style={{
              ...styles.modeBtn,
              ...(tradeMode === "buy" && styles.modeBtnActive),
              background: tradeMode === "buy" 
                ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" 
                : "white"
            }}
            onClick={() => setTradeMode("buy")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={styles.modeBtnTitle}>구매하기</div>
              <div style={styles.modeBtnDesc}>필요한 에너지 구매</div>
            </div>
          </button>
        </div>

        {/* 판매 모드 콘텐츠 */}
        {tradeMode === "sell" && (
          <>
            {/* 판매 정보 카드 */}
            <div style={styles.infoGrid}>
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>판매 가능한 에너지</div>
                <div style={styles.infoValue}>{energyData.availableEnergy} kWh</div>
                <div style={styles.infoDesc}>현재 판매 가능</div>
              </div>

              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>현재 판매 가격</div>
                <div style={styles.infoValue}>₩{energyData.currentPrice}/kWh</div>
                <div style={styles.infoDesc}>실시간 시장 가격</div>
              </div>

              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>오늘 수익</div>
                <div style={styles.infoValue}>₩{energyData.todayEarnings.toLocaleString()}</div>
                <div style={styles.infoChange}>
                  <span style={styles.infoChangeUp}>↑ 15.3%</span> 어제 대비
                </div>
              </div>
            </div>

            {/* 판매 액션 */}
            <div style={styles.actionSection}>
              <div style={styles.actionCard}>
                <h3 style={styles.actionTitle}>빠른 판매</h3>
                <p style={styles.actionDesc}>현재 시장 가격으로 즉시 판매</p>
                <div style={styles.inputGroup}>
                  <input 
                    type="number" 
                    placeholder="판매할 에너지량 (kWh)" 
                    style={styles.input}
                  />
                  <div style={styles.priceInfo}>
                    예상 수익: ₩{(energyData.availableEnergy * energyData.currentPrice).toLocaleString()}
                  </div>
                </div>
                <button style={{...styles.primaryBtn, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)"}}>
                  즉시 판매하기
                </button>
              </div>

              <div style={styles.actionCard}>
                <h3 style={styles.actionTitle}>가격 설정 판매</h3>
                <p style={styles.actionDesc}>원하는 가격으로 판매 등록</p>
                <div style={styles.inputGroup}>
                  <input 
                    type="number" 
                    placeholder="판매할 에너지량 (kWh)" 
                    style={styles.input}
                  />
                  <input 
                    type="number" 
                    placeholder="희망 가격 (₩/kWh)" 
                    style={styles.input}
                  />
                </div>
                <button style={{...styles.secondaryBtn}}>
                  판매 등록하기
                </button>
              </div>
            </div>
          </>
        )}

        {/* 구매 모드 콘텐츠 */}
        {tradeMode === "buy" && (
          <>
            {/* 구매 정보 카드 */}
            <div style={styles.infoGrid}>
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>필요한 에너지</div>
                <div style={styles.infoValue}>{energyData.demandEnergy} kWh</div>
                <div style={styles.infoDesc}>이번 주 예상 필요량</div>
              </div>

              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>현재 구매 가격</div>
                <div style={styles.infoValue}>₩{energyData.currentPrice}/kWh</div>
                <div style={styles.infoDesc}>실시간 시장 가격</div>
              </div>

              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>예상 비용</div>
                <div style={styles.infoValue}>₩{energyData.estimatedCost.toLocaleString()}</div>
                <div style={styles.infoChange}>
                  <span style={styles.infoChangeDown}>↓ 8.2%</span> 지난주 대비
                </div>
              </div>
            </div>

            {/* 구매 액션 */}
            <div style={styles.actionSection}>
              <div style={styles.actionCard}>
                <h3 style={styles.actionTitle}>빠른 구매</h3>
                <p style={styles.actionDesc}>현재 시장 가격으로 즉시 구매</p>
                <div style={styles.inputGroup}>
                  <input 
                    type="number" 
                    placeholder="구매할 에너지량 (kWh)" 
                    style={styles.input}
                  />
                  <div style={styles.priceInfo}>
                    예상 비용: ₩{(energyData.demandEnergy * energyData.currentPrice).toLocaleString()}
                  </div>
                </div>
                <button style={{...styles.primaryBtn, background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"}}>
                  즉시 구매하기
                </button>
              </div>

              <div style={styles.actionCard}>
                <h3 style={styles.actionTitle}>가격 설정 구매</h3>
                <p style={styles.actionDesc}>원하는 가격으로 구매 주문</p>
                <div style={styles.inputGroup}>
                  <input 
                    type="number" 
                    placeholder="구매할 에너지량 (kWh)" 
                    style={styles.input}
                  />
                  <input 
                    type="number" 
                    placeholder="희망 가격 (₩/kWh)" 
                    style={styles.input}
                  />
                </div>
                <button style={{...styles.secondaryBtn}}>
                  구매 주문하기
                </button>
              </div>
            </div>
          </>
        )}

        {/* 최근 거래 내역 */}
        <div style={styles.recentSection}>
          <h3 style={styles.sectionTitle}>최근 거래 내역</h3>
          <div style={styles.transactionList}>
            {[
              { type: "판매", amount: "5.2 kWh", price: "₩8,400", time: "2시간 전", status: "완료" },
              { type: "구매", amount: "3.1 kWh", price: "₩4,960", time: "5시간 전", status: "완료" },
              { type: "판매", amount: "7.8 kWh", price: "₩12,480", time: "1일 전", status: "완료" },
            ].map((tx, idx) => (
              <div key={idx} style={styles.transactionItem}>
                <div style={styles.transactionLeft}>
                  <div style={{
                    ...styles.transactionIcon,
                    background: tx.type === "판매" 
                      ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" 
                      : "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                    color: tx.type === "판매" ? "#10b981" : "#3b82f6"
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
  // 모드 토글
  modeToggle: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "32px",
  },
  modeBtn: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "24px",
    border: "2px solid #e2e8f0",
    borderRadius: "16px",
    cursor: "pointer",
    transition: "all 0.3s",
    fontSize: "16px",
  },
  modeBtnActive: {
    color: "white",
    border: "2px solid transparent",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
  },
  modeBtnTitle: {
    fontSize: "18px",
    fontWeight: "700",
    marginBottom: "4px",
  },
  modeBtnDesc: {
    fontSize: "13px",
    opacity: 0.8,
  },
  // 정보 카드
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "32px",
  },
  infoCard: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    border: "2px solid #e2e8f0",
  },
  infoLabel: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "600",
    marginBottom: "12px",
  },
  infoValue: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "8px",
  },
  infoDesc: {
    fontSize: "13px",
    color: "#94a3b8",
  },
  infoChange: {
    fontSize: "13px",
    color: "#64748b",
  },
  infoChangeUp: {
    color: "#10b981",
    fontWeight: "700",
  },
  infoChangeDown: {
    color: "#3b82f6",
    fontWeight: "700",
  },
  // 액션 섹션
  actionSection: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: "24px",
    marginBottom: "32px",
  },
  actionCard: {
    background: "white",
    padding: "32px",
    borderRadius: "16px",
    border: "2px solid #e2e8f0",
  },
  actionTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 8px 0",
  },
  actionDesc: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0 0 24px 0",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "20px",
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
  priceInfo: {
    padding: "12px 16px",
    background: "#f8fafc",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
  },
  primaryBtn: {
    width: "100%",
    padding: "16px",
    fontSize: "16px",
    fontWeight: "700",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  secondaryBtn: {
    width: "100%",
    padding: "16px",
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    background: "white",
    border: "2px solid #e2e8f0",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  // 최근 거래
  recentSection: {
    background: "white",
    padding: "32px",
    borderRadius: "16px",
    border: "2px solid #e2e8f0",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "20px",
    margin: "0 0 20px 0",
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
};

export default Dashboard;
