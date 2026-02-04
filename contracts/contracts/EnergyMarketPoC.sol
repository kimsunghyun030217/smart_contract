// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EnergyMarketPoC {
    enum Side { BUY, SELL }
    enum Status { ACTIVE, CANCELLED, MATCHED, COMPLETED, EXPIRED }

    struct Order {
        uint256 id;
        address maker;
        Side side;
        uint256 amountKwh;
        uint256 pricePerKwh;
        uint256 startTime;
        uint256 endTime;
        Status status;

        // ✅ 추가: 가중치(BPS, 0~10000)
        uint16 wPriceBps;
        uint16 wDistBps;
        uint16 wTrustBps;
    }

    uint256 public nextOrderId = 1;
    mapping(uint256 => Order) public orders;

    // ✅ 컨트랙트 내부 “가상 잔고”
    mapping(address => uint256) public krwBalance;
    mapping(address => uint256) public kwhBalance;

    // ✅ 잠금
    mapping(address => uint256) public krwLocked;
    mapping(address => uint256) public kwhLocked;

    // ✅ 사용자 bucket 저장
    mapping(address => uint256) public bucketOf;

    event BalanceFunded(address indexed user, uint256 krw, uint256 kwh);

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
        uint16 wTrustBps
    );

    event OrderCancelled(uint256 indexed orderId);
    event BucketUpdated(address indexed user, uint256 bucket);

    function fund(uint256 addKrw, uint256 addKwh) external {
        krwBalance[msg.sender] += addKrw;
        kwhBalance[msg.sender] += addKwh;
        emit BalanceFunded(msg.sender, addKrw, addKwh);
    }

    function setBucket(uint256 bucket) external {
        bucketOf[msg.sender] = bucket;
        emit BucketUpdated(msg.sender, bucket);
    }

    // ✅ createOrder: BUY는 가중치 필수 / SELL은 가중치 무시(0으로 저장)
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

        // ✅ bucket 설정 강제(0이면 미설정)
        require(bucketOf[msg.sender] != 0, "bucket not set");

        Side s = side == 0 ? Side.BUY : Side.SELL;

        // ✅ BUY만 가중치 검증(SELL은 의미 없으니 0 고정)
        if (s == Side.BUY) {
            uint256 sum = uint256(wPriceBps) + uint256(wDistBps) + uint256(wTrustBps);
            require(sum == 10000, "weights must sum 10000");
        } else {
            wPriceBps = 0;
            wDistBps = 0;
            wTrustBps = 0;
        }

        // ✅ 잠금 체크/잠금
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
            wTrustBps: wTrustBps
        });

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
            wTrustBps
        );
    }

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
}
