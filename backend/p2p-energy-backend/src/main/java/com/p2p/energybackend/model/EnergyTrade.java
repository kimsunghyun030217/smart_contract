package com.p2p.energybackend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "energy_trades")
public class EnergyTrade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "buy_order_id", nullable = false)
    private Long buyOrderId;

    @Column(name = "sell_order_id", nullable = false)
    private Long sellOrderId;

    @Column(name = "price_per_kwh", nullable = false)
    private Integer pricePerKwh;

    @Column(name = "amount_kwh", nullable = false)
    private Double amountKwh;

    @Column(name = "status", nullable = false)
    private String status = "MATCHED";

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public EnergyTrade() {}

    public Long getId() { return id; }

    public Long getBuyOrderId() { return buyOrderId; }
    public void setBuyOrderId(Long buyOrderId) { this.buyOrderId = buyOrderId; }

    public Long getSellOrderId() { return sellOrderId; }
    public void setSellOrderId(Long sellOrderId) { this.sellOrderId = sellOrderId; }

    public Integer getPricePerKwh() { return pricePerKwh; }
    public void setPricePerKwh(Integer pricePerKwh) { this.pricePerKwh = pricePerKwh; }

    public Double getAmountKwh() { return amountKwh; }
    public void setAmountKwh(Double amountKwh) { this.amountKwh = amountKwh; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
