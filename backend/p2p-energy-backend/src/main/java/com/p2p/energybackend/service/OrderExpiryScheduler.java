package com.p2p.energybackend.service;

import com.p2p.energybackend.repository.EnergyOrderRepository;
import jakarta.transaction.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class OrderExpiryScheduler {

    private final EnergyOrderRepository orderRepo;

    public OrderExpiryScheduler(EnergyOrderRepository orderRepo) {
        this.orderRepo = orderRepo;
    }

    // ✅ 1분마다: endTime 지난 ACTIVE 주문을 EXPIRED로 변경
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void expireOrdersJob() {
        LocalDateTime now = LocalDateTime.now();
        int updated = orderRepo.expireActiveOrders(now);

        // 필요하면 로그
        // System.out.println("[Scheduler] ACTIVE -> EXPIRED updated=" + updated);
    }
}
