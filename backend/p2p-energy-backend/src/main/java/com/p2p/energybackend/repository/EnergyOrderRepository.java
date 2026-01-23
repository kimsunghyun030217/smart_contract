package com.p2p.energybackend.repository;

import com.p2p.energybackend.model.EnergyOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnergyOrderRepository extends JpaRepository<EnergyOrder, Long> {

    // ✅ 진행중 주문: COMPLETED 제외
    List<EnergyOrder> findByUserIdAndStatusNotOrderByCreatedAtDesc(Long userId, String status);

    // ✅ 완료 주문: COMPLETED만
    List<EnergyOrder> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);
}
