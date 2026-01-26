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
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Service
public class EnergyOrderService {

    private final EnergyOrderRepository energyOrderRepository;
    private final EnergyTradeRepository energyTradeRepository;
    private final UserWalletRepository userWalletRepository;
    private final UserRepository userRepository;

    private final AtomicBoolean matchingRunning = new AtomicBoolean(false);

    private static final double DIST_MAX_KM = 10.0;
    private static final int POOL_SIZE = 500;
    private static final int TOP_N = 100;

    // ✅ LocalDateTime comparator를 명시적으로 고정 (컴파일 에러 해결 핵심)
    private static final Comparator<LocalDateTime> CREATED_AT_ASC =
            Comparator.nullsLast(LocalDateTime::compareTo);

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

        // ✅ BUY일 때만 가중치 세팅 + 정규화
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

        EnergyOrder saved = energyOrderRepository.save(order);

        // 저장 직후 매칭 1회 시도
        tryMatchOne(saved);

        return saved;
    }

    /**
     * ✅ "단일 결정 로직" 핵심:
     * - BUY가 들어오면: (이 BUY가) 가장 선호하는 SELL 1개 선택
     * - SELL이 들어오면: (이 SELL을) 가장 선호하는 BUY 1개 선택
     * 둘 다 "BUY 가중치 기반 scoreBuyPref()" 하나로만 결정한다.
     */
    private void tryMatchOne(EnergyOrder triggerOrder) {
        if (!"ACTIVE".equalsIgnoreCase(triggerOrder.getStatus())) return;

        if ("buy".equalsIgnoreCase(triggerOrder.getOrderType())) {
            // BUY 트리거: buy가 best sell을 고른다
            User buyer = userRepository.findById(triggerOrder.getUserId()).orElse(null);
            if (buyer == null) return;

            List<EnergyOrder> sellCandidates = buildSellCandidatesForBuy(triggerOrder, buyer);
            if (sellCandidates.isEmpty()) return;

            EnergyOrder bestSell = pickBestSellForBuy(triggerOrder, buyer, sellCandidates);
            if (bestSell == null) return;

            executeMatch(triggerOrder, bestSell);
            return;
        }

        if ("sell".equalsIgnoreCase(triggerOrder.getOrderType())) {
            // SELL 트리거: 이 sell을 "가장 좋아하는 buy"를 고른다 (BUY 가중치 점수로만)
            User seller = userRepository.findById(triggerOrder.getUserId()).orElse(null);
            if (seller == null) return;

            List<EnergyOrder> buyCandidates = buildBuyCandidatesForSell(triggerOrder, seller);
            if (buyCandidates.isEmpty()) return;

            EnergyOrder bestBuy = pickBestBuyForThisSell(triggerOrder, seller, buyCandidates);
            if (bestBuy == null) return;

            executeMatch(bestBuy, triggerOrder);
        }
    }

    // ------------------ (1) 후보군 구성 ------------------

    /**
     * BUY 기준 SELL 후보:
     * pool(500) → 가격Top100 + 거리Top100 + 신뢰Top100 → union(dedup)
     */
    private List<EnergyOrder> buildSellCandidatesForBuy(EnergyOrder buyOrder, User buyer) {

        int buyPrice = buyOrder.getPricePerKwh();
        BigDecimal amount = buyOrder.getAmountKwh();
        Long buyerId = buyOrder.getUserId();

        List<EnergyOrder> pool = energyOrderRepository.findSellCandidatesForBuyLocked(
                buyPrice, amount, buyerId, PageRequest.of(0, POOL_SIZE)
        );
        if (pool.isEmpty()) return List.of();

        Set<Long> sellerIds = pool.stream().map(EnergyOrder::getUserId).collect(Collectors.toSet());
        Map<Long, User> sellerMap = userRepository.findAllById(sellerIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<EnergyOrder> priceTop = pool.stream()
                .sorted(Comparator.comparingInt(EnergyOrder::getPricePerKwh)
                        .thenComparing(EnergyOrder::getCreatedAt, CREATED_AT_ASC))
                .limit(TOP_N).toList();

        List<EnergyOrder> distTop = pool.stream()
                .sorted(Comparator.comparingDouble(o -> {
                    User seller = sellerMap.get(o.getUserId());
                    if (seller == null) return Double.POSITIVE_INFINITY;
                    if (buyer.getLatitude() == null || buyer.getLongitude() == null
                            || seller.getLatitude() == null || seller.getLongitude() == null) {
                        return Double.POSITIVE_INFINITY;
                    }
                    return haversineKm(buyer.getLatitude(), buyer.getLongitude(),
                            seller.getLatitude(), seller.getLongitude());
                }))
                .limit(TOP_N).toList();

        List<EnergyOrder> trustTop = pool.stream()
                .sorted((a, b) -> {
                    User ua = sellerMap.get(a.getUserId());
                    User ub = sellerMap.get(b.getUserId());
                    int ta = ua != null ? ua.getTrustScore() : -1;
                    int tb = ub != null ? ub.getTrustScore() : -1;
                    if (tb != ta) return Integer.compare(tb, ta);
                    return CREATED_AT_ASC.compare(a.getCreatedAt(), b.getCreatedAt());
                })
                .limit(TOP_N).toList();

        LinkedHashMap<Long, EnergyOrder> uniq = new LinkedHashMap<>();
        for (EnergyOrder o : priceTop) uniq.put(o.getId(), o);
        for (EnergyOrder o : distTop)  uniq.put(o.getId(), o);
        for (EnergyOrder o : trustTop) uniq.put(o.getId(), o);

        return new ArrayList<>(uniq.values());
    }

    /**
     * SELL 기준 BUY 후보:
     * pool(500) → 가격Top100 + 거리Top100 + 구매자신뢰Top100 + 오래된Top100 → union(dedup)
     * (여기서도 "결정"은 scoreBuyPref()로만 한다)
     */
    private List<EnergyOrder> buildBuyCandidatesForSell(EnergyOrder sellOrder, User seller) {

        int sellPrice = sellOrder.getPricePerKwh();
        BigDecimal amount = sellOrder.getAmountKwh();
        Long sellerId = sellOrder.getUserId();

        List<EnergyOrder> pool = energyOrderRepository.findBuyCandidatesForSellLocked(
                sellPrice, amount, sellerId, PageRequest.of(0, POOL_SIZE)
        );
        if (pool.isEmpty()) return List.of();

        Set<Long> buyerIds = pool.stream().map(EnergyOrder::getUserId).collect(Collectors.toSet());
        Map<Long, User> buyerMap = userRepository.findAllById(buyerIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<EnergyOrder> priceTop = pool.stream()
                .sorted(Comparator.comparingInt(EnergyOrder::getPricePerKwh).reversed()
                        .thenComparing(EnergyOrder::getCreatedAt, CREATED_AT_ASC))
                .limit(TOP_N).toList();

        List<EnergyOrder> distTop = pool.stream()
                .sorted(Comparator.comparingDouble(o -> {
                    User buyer = buyerMap.get(o.getUserId());
                    if (buyer == null) return Double.POSITIVE_INFINITY;
                    if (buyer.getLatitude() == null || buyer.getLongitude() == null
                            || seller.getLatitude() == null || seller.getLongitude() == null) {
                        return Double.POSITIVE_INFINITY;
                    }
                    return haversineKm(buyer.getLatitude(), buyer.getLongitude(),
                            seller.getLatitude(), seller.getLongitude());
                }))
                .limit(TOP_N).toList();

        List<EnergyOrder> trustTop = pool.stream()
                .sorted((a, b) -> {
                    User ua = buyerMap.get(a.getUserId());
                    User ub = buyerMap.get(b.getUserId());
                    int ta = ua != null ? ua.getTrustScore() : -1;
                    int tb = ub != null ? ub.getTrustScore() : -1;
                    if (tb != ta) return Integer.compare(tb, ta);
                    return CREATED_AT_ASC.compare(a.getCreatedAt(), b.getCreatedAt());
                })
                .limit(TOP_N).toList();

        List<EnergyOrder> oldestTop = pool.stream()
                .sorted(Comparator.comparing(EnergyOrder::getCreatedAt, CREATED_AT_ASC))
                .limit(TOP_N).toList();

        LinkedHashMap<Long, EnergyOrder> uniq = new LinkedHashMap<>();
        for (EnergyOrder o : priceTop)  uniq.put(o.getId(), o);
        for (EnergyOrder o : distTop)   uniq.put(o.getId(), o);
        for (EnergyOrder o : trustTop)  uniq.put(o.getId(), o);
        for (EnergyOrder o : oldestTop) uniq.put(o.getId(), o);

        return new ArrayList<>(uniq.values());
    }

    // ------------------ (2) 단일 점수 함수 + 선택 ------------------

    /**
     * ✅ 단일 점수 함수: "BUY 가중치"로 (buy, sell) 쌍의 점수를 계산
     * - priceScore: (buyPrice - sellPrice) slack이 클수록 좋음
     * - distScore : buyer-seller 가까울수록 좋음
     * - trustScore: seller trust 높을수록 좋음
     */
    private double scoreBuyPref(EnergyOrder buy, User buyer, EnergyOrder sell, User seller,
                                int minSlack, int maxSlack) {

        double wP = buy.getWeightPrice() != null ? buy.getWeightPrice() : 0.6;
        double wD = buy.getWeightDistance() != null ? buy.getWeightDistance() : 0.3;
        double wT = buy.getWeightTrust() != null ? buy.getWeightTrust() : 0.1;

        double sum = wP + wD + wT;
        if (sum > 0 && Math.abs(sum - 1.0) > 0.0001) {
            wP /= sum; wD /= sum; wT /= sum;
        }

        int slack = buy.getPricePerKwh() - sell.getPricePerKwh(); // 교차 조건 만족하면 >=0
        double priceScore = normalizeHigherIsBetter(slack, minSlack, maxSlack);

        double distScore = distanceScoreKm(
                buyer.getLatitude(), buyer.getLongitude(),
                seller.getLatitude(), seller.getLongitude(),
                DIST_MAX_KM
        );

        double trustScore = normalizeTrust(seller.getTrustScore());

        return wP * priceScore + wD * distScore + wT * trustScore;
    }

    /**
     * BUY 트리거: 후보 SELL 중에서 scoreBuyPref 최대인 SELL 선택
     */
    private EnergyOrder pickBestSellForBuy(EnergyOrder buy, User buyer, List<EnergyOrder> sells) {

        // slack 정규화 범위 계산 (buyPrice - sellPrice)
        int minSlack = Integer.MAX_VALUE;
        int maxSlack = Integer.MIN_VALUE;

        Set<Long> sellerIds = sells.stream().map(EnergyOrder::getUserId).collect(Collectors.toSet());
        Map<Long, User> sellerMap = userRepository.findAllById(sellerIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        for (EnergyOrder sell : sells) {
            int slack = buy.getPricePerKwh() - sell.getPricePerKwh();
            minSlack = Math.min(minSlack, slack);
            maxSlack = Math.max(maxSlack, slack);
        }
        if (minSlack == Integer.MAX_VALUE) minSlack = 0;
        if (maxSlack == Integer.MIN_VALUE) maxSlack = 0;

        double bestScore = -1;
        EnergyOrder best = null;

        for (EnergyOrder sell : sells) {
            User seller = sellerMap.get(sell.getUserId());
            if (seller == null) continue;

            double score = scoreBuyPref(buy, buyer, sell, seller, minSlack, maxSlack);

            if (score > bestScore + 1e-9) {
                bestScore = score;
                best = sell;
            } else if (Math.abs(score - bestScore) <= 1e-9 && best != null) {
                // tie-break: 더 싼 가격 → 더 빠른 생성
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

    /**
     * SELL 트리거: 후보 BUY 중에서 (각 BUY의 가중치로) "이 SELL" 점수가 최대인 BUY 선택
     * ✅ 여기서도 점수 함수는 scoreBuyPref 하나뿐이다.
     */
    private EnergyOrder pickBestBuyForThisSell(EnergyOrder sell, User seller, List<EnergyOrder> buys) {

        Set<Long> buyerIds = buys.stream().map(EnergyOrder::getUserId).collect(Collectors.toSet());
        Map<Long, User> buyerMap = userRepository.findAllById(buyerIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        // slack 범위(min/max)는 후보 BUY들 기준으로 계산
        int minSlack = Integer.MAX_VALUE;
        int maxSlack = Integer.MIN_VALUE;
        for (EnergyOrder buy : buys) {
            int slack = buy.getPricePerKwh() - sell.getPricePerKwh();
            minSlack = Math.min(minSlack, slack);
            maxSlack = Math.max(maxSlack, slack);
        }
        if (minSlack == Integer.MAX_VALUE) minSlack = 0;
        if (maxSlack == Integer.MIN_VALUE) maxSlack = 0;

        double bestScore = -1;
        EnergyOrder best = null;

        for (EnergyOrder buy : buys) {
            User buyer = buyerMap.get(buy.getUserId());
            if (buyer == null) continue;

            double score = scoreBuyPref(buy, buyer, sell, seller, minSlack, maxSlack);

            if (score > bestScore + 1e-9) {
                bestScore = score;
                best = buy;
            } else if (Math.abs(score - bestScore) <= 1e-9 && best != null) {
                // tie-break: 더 오래 기다린 BUY 우선(공정성)
                if (buy.getCreatedAt() != null && best.getCreatedAt() != null
                        && buy.getCreatedAt().isBefore(best.getCreatedAt())) {
                    best = buy;
                }
            }
        }
        return best;
    }

    // ------------------ (3) 매칭 실행(공통) ------------------

    /**
     * ✅ 매칭 실행은 무조건 이 함수 하나로만 한다. (중복 제거)
     * - 체결가: SELL 가격
     * - trade 생성
     * - buyer 잠금 차액 해제
     */
    private void executeMatch(EnergyOrder buyOrder, EnergyOrder sellOrder) {

        if (!"ACTIVE".equalsIgnoreCase(buyOrder.getStatus())) return;
        if (!"ACTIVE".equalsIgnoreCase(sellOrder.getStatus())) return;

        buyOrder.setStatus("MATCHED");
        sellOrder.setStatus("MATCHED");
        energyOrderRepository.save(buyOrder);
        energyOrderRepository.save(sellOrder);

        int executedPrice = sellOrder.getPricePerKwh();

        EnergyTrade trade = new EnergyTrade();
        trade.setBuyOrderId(buyOrder.getId());
        trade.setSellOrderId(sellOrder.getId());
        trade.setPricePerKwh(executedPrice);
        trade.setAmountKwh(buyOrder.getAmountKwh()); // 수량 동일 전제
        trade.setStatus("MATCHED");
        energyTradeRepository.save(trade);

        unlockBuyerExtraLock(buyOrder, executedPrice);
    }

    // ------------------ 점수/거리 헬퍼 ------------------

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

    // ------------------ 컨트롤러용 ------------------

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
        }

        energyOrderRepository.deleteById(orderId);
    }
}
