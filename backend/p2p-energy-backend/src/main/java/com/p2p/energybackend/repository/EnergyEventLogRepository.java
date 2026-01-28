package com.p2p.energybackend.repository;

import com.p2p.energybackend.model.EnergyEventLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EnergyEventLogRepository extends JpaRepository<EnergyEventLog, Long> {

    // ✅ 내 이벤트 로그 최신 200개
    List<EnergyEventLog> findTop200ByRelatedUserIdOrderByCreatedAtDesc(Long relatedUserId);

    // ✅ 특정 엔티티(ORDER/TRADE) 단건 로그 최신순
    List<EnergyEventLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, Long entityId);
}
