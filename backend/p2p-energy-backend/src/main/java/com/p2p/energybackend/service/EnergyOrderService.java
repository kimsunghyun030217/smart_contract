package com.p2p.energybackend.service;

import com.p2p.energybackend.model.EnergyOrder;
import com.p2p.energybackend.model.EnergyTrade;
import com.p2p.energybackend.model.User;
import com.p2p.energybackend.model.UserWallet;
import com.p2p.energybackend.repository.EnergyOrderRepository;
import com.p2p.energybackend.repository.EnergyTradeRepository;
import com.p2p.energybackend.repository.UserRepository;
import com.p2p.energybackend.repository.UserWalletRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class EnergyOrderService {

    private final EnergyOrderRepository energyOrderRepository;
    private final EnergyTradeRepository energyTradeRepository;
    private final UserWalletRepository userWalletRepository;
    private final UserRepository userRepository;

    // 스케줄러 중복 실행 방지
    private final AtomicBoolean matchingRunning = new AtomicBoolean(false);

    // 거리 점수 컷오프(10km)
    private static final double DIST_MAX_KM = 10.0;

    public EnergyOrderService(EnergyOrderRepository energyOrderRepository,
                              EnergyTradeRepository energyTradeRepository,
                              UserWalletRepository userWalletRepository,
                              UserRepository userRepository) {
        this.energyOrderRepository = energyOrderRepository;
        this.energyTradeRepository = energyTradeRepository;
        this.userWalletRepository = userWalletRepository;
        this.userRepository = userRepository;
    }

    // ✅ 5초마다 ACTIVE 전체 훑고 매칭 시도
    @Scheduled(fixedDelay = 5000)
    public void runMatchingEngine() {
        if (!matchingRunning.compareAndSet(false, true)) return;

        try {
            runMatchingEngineTx();
        } finally {
            matchingRunning.set(false);
        }
    }

    @Transactional
    protected void runMatchingEngineTx() {
        List<Long> activeIds = energyOrderRepository.findAllActiveOrderIdsForMatching();
        for (Long id : activeIds) {
            matchOneById(id);
        }
    }

    private void matchOneById(Long orderId) {
        EnergyOrder order = energyOrderRepository.findById(orderId).orElse(null);
        if (order == null) return;

        if (!"ACTIVE".equalsIgnoreCase(order.getStatus())) return;
        if (order.getEndTime() == null || !order.getEndTime().isAfter(LocalDateTime.now())) return;

        tryMatchOne(order);
    }

    // ✅ 주문 저장 + (BUY면 reserve 잠금) + 저장 직후 매칭 시도
    @Transactional
    public EnergyOrder createOrder(EnergyOrder order) {

        // orderType / status 통일
        if (order.getOrderType() == null || order.getOrderType().isBlank()) {
            throw new IllegalArgumentException("orderType 필요 (buy/sell)");
        }
        order.setOrderType(order.getOrderType().toLowerCase());

        if (order.getStatus() == null || order.getStatus().isBlank()) {
            order.setStatus("ACTIVE");
        }
        order.setStatus(order.getStatus().toUpperCase());

        // amountKwh scale(3) 통일
        if (order.getAmountKwh() == null) {
            throw new IllegalArgumentException("amountKwh 필요");
        }
        order.setAmountKwh(order.getAmountKwh().setScale(3, RoundingMode.HALF_UP));

        // BUY일 때만 가중치 세팅 + 정규화
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

        // BUY면 reserve 잠금
        if ("buy".equalsIgnoreCase(order.getOrderType())) {
            reserveMoneyForBuyOrder(order);
        }

        EnergyOrder saved = energyOrderRepository.save(order);

        // 저장 직후 매칭 1회 시도
        tryMatchOne(saved);

        return saved;
    }

    /**
     * ✅ 매칭: 후보 Top10 → 점수 계산 → best 1개 선택
     * (부분체결 X, amountKwh 동일 조건 유지)
     */
    private void tryMatchOne(EnergyOrder newOrder) {

        if (!"ACTIVE".equalsIgnoreCase(newOrder.getStatus())) return;

        String type = newOrder.getOrderType();
        int myPrice = newOrder.getPricePerKwh();
        BigDecimal amount = newOrder.getAmountKwh();
        Long myUserId = newOrder.getUserId();

        User me = userRepository.findById(myUserId).orElse(null);
        if (me == null) return;

        // BUY → SELL 후보 Top10
        if ("buy".equalsIgnoreCase(type)) {

            List<EnergyOrder> candidates = energyOrderRepository.findSellMatchesForBuyLocked(
                    myPrice, amount, myUserId, PageRequest.of(0, 10)
            );
            if (candidates.isEmpty()) return;

            EnergyOrder bestSell = pickBestSellByWeights(newOrder, me, candidates);
            if (bestSell == null) return;

            // 상태 업데이트
            newOrder.setStatus("MATCHED");
            bestSell.setStatus("MATCHED");
            energyOrderRepository.save(newOrder);
            energyOrderRepository.save(bestSell);

            // 체결가: SELL 가격
            int executedPrice = bestSell.getPricePerKwh();

            // trade 생성
            EnergyTrade trade = new EnergyTrade();
            trade.setBuyOrderId(newOrder.getId());
            trade.setSellOrderId(bestSell.getId());
            trade.setPricePerKwh(executedPrice);
            trade.setAmountKwh(amount);
            trade.setStatus("MATCHED");
            energyTradeRepository.save(trade);

            // buyPrice로 잠갔는데 executedPrice가 더 싸면 차액 unlock
            unlockBuyerExtraLock(newOrder, executedPrice);
            return;
        }

        // SELL → BUY 후보 Top10
        if ("sell".equalsIgnoreCase(type)) {

            List<EnergyOrder> candidates = energyOrderRepository.findBuyMatchesForSellLocked(
                    myPrice, amount, myUserId, PageRequest.of(0, 10)
            );
            if (candidates.isEmpty()) return;

            // ⚠️ 여기서 "me"는 판매자(User)라서 seller로 넘겨야 함
            EnergyOrder bestBuy = pickBestBuyByWeights(newOrder, me, candidates);
            if (bestBuy == null) return;

            newOrder.setStatus("MATCHED");
            bestBuy.setStatus("MATCHED");
            energyOrderRepository.save(newOrder);
            energyOrderRepository.save(bestBuy);

            // ✅ 체결가: SELL 가격(일관성 + buyer-friendly)
            int executedPrice = newOrder.getPricePerKwh();

            EnergyTrade trade = new EnergyTrade();
            trade.setBuyOrderId(bestBuy.getId());
            trade.setSellOrderId(newOrder.getId());
            trade.setPricePerKwh(executedPrice);
            trade.setAmountKwh(amount);
            trade.setStatus("MATCHED");
            energyTradeRepository.save(trade);

            // BUY는 buyPrice로 잠겨 있으니, sellPrice로 체결되면 차액 unlock
            unlockBuyerExtraLock(bestBuy, executedPrice);
        }
    }

    // ------------------ 가중치 기반 best 선택 ------------------

    private EnergyOrder pickBestSellByWeights(EnergyOrder buyOrder, User buyer, List<EnergyOrder> sells) {

        int minP = sells.stream().mapToInt(EnergyOrder::getPricePerKwh).min().orElse(buyOrder.getPricePerKwh());
        int maxP = sells.stream().mapToInt(EnergyOrder::getPricePerKwh).max().orElse(buyOrder.getPricePerKwh());

        double bestScore = -1;
        EnergyOrder best = null;

        for (EnergyOrder sell : sells) {
            User seller = userRepository.findById(sell.getUserId()).orElse(null);
            if (seller == null) continue;

            double priceScore = normalizeLowerIsBetter(sell.getPricePerKwh(), minP, maxP);
            double distScore = distanceScoreKm(
                    buyer.getLatitude(), buyer.getLongitude(),
                    seller.getLatitude(), seller.getLongitude(),
                    DIST_MAX_KM
            );
            double trustScore = normalizeTrust(seller.getTrustScore());

            double score =
                    buyOrder.getWeightPrice() * priceScore
                            + buyOrder.getWeightDistance() * distScore
                            + buyOrder.getWeightTrust() * trustScore;

            if (score > bestScore + 1e-9) {
                bestScore = score;
                best = sell;
            } else if (Math.abs(score - bestScore) <= 1e-9 && best != null) {
                // tie-break: 싼 가격 → 빠른 생성
                if (sell.getPricePerKwh() < best.getPricePerKwh()) best = sell;
                else if (sell.getPricePerKwh() == best.getPricePerKwh()
                        && sell.getCreatedAt() != null && best.getCreatedAt() != null
                        && sell.getCreatedAt().isBefore(best.getCreatedAt())) {
                    best = sell;
                }
            }
        }
        return best;
    }

    private EnergyOrder pickBestBuyByWeights(EnergyOrder sellOrder, User seller, List<EnergyOrder> buys) {

        double bestScore = -1;
        EnergyOrder best = null;

        for (EnergyOrder buy : buys) {
            User buyer = userRepository.findById(buy.getUserId()).orElse(null);
            if (buyer == null) continue;

            double distScore = distanceScoreKm(
                    buyer.getLatitude(), buyer.getLongitude(),
                    seller.getLatitude(), seller.getLongitude(),
                    DIST_MAX_KM
            );
            double trustScore = normalizeTrust(seller.getTrustScore());

            double wP = buy.getWeightPrice() != null ? buy.getWeightPrice() : 0.6;
            double wD = buy.getWeightDistance() != null ? buy.getWeightDistance() : 0.3;
            double wT = buy.getWeightTrust() != null ? buy.getWeightTrust() : 0.1;

            double sum = wP + wD + wT;
            if (sum > 0 && Math.abs(sum - 1.0) > 0.0001) {
                wP /= sum; wD /= sum; wT /= sum;
            }

            // sellOrder 가격은 고정이라 priceScore는 상수(1.0)로 처리
            double score = wP * 1.0 + wD * distScore + wT * trustScore;

            if (score > bestScore + 1e-9) {
                bestScore = score;
                best = buy;
            } else if (Math.abs(score - bestScore) <= 1e-9 && best != null) {
                // tie-break: 먼저 들어온 BUY 우선
                if (buy.getCreatedAt() != null && best.getCreatedAt() != null
                        && buy.getCreatedAt().isBefore(best.getCreatedAt())) {
                    best = buy;
                }
            }
        }
        return best;
    }

    // ------------------ 점수 헬퍼 ------------------

    private double normalizeLowerIsBetter(int value, int min, int max) {
        if (max <= min) return 1.0;
        return (double) (max - value) / (double) (max - min);
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

    // ------------------ 지갑/잠금 로직 ------------------

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

    // ✅ cancelOrder에서 필요함
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

    private BigDecimal calcNeedMoneyByPrice(int pricePerKwh, BigDecimal amountKwh) {
        BigDecimal p = BigDecimal.valueOf(pricePerKwh);
        return p.multiply(amountKwh).setScale(2, RoundingMode.HALF_UP);
    }

    // ------------------ ✅ 컨트롤러가 쓰는 메서드 3개(필수) ------------------

    // 진행중 주문(완료 제외)
    public List<EnergyOrder> getMyOrdersInProgress(Long userId) {
        return energyOrderRepository.findByUserIdAndStatusNotOrderByCreatedAtDesc(userId, "COMPLETED");
    }

    // 완료 주문(COMPLETED만)
    public List<EnergyOrder> getMyCompletedOrders(Long userId) {
        return energyOrderRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, "COMPLETED");
    }

    // 주문 취소(삭제): ACTIVE인 내 주문만 가능
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

        // BUY 주문이면 잠금 해제
        if ("buy".equalsIgnoreCase(order.getOrderType())) {
            releaseMoneyForBuyOrder(order);
        }

        energyOrderRepository.deleteById(orderId);
    }
}
