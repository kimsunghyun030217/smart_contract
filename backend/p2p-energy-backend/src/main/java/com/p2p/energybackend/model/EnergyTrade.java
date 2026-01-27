package com.p2p.energybackend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;

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

    // ✅ Double -> BigDecimal (kWh 통일, 오차 방지)
    @Column(name = "amount_kwh", nullable = false, precision = 18, scale = 3)
    private BigDecimal amountKwh;

    @Column(name = "status", nullable = false)
    private String status = "MATCHED";

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "delivery_start")
    private LocalDateTime deliveryStart;

    @Column(name = "delivery_end")
    private LocalDateTime deliveryEnd;

    public EnergyTrade() {}

    public Long getId() { return id; }

    public Long getBuyOrderId() { return buyOrderId; }
    public void setBuyOrderId(Long buyOrderId) { this.buyOrderId = buyOrderId; }

    public Long getSellOrderId() { return sellOrderId; }
    public void setSellOrderId(Long sellOrderId) { this.sellOrderId = sellOrderId; }

    public Integer getPricePerKwh() { return pricePerKwh; }
    public void setPricePerKwh(Integer pricePerKwh) { this.pricePerKwh = pricePerKwh; }

    public BigDecimal getAmountKwh() { return amountKwh; }
    public void setAmountKwh(BigDecimal amountKwh) { this.amountKwh = amountKwh; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public LocalDateTime getDeliveryStart() { return deliveryStart; }
    public void setDeliveryStart(LocalDateTime deliveryStart) { this.deliveryStart = deliveryStart; }

    public LocalDateTime getDeliveryEnd() { return deliveryEnd; }
    public void setDeliveryEnd(LocalDateTime deliveryEnd) { this.deliveryEnd = deliveryEnd; }
}
