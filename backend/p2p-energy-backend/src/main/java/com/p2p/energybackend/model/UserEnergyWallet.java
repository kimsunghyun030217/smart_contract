package com.p2p.energybackend.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "user_energy_wallets")
public class UserEnergyWallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="user_id", nullable=false, unique=true)
    private Long userId;

    @Column(name="total_kwh", nullable=false, precision=18, scale=3)
    private BigDecimal totalKwh = BigDecimal.ZERO;

    @Column(name="locked_kwh", nullable=false, precision=18, scale=3)
    private BigDecimal lockedKwh = BigDecimal.ZERO;

    protected UserEnergyWallet() {}

    public UserEnergyWallet(Long userId) {
        this.userId = userId;
        this.totalKwh = BigDecimal.ZERO;
        this.lockedKwh = BigDecimal.ZERO;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public BigDecimal getTotalKwh() { return totalKwh; }
    public BigDecimal getLockedKwh() { return lockedKwh; }

    public void setTotalKwh(BigDecimal totalKwh) { this.totalKwh = totalKwh; }
    public void setLockedKwh(BigDecimal lockedKwh) { this.lockedKwh = lockedKwh; }
}
