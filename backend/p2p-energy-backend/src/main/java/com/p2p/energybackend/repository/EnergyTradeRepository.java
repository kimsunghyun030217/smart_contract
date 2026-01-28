package com.p2p.energybackend.repository;

import com.p2p.energybackend.model.EnergyTrade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface EnergyTradeRepository extends JpaRepository<EnergyTrade, Long> {

    // ✅ delivery_start <= now 인 MATCHED 거래들(시작해야 하는 거래들) 조회
    @Query("""
        select t
          from EnergyTrade t
         where t.status = 'MATCHED'
           and t.deliveryStart <= :now
    """)
    List<EnergyTrade> findStartableTrades(@Param("now") LocalDateTime now);
}
