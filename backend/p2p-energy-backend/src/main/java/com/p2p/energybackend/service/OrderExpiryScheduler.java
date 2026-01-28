package com.p2p.energybackend.service;

import com.p2p.energybackend.model.EnergyOrder;
import com.p2p.energybackend.repository.EnergyOrderRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class OrderExpiryScheduler {

    private final EnergyOrderRepository orderRepo;
    private final EnergyOrderService orderService;

    private static final int EXPIRE_BATCH_SIZE = 500;

    public OrderExpiryScheduler(EnergyOrderRepository orderRepo, EnergyOrderService orderService) {
        this.orderRepo = orderRepo;
        this.orderService = orderService;
    }

    @Scheduled(fixedDelay = 30_000)
    public void expireOrdersJob() {
        LocalDateTime now = LocalDateTime.now();

        List<EnergyOrder> targets = orderRepo.findActiveOrdersToExpire(
                now, PageRequest.of(0, EXPIRE_BATCH_SIZE)
        );
        if (targets == null || targets.isEmpty()) return;

        for (EnergyOrder snap : targets) {
            try {
                orderService.expireOrderByScheduler(snap, now);
            } catch (Exception e) {
                System.out.println("[OrderExpiryScheduler] expire failed id=" + snap.getId() + " / " + e.getMessage());
            }
        }
    }
}
