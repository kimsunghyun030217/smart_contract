package com.p2p.energybackend.repository;

import com.p2p.energybackend.model.EnergyOrder;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface EnergyOrderRepository extends JpaRepository<EnergyOrder, Long> {

    // ✅ 진행중 주문: COMPLETED 제외
    List<EnergyOrder> findByUserIdAndStatusNotOrderByCreatedAtDesc(Long userId, String status);

    // ✅ 완료 주문: COMPLETED만
    List<EnergyOrder> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);

    // ✅ 매칭 엔진용(BUY-only): ACTIVE BUY 주문 id 가져오기 (createdAt 오래된 순)
    // ✅ (추천) 만료 주문 헛바퀴 방지: endTime > :now 조건 추가
    @Query("""
        SELECT o.id
        FROM EnergyOrder o
        WHERE o.status = 'ACTIVE'
          AND o.orderType = 'buy'
          AND o.endTime > :now
        ORDER BY o.createdAt ASC
    """)
    List<Long> findAllActiveBuyOrderIdsForMatching(@Param("now") LocalDateTime now);

    /**
     * ✅ 만료 엔진용(BUY/SELL 공통)
     * endTime 지난 ACTIVE 주문을 배치로 가져오고(페이지로 제한),
     * 서비스에서 1건씩 updateStatusIfMatch + 잠금해제 + 로그를 남김
     */
    @Query("""
        SELECT o
        FROM EnergyOrder o
        WHERE o.status = 'ACTIVE'
          AND o.endTime <= :now
        ORDER BY o.createdAt ASC
    """)
    List<EnergyOrder> findActiveOrdersToExpire(@Param("now") LocalDateTime now, Pageable pageable);

    /**
     * ✅ BUY 기준 SELL 후보 Pool 가져오기 (MySQL native)
     */
    @Query(value = """
        SELECT *
        FROM energy_orders o
        WHERE o.order_type = 'sell'
          AND o.status = 'ACTIVE'
          AND o.price_per_kwh <= :buyPrice
          AND o.user_id <> :buyerId
          AND o.end_time > NOW()
          AND o.amount_kwh BETWEEN :minAmount AND :maxAmount

          AND o.start_time < :buyEnd
          AND o.end_time > :buyStart

          AND TIMESTAMPDIFF(MINUTE,
                GREATEST(o.start_time, :buyStart),
                LEAST(o.end_time, :buyEnd)
              ) >= :minOverlapMinutes

        ORDER BY o.created_at ASC
        """, nativeQuery = true)
    List<EnergyOrder> findSellCandidatesForBuyPool(
            @Param("buyPrice") int buyPrice,
            @Param("buyerId") Long buyerId,
            @Param("minAmount") BigDecimal minAmount,
            @Param("maxAmount") BigDecimal maxAmount,
            @Param("buyStart") LocalDateTime buyStart,
            @Param("buyEnd") LocalDateTime buyEnd,
            @Param("minOverlapMinutes") int minOverlapMinutes,
            Pageable pageable
    );

    // =========================================================
    // ✅ A’(락 최소화)용: “상위 후보만 잠깐 락” + “조건부 상태 변경”
    // =========================================================

    @Query(value = """
        SELECT *
        FROM energy_orders
        WHERE id IN (:ids)
          AND status = 'ACTIVE'
        FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    List<EnergyOrder> lockActiveOrdersByIdsSkipLocked(@Param("ids") List<Long> ids);

    @Modifying
    @Query(value = """
        UPDATE energy_orders
        SET status = :toStatus
        WHERE id = :id
          AND status = :fromStatus
        """, nativeQuery = true)
    int updateStatusIfMatch(
            @Param("id") Long id,
            @Param("fromStatus") String fromStatus,
            @Param("toStatus") String toStatus
    );

    // ✅ Trade가 RUNNING 되면 연결된 주문들도 RUNNING으로 올리기
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE EnergyOrder o
           SET o.status = 'RUNNING'
         WHERE o.id IN :ids
           AND o.status = 'MATCHED'
    """)
    int moveMatchedOrdersToRunning(@Param("ids") List<Long> ids);

    // ❌ (추천) 벌크 만료 업데이트는 로그를 남길 수 없어서 사용하지 않음
    // int expireActiveOrders(@Param("now") LocalDateTime now);
}
