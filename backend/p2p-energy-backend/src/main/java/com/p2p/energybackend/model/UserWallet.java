package com.p2p.energybackend.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_wallets")
public class UserWallet {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "total_krw", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalKrw = BigDecimal.ZERO;

    @Column(name = "locked_krw", nullable = false, precision = 18, scale = 2)
    private BigDecimal lockedKrw = BigDecimal.ZERO;

    // ✅ DB가 DEFAULT / ON UPDATE로 자동 관리 (JPA는 읽기만)
    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    protected UserWallet() {}

    public UserWallet(Long userId) {
        this.userId = userId;
        this.totalKrw = BigDecimal.ZERO;
        this.lockedKrw = BigDecimal.ZERO;
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public BigDecimal getTotalKrw() { return totalKrw; }
    public void setTotalKrw(BigDecimal totalKrw) { this.totalKrw = totalKrw; }

    public BigDecimal getLockedKrw() { return lockedKrw; }
    public void setLockedKrw(BigDecimal lockedKrw) { this.lockedKrw = lockedKrw; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }

    @Transient
    public BigDecimal getAvailableKrw() {
        return totalKrw.subtract(lockedKrw);
    }
}
