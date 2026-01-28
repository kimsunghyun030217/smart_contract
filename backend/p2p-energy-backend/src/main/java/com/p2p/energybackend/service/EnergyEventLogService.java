package com.p2p.energybackend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.p2p.energybackend.model.EnergyEventLog;
import com.p2p.energybackend.repository.EnergyEventLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class EnergyEventLogService {

    private final EnergyEventLogRepository repo;
    private final ObjectMapper objectMapper;

    public EnergyEventLogService(EnergyEventLogRepository repo, ObjectMapper objectMapper) {
        this.repo = repo;
        this.objectMapper = objectMapper;
    }

    /**
     * ✅ 로그는 본업 트랜잭션을 망치면 안 됨
     * - REQUIRES_NEW: 메인 트랜잭션과 분리
     * - catch: 로그 저장 실패해도 메인 로직 계속
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(Long relatedUserId, String entityType, Long entityId, String event, Map<String, Object> meta) {
        try {
            validate(relatedUserId, entityType, entityId, event);

            EnergyEventLog l = new EnergyEventLog();
            l.setRelatedUserId(relatedUserId);
            l.setEntityType(entityType.trim().toUpperCase()); // ORDER / TRADE
            l.setEntityId(entityId);
            l.setEvent(event.trim().toUpperCase());           // ORDER_CREATED ...

            if (meta != null && !meta.isEmpty()) {
                l.setMetaJson(toJson(meta));
            } else {
                l.setMetaJson(null);
            }

            repo.save(l);

        } catch (Exception e) {
            // ✅ PoC: 메인 로직 계속
            // 개발 중엔 최소한 찍어두는 게 좋아
            System.out.println("[EventLog] failed: " + e.getClass().getSimpleName() + " / " + e.getMessage());
        }
    }

    private void validate(Long relatedUserId, String entityType, Long entityId, String event) {
        if (relatedUserId == null) throw new IllegalArgumentException("relatedUserId는 필수");
        if (entityType == null || entityType.isBlank()) throw new IllegalArgumentException("entityType 필수");
        if (entityId == null) throw new IllegalArgumentException("entityId 필수");
        if (event == null || event.isBlank()) throw new IllegalArgumentException("event 필수");
    }

    private String toJson(Map<String, Object> meta) {
        try {
            return objectMapper.writeValueAsString(meta);
        } catch (JsonProcessingException e) {
            return "{\"_meta_error\":\"json_parse_failed\"}";
        }
    }
}
