package com.p2p.energybackend.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "energy_event_logs",
        indexes = {
                @Index(name = "idx_eel_entity", columnList = "entity_type, entity_id"),
                @Index(name = "idx_eel_created_at", columnList = "created_at"),
                @Index(name = "idx_eel_event", columnList = "event"),
                @Index(name = "idx_eel_related_user", columnList = "related_user_id")
        }
)
public class EnergyEventLog {

    // ===== 권장: EntityType 상수(선택) =====
    public static final String ENTITY_ORDER = "ORDER";
    public static final String ENTITY_TRADE = "TRADE";

    // ===== 이벤트 타입(네가 정한 10개) =====
    public static final String ORDER_CREATED = "ORDER_CREATED";
    public static final String ORDER_DELETED = "ORDER_DELETED";
    public static final String ORDER_EXPIRED = "ORDER_EXPIRED";
    public static final String ORDER_MATCHED = "ORDER_MATCHED";
    public static final String ORDER_RUNNING = "ORDER_RUNNING";

    public static final String TRADE_CREATED = "TRADE_CREATED";
    public static final String TRADE_RUNNING = "TRADE_RUNNING";
    public static final String TRADE_COMPLETED = "TRADE_COMPLETED";

    public static final String DELIVERY_RECORDED = "DELIVERY_RECORDED";
    public static final String SETTLEMENT_RECORDED = "SETTLEMENT_RECORDED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // DB default CURRENT_TIMESTAMP도 있지만, JPA에서도 채워주게
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // ✅ 이 이벤트와 관련된 사용자(보통 order.user_id, trade 관련 사용자)
    @Column(name = "related_user_id", nullable = false)
    private Long relatedUserId;

    // ORDER / TRADE
    @Column(name = "entity_type", nullable = false, length = 20)
    private String entityType;

    // orderId or tradeId
    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    // ORDER_CREATED, ORDER_DELETED, TRADE_CREATED ...
    @Column(name = "event", nullable = false, length = 50)
    private String event;

    // MySQL JSON 컬럼에 String(JSON text)로 저장
    @Column(name = "meta_json", columnDefinition = "json")
    private String metaJson;

    // ===== constructors (선택) =====
    public EnergyEventLog() {}

    public EnergyEventLog(Long relatedUserId, String entityType, Long entityId, String event, String metaJson) {
        this.relatedUserId = relatedUserId;
        this.entityType = entityType;
        this.entityId = entityId;
        this.event = event;
        this.metaJson = metaJson;
    }

    // ===== getters/setters =====
    public Long getId() { return id; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public Long getRelatedUserId() { return relatedUserId; }
    public void setRelatedUserId(Long relatedUserId) { this.relatedUserId = relatedUserId; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }

    public String getEvent() { return event; }
    public void setEvent(String event) { this.event = event; }

    public String getMetaJson() { return metaJson; }
    public void setMetaJson(String metaJson) { this.metaJson = metaJson; }
}
