package com.p2p.energybackend.service;

import com.p2p.energybackend.model.EnergyTrade;
import com.p2p.energybackend.repository.EnergyOrderRepository;
import com.p2p.energybackend.repository.EnergyTradeRepository;
import jakarta.transaction.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class TradeScheduler {

    private final EnergyTradeRepository tradeRepo;
    private final EnergyOrderRepository orderRepo;

    public TradeScheduler(EnergyTradeRepository tradeRepo, EnergyOrderRepository orderRepo) {
        this.tradeRepo = tradeRepo;
        this.orderRepo = orderRepo;
    }

    // 30초마다: MATCHED 중에서 delivery_start 지난 거래를 RUNNING으로 + 연결된 주문도 RUNNING으로
    @Scheduled(fixedDelay = 30_000)
    @Transactional
    public void moveMatchedToRunningJob() {
        LocalDateTime now = LocalDateTime.now();

        // 1) 시작해야 하는 trade 조회
        List<EnergyTrade> trades = tradeRepo.findStartableTrades(now);
        if (trades.isEmpty()) return;

        // 2) trade RUNNING 전환 + 연결된 orderId 수집
        List<Long> orderIds = new ArrayList<>();

        for (EnergyTrade t : trades) {
            // 안전장치(중복 실행 방지)
            if (!"MATCHED".equalsIgnoreCase(t.getStatus())) continue;

            t.setStatus("RUNNING");

            if (t.getBuyOrderId() != null) orderIds.add(t.getBuyOrderId());
            if (t.getSellOrderId() != null) orderIds.add(t.getSellOrderId());
        }

        // trade 저장
        tradeRepo.saveAll(trades);

        // 3) 주문도 RUNNING 전환 (중복 제거)
        if (!orderIds.isEmpty()) {
            List<Long> distinctOrderIds = orderIds.stream().distinct().toList();
            orderRepo.moveMatchedOrdersToRunning(distinctOrderIds);
        }

        // 필요하면 로그
        // System.out.println("[Scheduler] trades->RUNNING=" + trades.size() + ", orders=" + orderIds.size());
    }
}
