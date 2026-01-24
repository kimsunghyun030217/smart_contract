package com.p2p.energybackend.repository;

import com.p2p.energybackend.model.EnergyOrder;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.math.BigDecimal;

public interface EnergyOrderRepository extends JpaRepository<EnergyOrder, Long> {

    // ✅ 진행중 주문: COMPLETED 제외
    List<EnergyOrder> findByUserIdAndStatusNotOrderByCreatedAtDesc(Long userId, String status);

    // ✅ 완료 주문: COMPLETED만
    List<EnergyOrder> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);

    // ✅ BUY 들어왔을 때: 매칭 가능한 SELL 후보들 (정렬됨) + 락 + 자가매칭 방지
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT o FROM EnergyOrder o
        WHERE o.orderType = 'sell'
          AND o.status = 'ACTIVE'
          AND o.amountKwh = :amountKwh
          AND o.pricePerKwh <= :buyPrice
          AND o.endTime > CURRENT_TIMESTAMP
          AND o.userId <> :userId
        ORDER BY o.pricePerKwh ASC, o.createdAt ASC
    """)
    List<EnergyOrder> findSellMatchesForBuyLocked(
            @Param("buyPrice") int buyPrice,
            @Param("amountKwh") BigDecimal amountKwh,
            @Param("userId") Long userId,
            Pageable pageable
    );

    // ✅ SELL 들어왔을 때: 매칭 가능한 BUY 후보들 (정렬됨) + 락 + 자가매칭 방지
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT o FROM EnergyOrder o
        WHERE o.orderType = 'buy'
          AND o.status = 'ACTIVE'
          AND o.amountKwh = :amountKwh
          AND o.pricePerKwh >= :sellPrice
          AND o.endTime > CURRENT_TIMESTAMP
          AND o.userId <> :userId
        ORDER BY o.pricePerKwh DESC, o.createdAt ASC
    """)
    List<EnergyOrder> findBuyMatchesForSellLocked(
            @Param("sellPrice") int sellPrice,
            @Param("amountKwh") BigDecimal amountKwh,
            @Param("userId") Long userId,
            Pageable pageable
    );

    // ✅ (추가) 매칭 엔진용: ACTIVE + 만료 전 주문 전체 id 가져오기 (createdAt 오래된 순)
    @Query("""
        SELECT o.id FROM EnergyOrder o
        WHERE o.status = 'ACTIVE'
          AND o.endTime > CURRENT_TIMESTAMP
        ORDER BY o.createdAt ASC
    """)
    List<Long> findAllActiveOrderIdsForMatching();
}
