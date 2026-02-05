// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EnergyMarketPoC {
    enum Side { BUY, SELL }
    enum Status { ACTIVE, CANCELLED, MATCHED, COMPLETED, EXPIRED }
    enum TradeStatus { MATCHED, COMPLETED }

    // =======================
    // Config
    // =======================
    uint256 public constant BPS = 10_000;
    uint256 public constant MULT = 1_000_000;        // bucketId = latIndex * MULT + lngIndex
    uint256 public constant MAX_RADIUS = 3;
    uint256 public constant MAX_SCAN_PER_BUCKET = 40;
    uint256 public constant MAX_EVAL = 80;

    // SELL은 BUY 수량의 +10%까지 허용
    uint256 public constant SELL_OVERFILL_BPS = 11_000;

    // =======
    // Structs
    // =======
    struct Order {
        uint256 id;
        address maker;
        Side side;
        uint256 amountKwh;
        uint256 pricePerKwh;
        uint256 startTime;
        uint256 endTime;
        Status status;

        // BUY만 의미 있음(SELL은 0)
        uint16 wPriceBps;
        uint16 wDistBps;
        uint16 wTrustBps;

        // 주문 생성 시점 bucket
        uint256 bucketId;
    }

    struct Trade {
        uint256 id;
        uint256 buyOrderId;
        uint256 sellOrderId;
        uint256 amountKwh;
        uint256 pricePerKwh;      // executed price = sell.price
        uint256 deliveryStart;
        uint256 deliveryEnd;
        TradeStatus status;
    }

    uint256 public nextOrderId = 1;
    mapping(uint256 => Order) public orders;

    uint256 public nextTradeId = 1;
    mapping(uint256 => Trade) public trades;

    // ✅ 추가: orderId -> tradeId 연결
    mapping(uint256 => uint256) public orderToTradeId;

    // =========================
    // Virtual balances + locked
    // =========================
    mapping(address => uint256) public krwBalance;
    mapping(address => uint256) public kwhBalance;

    mapping(address => uint256) public krwLocked;
    mapping(address => uint256) public kwhLocked;

    // 사용자 bucket
    mapping(address => uint256) public bucketOf;

    // 버킷별 ACTIVE SELL 인덱스(삭제 안하고 status로 스킵)
    mapping(uint256 => uint256[]) public activeSellIdsByBucket;

    // 신뢰점수(완료 횟수 기반)
    mapping(address => uint256) public completedTradesCount;

    // =======
    // Events
    // =======
    event BalanceFunded(address indexed user, uint256 krw, uint256 kwh);
    event BucketUpdated(address indexed user, uint256 bucket);

    event OrderCreated(
        uint256 indexed orderId,
        address indexed maker,
        uint8 side,
        uint256 amountKwh,
        uint256 pricePerKwh,
        uint256 startTime,
        uint256 endTime,
        uint16 wPriceBps,
        uint16 wDistBps,
        uint16 wTrustBps,
        uint256 bucketId
    );

    event OrderCancelled(uint256 indexed orderId);

    event OrderMatched(
        uint256 indexed buyOrderId,
        uint256 indexed sellOrderId,
        uint256 indexed tradeId,
        uint256 executedAmountKwh,
        uint256 executedPricePerKwh,
        uint256 deliveryStart,
        uint256 deliveryEnd,
        uint256 scoreBps,
        address matcher
    );

    event TradeSettled(
        uint256 indexed tradeId,
        uint256 indexed buyOrderId,
        uint256 indexed sellOrderId
    );

    // ==========
    // Fund/Setup
    // ==========
    function fund(uint256 addKrw, uint256 addKwh) external {
        krwBalance[msg.sender] += addKrw;
        kwhBalance[msg.sender] += addKwh;
        emit BalanceFunded(msg.sender, addKrw, addKwh);
    }

    function setBucket(uint256 bucket) external {
        bucketOf[msg.sender] = bucket;
        emit BucketUpdated(msg.sender, bucket);
    }

    // ==========
    // createOrder
    // ==========
    function createOrder(
        uint8 side, // 0=BUY, 1=SELL
        uint256 amountKwh,
        uint256 pricePerKwh,
        uint256 startTime,
        uint256 endTime,
        uint16 wPriceBps,
        uint16 wDistBps,
        uint16 wTrustBps
    ) external returns (uint256 orderId) {
        require(amountKwh > 0, "amountKwh>0");
        require(pricePerKwh > 0, "price>0");
        require(startTime < endTime, "time window");
        require(endTime > block.timestamp, "end in future");

        // bucket 설정 강제
        uint256 b = bucketOf[msg.sender];
        require(b != 0, "bucket not set");

        Side s = side == 0 ? Side.BUY : Side.SELL;

        // BUY만 가중치 검증(SELL은 0)
        if (s == Side.BUY) {
            uint256 sum = uint256(wPriceBps) + uint256(wDistBps) + uint256(wTrustBps);
            require(sum == BPS, "weights must sum 10000");
        } else {
            wPriceBps = 0;
            wDistBps = 0;
            wTrustBps = 0;
        }

        // 잠금 체크/잠금
        if (s == Side.BUY) {
            uint256 cost = amountKwh * pricePerKwh;
            require(krwBalance[msg.sender] - krwLocked[msg.sender] >= cost, "not enough KRW");
            krwLocked[msg.sender] += cost;
        } else {
            require(kwhBalance[msg.sender] - kwhLocked[msg.sender] >= amountKwh, "not enough kWh");
            kwhLocked[msg.sender] += amountKwh;
        }

        orderId = nextOrderId++;
        orders[orderId] = Order({
            id: orderId,
            maker: msg.sender,
            side: s,
            amountKwh: amountKwh,
            pricePerKwh: pricePerKwh,
            startTime: startTime,
            endTime: endTime,
            status: Status.ACTIVE,
            wPriceBps: wPriceBps,
            wDistBps: wDistBps,
            wTrustBps: wTrustBps,
            bucketId: b
        });

        // SELL이면 버킷 인덱스에 추가
        if (s == Side.SELL) {
            activeSellIdsByBucket[b].push(orderId);
        }

        emit OrderCreated(
            orderId,
            msg.sender,
            side,
            amountKwh,
            pricePerKwh,
            startTime,
            endTime,
            wPriceBps,
            wDistBps,
            wTrustBps,
            b
        );
    }

    // ==========
    // cancelOrder
    // ==========
    function cancelOrder(uint256 orderId) external {
        Order storage o = orders[orderId];
        require(o.maker == msg.sender, "not maker");
        require(o.status == Status.ACTIVE, "not active");

        o.status = Status.CANCELLED;

        if (o.side == Side.BUY) {
            uint256 cost = o.amountKwh * o.pricePerKwh;
            krwLocked[msg.sender] -= cost;
        } else {
            kwhLocked[msg.sender] -= o.amountKwh;
        }

        emit OrderCancelled(orderId);
    }

    // =========================
    // On-chain matching (BUY)
    // =========================
    function matchBuy(
        uint256 buyOrderId,
        uint256 radius,
        uint256 scanLimitPerBucket,
        uint256 maxEval
    ) external returns (uint256 tradeId) {
        require(radius <= MAX_RADIUS, "radius too big");
        require(scanLimitPerBucket > 0 && scanLimitPerBucket <= MAX_SCAN_PER_BUCKET, "bad scanLimit");
        require(maxEval > 0 && maxEval <= MAX_EVAL, "bad maxEval");

        Order storage buy = orders[buyOrderId];
        require(buy.status == Status.ACTIVE, "buy not active");
        require(buy.side == Side.BUY, "not BUY");
        require(buy.endTime > block.timestamp, "buy expired");

        uint256 buyBucket = buy.bucketId;
        require(buyBucket != 0, "buy bucket missing");

        (int256 buyLat, int256 buyLng) = _splitBucket(buyBucket);

        uint256 bestSellId = 0;
        uint256 bestScore = 0;
        uint256 evalCount = 0;

        for (int256 dx = -int256(radius); dx <= int256(radius); dx++) {
            for (int256 dy = -int256(radius); dy <= int256(radius); dy++) {
                uint256 nb = _composeBucket(buyLat + dx, buyLng + dy);
                uint256[] storage list = activeSellIdsByBucket[nb];

                uint256 scanned = 0;
                uint256 len = list.length;

                for (uint256 i = 0; i < len && scanned < scanLimitPerBucket; i++) {
                    uint256 sellId = list[i];
                    scanned++;

                    Order storage sell = orders[sellId];
                    if (sell.status != Status.ACTIVE) continue;
                    if (sell.side != Side.SELL) continue;
                    if (sell.endTime <= block.timestamp) continue;

                    if (buy.pricePerKwh < sell.pricePerKwh) continue;

                    if (sell.amountKwh < buy.amountKwh) continue;
                    if (sell.amountKwh * BPS > buy.amountKwh * SELL_OVERFILL_BPS) continue;

                    (uint256 ds, uint256 de) = _overlap(
                        buy.startTime, buy.endTime,
                        sell.startTime, sell.endTime
                    );
                    if (ds == 0 && de == 0) continue;
                    if (de <= ds) continue;

                    evalCount++;
                    if (evalCount > maxEval) {
                        dx = int256(radius) + 1;
                        dy = int256(radius) + 1;
                        break;
                    }

                    uint256 score = _score(buy, sell, nb, radius);

                    if (score > bestScore) {
                        bestScore = score;
                        bestSellId = sellId;
                    } else if (score == bestScore && bestSellId != 0) {
                        Order storage cur = orders[bestSellId];
                        if (sell.pricePerKwh < cur.pricePerKwh) bestSellId = sellId;
                    }
                }
            }
        }

        require(bestSellId != 0, "no match");

        Order storage sellBest = orders[bestSellId];
        require(sellBest.status == Status.ACTIVE, "sell not active anymore");

        buy.status = Status.MATCHED;
        sellBest.status = Status.MATCHED;

        uint256 executedAmount = buy.amountKwh;
        uint256 executedPrice = sellBest.pricePerKwh;

        (uint256 deliveryStart, uint256 deliveryEnd) = _overlap(
            buy.startTime, buy.endTime,
            sellBest.startTime, sellBest.endTime
        );
        require(deliveryEnd > deliveryStart, "bad delivery window");

        _unlockBuyerExtraLock(buy, executedPrice, executedAmount);
        _unlockSellerExtraEnergy(sellBest, executedAmount);

        tradeId = nextTradeId++;
        trades[tradeId] = Trade({
            id: tradeId,
            buyOrderId: buyOrderId,
            sellOrderId: bestSellId,
            amountKwh: executedAmount,
            pricePerKwh: executedPrice,
            deliveryStart: deliveryStart,
            deliveryEnd: deliveryEnd,
            status: TradeStatus.MATCHED
        });

        // ✅ 핵심 추가: 주문 -> trade 연결 저장
        orderToTradeId[buyOrderId] = tradeId;
        orderToTradeId[bestSellId] = tradeId;

        emit OrderMatched(
            buyOrderId,
            bestSellId,
            tradeId,
            executedAmount,
            executedPrice,
            deliveryStart,
            deliveryEnd,
            bestScore,
            msg.sender
        );
    }

    // =========================
    // settle
    // =========================
    function settleTrade(uint256 tradeId) external {
        Trade storage t = trades[tradeId];
        require(t.id != 0, "trade not found");
        require(t.status == TradeStatus.MATCHED, "not MATCHED");
        require(block.timestamp >= t.deliveryStart, "too early");

        Order storage buy = orders[t.buyOrderId];
        Order storage sell = orders[t.sellOrderId];

        require(buy.status == Status.MATCHED, "buy not matched");
        require(sell.status == Status.MATCHED, "sell not matched");

        address buyer = buy.maker;
        address seller = sell.maker;

        uint256 executedNeed = t.amountKwh * t.pricePerKwh;

        require(krwLocked[buyer] >= executedNeed, "buyer locked insufficient");
        require(krwBalance[buyer] >= executedNeed, "buyer balance insufficient");

        krwBalance[buyer] -= executedNeed;
        krwLocked[buyer] -= executedNeed;
        krwBalance[seller] += executedNeed;

        require(kwhLocked[seller] >= t.amountKwh, "seller locked insufficient");
        require(kwhBalance[seller] >= t.amountKwh, "seller balance insufficient");

        kwhBalance[seller] -= t.amountKwh;
        kwhLocked[seller] -= t.amountKwh;
        kwhBalance[buyer] += t.amountKwh;

        buy.status = Status.COMPLETED;
        sell.status = Status.COMPLETED;
        t.status = TradeStatus.COMPLETED;

        completedTradesCount[buyer] += 1;
        completedTradesCount[seller] += 1;

        emit TradeSettled(tradeId, t.buyOrderId, t.sellOrderId);
    }

    // =========================
    // Internal helpers
    // =========================
    function _overlap(
        uint256 aStart, uint256 aEnd,
        uint256 bStart, uint256 bEnd
    ) internal pure returns (uint256 s, uint256 e) {
        s = aStart > bStart ? aStart : bStart;
        e = aEnd < bEnd ? aEnd : bEnd;
        if (e <= s) return (0, 0);
    }

    function _splitBucket(uint256 bucket) internal pure returns (int256 latIndex, int256 lngIndex) {
        latIndex = int256(bucket / MULT);
        lngIndex = int256(bucket % MULT);
    }

    function _composeBucket(int256 latIndex, int256 lngIndex) internal pure returns (uint256) {
        require(latIndex >= 0 && lngIndex >= 0, "neg idx");
        return uint256(latIndex) * MULT + uint256(lngIndex);
    }

    function _abs(int256 x) internal pure returns (uint256) {
        return uint256(x >= 0 ? x : -x);
    }

    function _trustBps(address user) internal view returns (uint256) {
        uint256 v = 5000 + completedTradesCount[user] * 200;
        return v > BPS ? BPS : v;
    }

    function _score(
        Order storage buy,
        Order storage sell,
        uint256 sellBucket,
        uint256 radius
    ) internal view returns (uint256) {
        uint256 buyP = buy.pricePerKwh;
        uint256 sellP = sell.pricePerKwh;
        uint256 slack = buyP - sellP;
        uint256 priceScore = buyP == 0 ? 0 : (slack * BPS) / buyP;
        if (priceScore > BPS) priceScore = BPS;

        (int256 bLat, int256 bLng) = _splitBucket(buy.bucketId);
        (int256 sLat, int256 sLng) = _splitBucket(sellBucket);

        uint256 dx = _abs(bLat - sLat);
        uint256 dy = _abs(bLng - sLng);
        uint256 manhattan = dx + dy;

        uint256 distScore = BPS;
        if (radius > 0) {
            uint256 maxDist = (radius * 2);
            uint256 denom = maxDist == 0 ? 1 : maxDist;
            uint256 penalty = (manhattan * BPS) / denom;
            distScore = penalty >= BPS ? 0 : (BPS - penalty);
        }

        uint256 trustScore = _trustBps(sell.maker);

        uint256 wP = buy.wPriceBps;
        uint256 wD = buy.wDistBps;
        uint256 wT = buy.wTrustBps;

        uint256 score = (wP * priceScore + wD * distScore + wT * trustScore) / BPS;
        if (score > BPS) score = BPS;
        return score;
    }

    function _unlockBuyerExtraLock(Order storage buy, uint256 executedPrice, uint256 executedAmount) internal {
        uint256 lockedByBuy = executedAmount * buy.pricePerKwh;
        uint256 need = executedAmount * executedPrice;
        if (lockedByBuy > need) {
            uint256 extra = lockedByBuy - need;
            krwLocked[buy.maker] -= extra;
        }
    }

    function _unlockSellerExtraEnergy(Order storage sell, uint256 executedAmount) internal {
        if (sell.amountKwh > executedAmount) {
            uint256 extra = sell.amountKwh - executedAmount;
            kwhLocked[sell.maker] -= extra;
        }
    }
}
