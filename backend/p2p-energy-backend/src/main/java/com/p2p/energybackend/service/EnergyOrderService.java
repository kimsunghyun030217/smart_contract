package com.p2p.energybackend.service;

import com.p2p.energybackend.model.EnergyOrder;
import com.p2p.energybackend.model.EnergyTrade;
import com.p2p.energybackend.model.User;
import com.p2p.energybackend.model.UserEnergyWallet;
import com.p2p.energybackend.model.UserWallet;
import com.p2p.energybackend.repository.EnergyOrderRepository;
import com.p2p.energybackend.repository.EnergyTradeRepository;
import com.p2p.energybackend.repository.UserEnergyWalletRepository;
import com.p2p.energybackend.repository.UserRepository;
import com.p2p.energybackend.repository.UserWalletRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Service
public class EnergyOrderService {

    private final EnergyOrderRepository energyOrderRepository;
    private final EnergyTradeRepository energyTradeRepository;
    private final UserWalletRepository userWalletRepository;
    private final UserEnergyWalletRepository userEnergyWalletRepository;
    private final UserRepository userRepository;

    private final AtomicBoolean matchingRunning = new AtomicBoolean(false);

    // ---- 정책 파라미터 ----
    private static final double DIST_MAX_KM = 10.0;
    private static final int POOL_SIZE = 500;

    // ✅ “상위 후보만 잠깐 락” 잡는 수 (A’ 방식)
    private static final int LOCK_TOP_K = 10;

    // ✅ 최소 겹침(분) (매칭 필터)
    private static final int MIN_OVERLAP_MINUTES = 10;

    // ✅ SELL은 +10%까지 허용 (sellAmount in [X, 1.1X])
    private static final BigDecimal SELL_OVERFILL_RATIO = new BigDecimal("1.10");

    // ✅ LocalDateTime comparator 고정
    private static final Comparator<LocalDateTime> CREATED_AT_ASC =
            Comparator.nullsLast(LocalDateTime::compareTo);

    // =========================================================
    // ✅ [추가] kW=7 기준 최소 endTime 강제(시간 너무 짧은 주문 차단)
    // =========================================================
    private static final BigDecimal ASSUMED_POWER_KW = new BigDecimal("7.0"); // 일단 7kW 고정
    private static final int DELIVERY_BUFFER_MINUTES = 10;                   // 여유 버퍼
    private static final int TIME_STEP_MINUTES = 5;                          // UI가 5분 단위

    public EnergyOrderService(EnergyOrderRepository energyOrderRepository,
                              EnergyTradeRepository energyTradeRepository,
                              UserWalletRepository userWalletRepository,
                              UserEnergyWalletRepository userEnergyWalletRepository,
                              UserRepository userRepository) {
        this.energyOrderRepository = energyOrderRepository;
        this.energyTradeRepository = energyTradeRepository;
        this.userWalletRepository = userWalletRepository;
        this.userEnergyWalletRepository = userEnergyWalletRepository;
        this.userRepository = userRepository;
    }

    // =========================================================
    // ✅ [추가] Controller/프론트가 "최소 종료시간"을 조회할 수 있게 공개
    // =========================================================
    public LocalDateTime getMinEndTime(LocalDateTime startTime, BigDecimal amountKwh) {
        return calcMinEndTime(startTime, amountKwh);
    }

    // ✅ 매칭 엔진 주기 (BUY만 돌림)
    @Scheduled(fixedDelay = 10000)
    public void runMatchingEngine() {
        if (!matchingRunning.compareAndSet(false, true)) return;
        try {
            runMatchingEngineTx();
        } finally {
            matchingRunning.set(false);
        }
    }

    // ---------------------------------------
    // (0) 매칭 엔진 루프 + 만료 처리 (BUY만)
    // ---------------------------------------
    @Transactional
    protected void runMatchingEngineTx() {
        List<Long> activeBuyIds = energyOrderRepository.findAllActiveBuyOrderIdsForMatching();
        for (Long id : activeBuyIds) {
            matchOneById(id);
        }
    }

    private void matchOneById(Long orderId) {
        EnergyOrder order = energyOrderRepository.findById(orderId).orElse(null);
        if (order == null) return;

        if (!"ACTIVE".equalsIgnoreCase(order.getStatus())) return;

        // ✅ BUY-only 안전장치
        if (!"buy".equalsIgnoreCase(order.getOrderType())) return;

        // ✅ 만료면 EXPIRED 처리 + 잠금 해제
        if (order.getEndTime() == null || !order.getEndTime().isAfter(LocalDateTime.now())) {
            expireOrder(order);
            return;
        }

        tryMatchOne(order);
    }

    @Transactional
    protected void expireOrder(EnergyOrder order) {
        if (!"ACTIVE".equalsIgnoreCase(order.getStatus())) return;

        order.setStatus("EXPIRED");
        energyOrderRepository.save(order);

        // 잠금 해제
        if ("buy".equalsIgnoreCase(order.getOrderType())) {
            releaseMoneyForBuyOrder(order);
        } else if ("sell".equalsIgnoreCase(order.getOrderType())) {
            releaseEnergyForSellOrder(order);
        }
    }

    // ---------------------------------------
    // (1) 주문 생성: BUY=현금잠금 / SELL=전력잠금
    // ---------------------------------------
    @Transactional
    public EnergyOrder createOrder(EnergyOrder order) {

        if (order.getOrderType() == null || order.getOrderType().isBlank()) {
            throw new IllegalArgumentException("orderType 필요 (buy/sell)");
        }
        order.setOrderType(order.getOrderType().toLowerCase());

        if (order.getStatus() == null || order.getStatus().isBlank()) {
            order.setStatus("ACTIVE");
        }
        order.setStatus(order.getStatus().toUpperCase());

        if (order.getAmountKwh() == null) {
            throw new IllegalArgumentException("amountKwh 필요");
        }
        order.setAmountKwh(order.getAmountKwh().setScale(3, RoundingMode.HALF_UP));

        if (order.getStartTime() == null || order.getEndTime() == null) {
            throw new IllegalArgumentException("startTime/endTime 필요");
        }
        if (!order.getEndTime().isAfter(order.getStartTime())) {
            throw new IllegalArgumentException("endTime은 startTime보다 뒤여야 함");
        }
        if (!order.getEndTime().isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("endTime은 현재보다 뒤여야 함");
        }

        // =========================================================
        // ✅ [추가] kW=7 기준 최소 endTime 강제
        // =========================================================
        LocalDateTime minEnd = calcMinEndTime(order.getStartTime(), order.getAmountKwh());
        if (minEnd != null && order.getEndTime().isBefore(minEnd)) {
            throw new IllegalArgumentException(
                    "endTime이 너무 짧음. 최소 종료시간: " + minEnd
                            + " (기준 " + ASSUMED_POWER_KW + "kW, 버퍼 " + DELIVERY_BUFFER_MINUTES + "분)"
            );
        }

        // ✅ BUY: 가중치 기본 + 정규화 + 현금잠금
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

            reserveMoneyForBuyOrder(order);
        }

        // ✅ SELL: 전력 잠금
        if ("sell".equalsIgnoreCase(order.getOrderType())) {
            reserveEnergyForSellOrder(order);
        }

        EnergyOrder saved = energyOrderRepository.save(order);

        // ✅ BUY-only: 저장 직후 매칭 1회 시도는 BUY만
        if ("buy".equalsIgnoreCase(saved.getOrderType())) {
            tryMatchOne(saved);
        }

        return saved;
    }

    // ---------------------------------------
    // (2) 단일 결정 로직 (BUY-only)
    // ---------------------------------------
    private void tryMatchOne(EnergyOrder triggerOrder) {
        if (!"ACTIVE".equalsIgnoreCase(triggerOrder.getStatus())) return;

        // ✅ BUY-only
        if (!"buy".equalsIgnoreCase(triggerOrder.getOrderType())) return;

        User buyer = userRepository.findById(triggerOrder.getUserId()).orElse(null);
        if (buyer == null) return;

        List<EnergyOrder> sellCandidates = buildSellCandidatesForBuy(triggerOrder);
        if (sellCandidates.isEmpty()) return;

        EnergyOrder bestSell = pickBestSellForBuy_WithTopKLock(triggerOrder, buyer, sellCandidates);
        if (bestSell == null) return;

        executeMatchWithConditionalUpdates(triggerOrder, bestSell);
    }

    // ---------------------------------------
    // (3) 후보군 구성: Repo에서 필터링된 SELL pool
    // ---------------------------------------
    private List<EnergyOrder> buildSellCandidatesForBuy(EnergyOrder buyOrder) {

        int buyPrice = buyOrder.getPricePerKwh();
        Long buyerId = buyOrder.getUserId();

        BigDecimal buyAmount = buyOrder.getAmountKwh();
        BigDecimal minAmount = buyAmount; // X
        BigDecimal maxAmount = buyAmount.multiply(SELL_OVERFILL_RATIO).setScale(3, RoundingMode.HALF_UP); // X*1.10

        LocalDateTime buyStart = buyOrder.getStartTime();
        LocalDateTime buyEnd = buyOrder.getEndTime();

        List<EnergyOrder> pool = energyOrderRepository.findSellCandidatesForBuyPool(
                buyPrice,
                buyerId,
                minAmount,
                maxAmount,
                buyStart,
                buyEnd,
                MIN_OVERLAP_MINUTES,
                PageRequest.of(0, POOL_SIZE)
        );

        if (pool == null || pool.isEmpty()) return List.of();
        return pool;
    }

    // ---------------------------------------
    // (4) 점수/선택 + “상위K만 잠깐 락”
    // ---------------------------------------
    private double scoreBuyPref(EnergyOrder buy, User buyer, EnergyOrder sell, User seller,
                                int minSlack, int maxSlack) {

        double wP = buy.getWeightPrice() != null ? buy.getWeightPrice() : 0.6;
        double wD = buy.getWeightDistance() != null ? buy.getWeightDistance() : 0.3;
        double wT = buy.getWeightTrust() != null ? buy.getWeightTrust() : 0.1;

        double sum = wP + wD + wT;
        if (sum > 0 && Math.abs(sum - 1.0) > 0.0001) {
            wP /= sum; wD /= sum; wT /= sum;
        }

        int slack = buy.getPricePerKwh() - sell.getPricePerKwh(); // >=0
        double priceScore = normalizeHigherIsBetter(slack, minSlack, maxSlack);

        double distScore = distanceScoreKm(
                buyer.getLatitude(), buyer.getLongitude(),
                seller.getLatitude(), seller.getLongitude(),
                DIST_MAX_KM
        );

        double trustScore = normalizeTrust(seller.getTrustScore());

        return wP * priceScore + wD * distScore + wT * trustScore;
    }

    private EnergyOrder pickBestSellForBuy_WithTopKLock(EnergyOrder buy, User buyer, List<EnergyOrder> sells) {
        if (sells.isEmpty()) return null;

        Set<Long> sellerIds = sells.stream().map(EnergyOrder::getUserId).collect(Collectors.toSet());
        Map<Long, User> sellerMap = userRepository.findAllById(sellerIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        int minSlack = Integer.MAX_VALUE;
        int maxSlack = Integer.MIN_VALUE;
        for (EnergyOrder sell : sells) {
            int slack = buy.getPricePerKwh() - sell.getPricePerKwh();
            minSlack = Math.min(minSlack, slack);
            maxSlack = Math.max(maxSlack, slack);
        }
        if (minSlack == Integer.MAX_VALUE) minSlack = 0;
        if (maxSlack == Integer.MIN_VALUE) maxSlack = 0;

        List<ScoredOrder> ranked = new ArrayList<>();
        for (EnergyOrder sell : sells) {
            User seller = sellerMap.get(sell.getUserId());
            if (seller == null) continue;
            double score = scoreBuyPref(buy, buyer, sell, seller, minSlack, maxSlack);
            ranked.add(new ScoredOrder(sell.getId(), score));
        }

        ranked.sort((a, b) -> Double.compare(b.score, a.score));
        List<Long> topIds = ranked.stream()
                .limit(LOCK_TOP_K)
                .map(x -> x.orderId)
                .toList();

        if (topIds.isEmpty()) return null;

        List<EnergyOrder> locked = energyOrderRepository.lockActiveOrdersByIdsSkipLocked(topIds);
        if (locked == null || locked.isEmpty()) return null;

        EnergyOrder best = null;
        double bestScore = -1;

        for (EnergyOrder sell : locked) {
            User seller = sellerMap.get(sell.getUserId());
            if (seller == null) continue;

            double score = scoreBuyPref(buy, buyer, sell, seller, minSlack, maxSlack);

            if (score > bestScore + 1e-9) {
                bestScore = score;
                best = sell;
            } else if (Math.abs(score - bestScore) <= 1e-9 && best != null) {
                if (sell.getPricePerKwh() < best.getPricePerKwh()) best = sell;
                else if (sell.getPricePerKwh().equals(best.getPricePerKwh())
                        && sell.getCreatedAt() != null && best.getCreatedAt() != null
                        && sell.getCreatedAt().isBefore(best.getCreatedAt())) {
                    best = sell;
                }
            }
        }

        return best;
    }

    private static class ScoredOrder {
        final Long orderId;
        final double score;
        ScoredOrder(Long orderId, double score) {
            this.orderId = orderId;
            this.score = score;
        }
    }

    // ---------------------------------------
    // (5) 매칭 실행: “조건부 UPDATE로 선점” + trade 생성 + 잠금 정산
    // ---------------------------------------
    @Transactional
    protected void executeMatchWithConditionalUpdates(EnergyOrder buyOrder, EnergyOrder sellOrder) {

        if (!"ACTIVE".equalsIgnoreCase(buyOrder.getStatus())) return;
        if (!"ACTIVE".equalsIgnoreCase(sellOrder.getStatus())) return;

        LocalDateTime deliveryStart = maxTime(buyOrder.getStartTime(), sellOrder.getStartTime());
        LocalDateTime deliveryEnd = minTime(buyOrder.getEndTime(), sellOrder.getEndTime());
        if (deliveryStart == null || deliveryEnd == null) return;

        long overlapMin = Duration.between(deliveryStart, deliveryEnd).toMinutes();
        if (overlapMin < MIN_OVERLAP_MINUTES) return;

        BigDecimal executedAmount = buyOrder.getAmountKwh();
        int executedPrice = sellOrder.getPricePerKwh();

        int buyOk = energyOrderRepository.updateStatusIfMatch(
                buyOrder.getId(), "ACTIVE", "MATCHED"
        );
        if (buyOk != 1) return;

        int sellOk = energyOrderRepository.updateStatusIfMatch(
                sellOrder.getId(), "ACTIVE", "MATCHED"
        );
        if (sellOk != 1) {
            energyOrderRepository.updateStatusIfMatch(
                    buyOrder.getId(), "MATCHED", "ACTIVE"
            );
            return;
        }

        EnergyTrade trade = new EnergyTrade();
        trade.setBuyOrderId(buyOrder.getId());
        trade.setSellOrderId(sellOrder.getId());
        trade.setPricePerKwh(executedPrice);
        trade.setAmountKwh(executedAmount);
        trade.setStatus("MATCHED");
        trade.setDeliveryStart(deliveryStart);
        trade.setDeliveryEnd(deliveryEnd);
        energyTradeRepository.save(trade);

        unlockBuyerExtraLock(buyOrder, executedPrice, executedAmount);
        unlockSellerExtraEnergy(sellOrder, executedAmount);

        buyOrder.setStatus("MATCHED");
        sellOrder.setStatus("MATCHED");
    }

    private LocalDateTime maxTime(LocalDateTime a, LocalDateTime b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.isAfter(b) ? a : b;
    }

    private LocalDateTime minTime(LocalDateTime a, LocalDateTime b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.isBefore(b) ? a : b;
    }

    // =========================================================
    // ✅ 최소 종료시간 계산 (kWh / kW * 60 + buffer, step으로 올림)
    // =========================================================
    private LocalDateTime calcMinEndTime(LocalDateTime startTime, BigDecimal amountKwh) {
        if (startTime == null || amountKwh == null) return null;

        BigDecimal minutes = amountKwh
                .divide(ASSUMED_POWER_KW, 10, RoundingMode.CEILING)
                .multiply(new BigDecimal("60"));

        long requiredMin = minutes.setScale(0, RoundingMode.CEILING).longValue();
        long minTotal = requiredMin + DELIVERY_BUFFER_MINUTES;

        if (TIME_STEP_MINUTES > 1) {
            long rem = minTotal % TIME_STEP_MINUTES;
            if (rem != 0) minTotal += (TIME_STEP_MINUTES - rem);
        }

        return startTime.plusMinutes(minTotal);
    }

    // ---------------------------------------
    // 거리/정규화 헬퍼
    // ---------------------------------------
    private double normalizeHigherIsBetter(int value, int min, int max) {
        if (max <= min) return 1.0;
        return (double) (value - min) / (double) (max - min);
    }

    private double normalizeTrust(int trustScore) {
        double t = trustScore / 100.0;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        return t;
    }

    private double distanceScoreKm(Double lat1, Double lon1, Double lat2, Double lon2, double dMaxKm) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0.0;
        double dist = haversineKm(lat1, lon1, lat2, lon2);
        double clipped = Math.min(dist, dMaxKm);
        return 1.0 - (clipped / dMaxKm);
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // ---------------------------------------
    // 지갑/잠금 로직 (BUY: 돈 / SELL: 전력)
    // ---------------------------------------
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

    private void unlockBuyerExtraLock(EnergyOrder buyOrder, int executedPricePerKwh, BigDecimal executedAmount) {
        Long buyerId = buyOrder.getUserId();

        BigDecimal lockedByBuyPrice = calcNeedMoneyByPrice(buyOrder.getPricePerKwh(), executedAmount);
        BigDecimal executedNeed = calcNeedMoneyByPrice(executedPricePerKwh, executedAmount);

        BigDecimal extra = lockedByBuyPrice.subtract(executedNeed);
        if (extra.signum() <= 0) return;

        UserWallet wallet = userWalletRepository.findByUserIdLocked(buyerId)
                .orElseThrow(() -> new IllegalStateException("지갑이 없음"));

        BigDecimal nextLocked = wallet.getLockedKrw().subtract(extra);
        if (nextLocked.signum() < 0) nextLocked = BigDecimal.ZERO;

        wallet.setLockedKrw(nextLocked);
        userWalletRepository.save(wallet);
    }

    private void reserveEnergyForSellOrder(EnergyOrder order) {
        Long sellerId = order.getUserId();
        BigDecimal needKwh = order.getAmountKwh();

        UserEnergyWallet w = userEnergyWalletRepository.findByUserIdLocked(sellerId)
                .orElseGet(() -> userEnergyWalletRepository.save(new UserEnergyWallet(sellerId)));

        BigDecimal available = w.getTotalKwh().subtract(w.getLockedKwh());
        if (available.compareTo(needKwh) < 0) {
            throw new IllegalStateException("전력 부족: 필요 " + needKwh + "kWh, 사용가능 " + available + "kWh");
        }

        w.setLockedKwh(w.getLockedKwh().add(needKwh));
        userEnergyWalletRepository.save(w);
    }

    private void releaseEnergyForSellOrder(EnergyOrder order) {
        Long sellerId = order.getUserId();
        BigDecimal needKwh = order.getAmountKwh();

        UserEnergyWallet w = userEnergyWalletRepository.findByUserIdLocked(sellerId)
                .orElseThrow(() -> new IllegalStateException("에너지 지갑이 없음"));

        BigDecimal nextLocked = w.getLockedKwh().subtract(needKwh);
        if (nextLocked.signum() < 0) nextLocked = BigDecimal.ZERO;

        w.setLockedKwh(nextLocked);
        userEnergyWalletRepository.save(w);
    }

    private void unlockSellerExtraEnergy(EnergyOrder sellOrder, BigDecimal executedAmount) {
        BigDecimal sellAmount = sellOrder.getAmountKwh();
        BigDecimal extra = sellAmount.subtract(executedAmount);
        if (extra.signum() <= 0) return;

        Long sellerId = sellOrder.getUserId();
        UserEnergyWallet w = userEnergyWalletRepository.findByUserIdLocked(sellerId)
                .orElseThrow(() -> new IllegalStateException("에너지 지갑이 없음"));

        BigDecimal nextLocked = w.getLockedKwh().subtract(extra);
        if (nextLocked.signum() < 0) nextLocked = BigDecimal.ZERO;

        w.setLockedKwh(nextLocked);
        userEnergyWalletRepository.save(w);
    }

    private BigDecimal calcNeedMoneyByPrice(int pricePerKwh, BigDecimal amountKwh) {
        BigDecimal p = BigDecimal.valueOf(pricePerKwh);
        return p.multiply(amountKwh).setScale(2, RoundingMode.HALF_UP);
    }

    // ---------------------------------------
    // 컨트롤러용
    // ---------------------------------------
    public List<EnergyOrder> getMyOrdersInProgress(Long userId) {
        return energyOrderRepository.findByUserIdAndStatusNotOrderByCreatedAtDesc(userId, "COMPLETED");
    }

    public List<EnergyOrder> getMyCompletedOrders(Long userId) {
        return energyOrderRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, "COMPLETED");
    }

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

        if ("buy".equalsIgnoreCase(order.getOrderType())) {
            releaseMoneyForBuyOrder(order);
        } else if ("sell".equalsIgnoreCase(order.getOrderType())) {
            releaseEnergyForSellOrder(order);
        }

        energyOrderRepository.deleteById(orderId);
    }
}
