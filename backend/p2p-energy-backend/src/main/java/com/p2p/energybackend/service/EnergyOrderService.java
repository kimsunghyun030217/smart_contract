package com.p2p.energybackend.service;

import com.p2p.energybackend.model.EnergyOrder;
import com.p2p.energybackend.model.EnergyTrade;
import com.p2p.energybackend.model.UserWallet;
import com.p2p.energybackend.repository.EnergyOrderRepository;
import com.p2p.energybackend.repository.EnergyTradeRepository;
import com.p2p.energybackend.repository.UserWalletRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled; // ✅ [SCHEDULER]
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime; // ✅ [SCHEDULER]
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean; // ✅ [SCHEDULER]

@Service
public class EnergyOrderService {

    private final EnergyOrderRepository energyOrderRepository;
    private final EnergyTradeRepository energyTradeRepository;
    private final UserWalletRepository userWalletRepository;

    // ✅ [SCHEDULER] 스케줄러 중복 실행 방지(5초인데 처리 오래 걸리면 겹칠 수 있음)
    private final AtomicBoolean matchingRunning = new AtomicBoolean(false);

    public EnergyOrderService(EnergyOrderRepository energyOrderRepository,
                              EnergyTradeRepository energyTradeRepository,
                              UserWalletRepository userWalletRepository) {
        this.energyOrderRepository = energyOrderRepository;
        this.energyTradeRepository = energyTradeRepository;
        this.userWalletRepository = userWalletRepository;
    }

    // ✅ [SCHEDULER] 5초마다 ACTIVE 전체 훑고 매칭 시도
    @Scheduled(fixedDelay = 5000)
    public void runMatchingEngine() {
        // 이미 실행 중이면 스킵 (중복 실행 방지)
        if (!matchingRunning.compareAndSet(false, true)) return;

        try {
            runMatchingEngineTx();
        } finally {
            matchingRunning.set(false);
        }
    }

    // ✅ [SCHEDULER] 실제 DB 작업은 트랜잭션으로 묶어서 처리
    @Transactional
    protected void runMatchingEngineTx() {
        List<Long> activeIds = energyOrderRepository.findAllActiveOrderIdsForMatching();

        for (Long id : activeIds) {
            matchOneById(id);
        }
    }

    // ✅ [SCHEDULER] id로 다시 읽어서 ACTIVE면 매칭 1번 시도
    private void matchOneById(Long orderId) {
        EnergyOrder order = energyOrderRepository.findById(orderId).orElse(null);
        if (order == null) return;

        if (!"ACTIVE".equalsIgnoreCase(order.getStatus())) return;

        // endTime 만료면 스킵 (Repository에서 걸렀지만 안전장치)
        if (order.getEndTime() == null || !order.getEndTime().isAfter(LocalDateTime.now())) return;

        tryMatchOne(order);
    }

    // ✅ 주문 저장 + (BUY면 reserve 잠금) + 저장 직후 1:1 매칭 시도
    @Transactional
    public EnergyOrder createOrder(EnergyOrder order) {

        // ✅ (1) orderType / status 저장 전 통일 (필수)
        if (order.getOrderType() == null || order.getOrderType().isBlank()) {
            throw new IllegalArgumentException("orderType 필요 (buy/sell)");
        }
        order.setOrderType(order.getOrderType().toLowerCase());

        if (order.getStatus() == null || order.getStatus().isBlank()) {
            order.setStatus("ACTIVE");
        }
        order.setStatus(order.getStatus().toUpperCase());

        // ✅ (4) kWh 통일: amountKwh scale(3) 강제 (DECIMAL(18,3)와 맞춤)
        if (order.getAmountKwh() == null) {
            throw new IllegalArgumentException("amountKwh 필요");
        }
        order.setAmountKwh(order.getAmountKwh().setScale(3, RoundingMode.HALF_UP));

        // 2) BUY일 때만 가중치 사용 (없으면 기본값) + 정규화
        if ("buy".equalsIgnoreCase(order.getOrderType())) {
            if (order.getWeightPrice() == null) order.setWeightPrice(0.6);
            if (order.getWeightDistance() == null) order.setWeightDistance(0.3);
            if (order.getWeightTrust() == null) order.setWeightTrust(0.1);

            double sum = order.getWeightPrice() + order.getWeightDistance() + order.getWeightTrust();
            if (sum > 0 && Math.abs(sum - 1.0) > 0.0001) {
                order.setWeightPrice(order.getWeightPrice() / sum);
                order.setWeightDistance(order.getWeightDistance() / sum);
                order.setWeightTrust(order.getWeightTrust() / sum);
            }
        }

        // ✅ (2) BUY면 reserve 잠금: buyPrice 기준으로 locked_krw 증가
        if ("buy".equalsIgnoreCase(order.getOrderType())) {
            reserveMoneyForBuyOrder(order);
        }

        // 4) 주문 저장
        EnergyOrder saved = energyOrderRepository.save(order);

        // 5) 저장 직후 매칭 시도 (1:1 전량체결)
        tryMatchOne(saved);

        return saved;
    }

    // ✅ 진행중 주문(완료 제외) 조회 (최신순)
    public List<EnergyOrder> getMyOrdersInProgress(Long userId) {
        return energyOrderRepository.findByUserIdAndStatusNotOrderByCreatedAtDesc(userId, "COMPLETED");
    }

    // ✅ 완료 주문(COMPLETED만) 조회 (최신순)
    public List<EnergyOrder> getMyCompletedOrders(Long userId) {
        return energyOrderRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, "COMPLETED");
    }

    // ✅ 주문 취소(삭제): ACTIVE(대기)인 내 주문만 가능
    @Transactional
    public void cancelOrder(Long userId, Long orderId) {
        EnergyOrder order = energyOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없음"));

        if (!order.getUserId().equals(userId)) {
            throw new SecurityException("권한 없음");
        }

        if (!"ACTIVE".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalStateException("대기(ACTIVE) 상태만 취소 가능");
        }

        // BUY 주문이면 잠금 해제(예약 취소)
        if ("buy".equalsIgnoreCase(order.getOrderType())) {
            releaseMoneyForBuyOrder(order);
        }

        energyOrderRepository.deleteById(orderId);
    }

    /**
     * ✅ 매칭 핵심: 1:1 전량체결, 가격 교차 허용(buy>=sell)
     */
    private void tryMatchOne(EnergyOrder newOrder) {

        if (!"ACTIVE".equalsIgnoreCase(newOrder.getStatus())) return;

        String type = newOrder.getOrderType();      // buy/sell (lowercase로 통일됨)
        int price = newOrder.getPricePerKwh();
        BigDecimal amount = newOrder.getAmountKwh(); // ✅ BigDecimal
        Long userId = newOrder.getUserId();

        // ✅ BUY 주문이면 → SELL 1개 찾기
        if ("buy".equalsIgnoreCase(type)) {

            List<EnergyOrder> candidates = energyOrderRepository.findSellMatchesForBuyLocked(
                    price,
                    amount,
                    userId,
                    PageRequest.of(0, 1)
            );

            if (candidates.isEmpty()) return;

            EnergyOrder sell = candidates.get(0);

            // 상태 업데이트: 둘 다 MATCHED
            newOrder.setStatus("MATCHED");
            sell.setStatus("MATCHED");
            energyOrderRepository.save(newOrder);
            energyOrderRepository.save(sell);

            // ✅ 체결가: SELL 가격
            int executedPrice = sell.getPricePerKwh();

            // trade 생성
            EnergyTrade trade = new EnergyTrade();
            trade.setBuyOrderId(newOrder.getId());
            trade.setSellOrderId(sell.getId());
            trade.setPricePerKwh(executedPrice);

            // ✅ EnergyTrade.amountKwh도 BigDecimal이어야 함
            trade.setAmountKwh(amount);

            trade.setStatus("MATCHED");
            energyTradeRepository.save(trade);

            // ✅ (3) 차액 해제: buyPrice로 잠갔는데 executedPrice가 더 싸면 locked_krw에서 차액 풀기
            unlockBuyerExtraLock(newOrder, executedPrice);

            return;
        }

        // ✅ SELL 주문이면 → BUY 1개 찾기
        if ("sell".equalsIgnoreCase(type)) {

            List<EnergyOrder> candidates = energyOrderRepository.findBuyMatchesForSellLocked(
                    price,
                    amount,
                    userId,
                    PageRequest.of(0, 1)
            );

            if (candidates.isEmpty()) return;

            EnergyOrder buy = candidates.get(0);

            newOrder.setStatus("MATCHED");
            buy.setStatus("MATCHED");
            energyOrderRepository.save(newOrder);
            energyOrderRepository.save(buy);

            // 체결가: BUY 가격
            int executedPrice = buy.getPricePerKwh();

            EnergyTrade trade = new EnergyTrade();
            trade.setBuyOrderId(buy.getId());
            trade.setSellOrderId(newOrder.getId());
            trade.setPricePerKwh(executedPrice);

            // ✅ EnergyTrade.amountKwh도 BigDecimal이어야 함
            trade.setAmountKwh(amount);

            trade.setStatus("MATCHED");
            energyTradeRepository.save(trade);
        }
    }

    /**
     * ✅ reserve: BUY 주문 생성 시 locked_krw 증가 (buyPrice 기준)
     */
    private void reserveMoneyForBuyOrder(EnergyOrder order) {
        Long buyerId = order.getUserId();

        BigDecimal need = calcNeedMoneyByPrice(order.getPricePerKwh(), order.getAmountKwh());

        UserWallet wallet = userWalletRepository.findByUserIdLocked(buyerId)
                .orElseGet(() -> userWalletRepository.save(new UserWallet(buyerId)));

        BigDecimal available = wallet.getTotalKrw().subtract(wallet.getLockedKrw());
        if (available.compareTo(need) < 0) {
            throw new IllegalStateException("잔고 부족: 필요 " + need + "원, 사용가능 " + available + "원");
        }

        wallet.setLockedKrw(wallet.getLockedKrw().add(need));
        userWalletRepository.save(wallet);
    }

    /**
     * ✅ release: BUY 주문 취소 시 locked_krw 감소
     */
    private void releaseMoneyForBuyOrder(EnergyOrder order) {
        Long buyerId = order.getUserId();

        BigDecimal need = calcNeedMoneyByPrice(order.getPricePerKwh(), order.getAmountKwh());

        UserWallet wallet = userWalletRepository.findByUserIdLocked(buyerId)
                .orElseThrow(() -> new IllegalStateException("지갑이 없음"));

        BigDecimal nextLocked = wallet.getLockedKrw().subtract(need);
        if (nextLocked.signum() < 0) nextLocked = BigDecimal.ZERO;

        wallet.setLockedKrw(nextLocked);
        userWalletRepository.save(wallet);
    }

    /**
     * ✅ (3) 매칭 후 차액 해제
     */
    private void unlockBuyerExtraLock(EnergyOrder buyOrder, int executedPricePerKwh) {
        Long buyerId = buyOrder.getUserId();

        BigDecimal lockedByBuyPrice = calcNeedMoneyByPrice(
                buyOrder.getPricePerKwh(),
                buyOrder.getAmountKwh()
        );

        BigDecimal executedNeed = calcNeedMoneyByPrice(
                executedPricePerKwh,
                buyOrder.getAmountKwh()
        );

        BigDecimal extra = lockedByBuyPrice.subtract(executedNeed);
        if (extra.signum() <= 0) return;

        UserWallet wallet = userWalletRepository.findByUserIdLocked(buyerId)
                .orElseThrow(() -> new IllegalStateException("지갑이 없음"));

        BigDecimal nextLocked = wallet.getLockedKrw().subtract(extra);
        if (nextLocked.signum() < 0) nextLocked = BigDecimal.ZERO;

        wallet.setLockedKrw(nextLocked);
        userWalletRepository.save(wallet);
    }

    // ✅ 금액 계산: pricePerKwh(int) * amountKwh(BigDecimal)
    private BigDecimal calcNeedMoneyByPrice(int pricePerKwh, BigDecimal amountKwh) {
        BigDecimal p = BigDecimal.valueOf(pricePerKwh);
        return p.multiply(amountKwh).setScale(2, RoundingMode.HALF_UP);
    }
}
