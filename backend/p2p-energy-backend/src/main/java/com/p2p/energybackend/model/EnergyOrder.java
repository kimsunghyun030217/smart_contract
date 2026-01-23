package com.p2p.energybackend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "energy_orders")
public class EnergyOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "order_type", nullable = false)
    private String orderType;   // sell / buy

    @Column(name = "price_per_kwh", nullable = false)
    private Integer pricePerKwh;

    @Column(name = "amount_kwh", nullable = false)
    private Double amountKwh;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(nullable = false)
    private String status = "active";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // ✅ 추가: 구매자 가중치 (BUY에서 사용, SELL은 null 가능)
    @Column(name = "weight_price")
    private Double weightPrice;

    @Column(name = "weight_distance")
    private Double weightDistance;

    @Column(name = "weight_trust")
    private Double weightTrust;

    // Getter/Setter
    public Long getId() { return id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getOrderType() { return orderType; }
    public void setOrderType(String orderType) { this.orderType = orderType; }

    public Integer getPricePerKwh() { return pricePerKwh; }
    public void setPricePerKwh(Integer pricePerKwh) { this.pricePerKwh = pricePerKwh; }

    public Double getAmountKwh() { return amountKwh; }
    public void setAmountKwh(Double amountKwh) { this.amountKwh = amountKwh; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    // ✅ 추가 getter/setter
    public Double getWeightPrice() { return weightPrice; }
    public void setWeightPrice(Double weightPrice) { this.weightPrice = weightPrice; }

    public Double getWeightDistance() { return weightDistance; }
    public void setWeightDistance(Double weightDistance) { this.weightDistance = weightDistance; }

    public Double getWeightTrust() { return weightTrust; }
    public void setWeightTrust(Double weightTrust) { this.weightTrust = weightTrust; }
}
