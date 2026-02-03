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
    }

    uint256 public nextOrderId = 1;
    mapping(uint256 => Order) public orders;

    // ✅ B 방식: 컨트랙트 내부 “가상 잔고”
    mapping(address => uint256) public krwBalance;
    mapping(address => uint256) public kwhBalance;

    // ✅ 잠금(에스크로 느낌)
    mapping(address => uint256) public krwLocked;
    mapping(address => uint256) public kwhLocked;

    event BalanceFunded(address indexed user, uint256 krw, uint256 kwh);
    event OrderCreated(
        uint256 indexed orderId,
        address indexed maker,
        uint8 side,
        uint256 amountKwh,
        uint256 pricePerKwh,
        uint256 startTime,
        uint256 endTime
    );
    event OrderCancelled(uint256 indexed orderId);

    // PoC용 충전
    function fund(uint256 addKrw, uint256 addKwh) external {
        krwBalance[msg.sender] += addKrw;
        kwhBalance[msg.sender] += addKwh;
        emit BalanceFunded(msg.sender, addKrw, addKwh);
    }

    function createOrder(
        uint8 side, // 0=BUY, 1=SELL
        uint256 amountKwh,
        uint256 pricePerKwh,
        uint256 startTime,
        uint256 endTime
    ) external returns (uint256 orderId) {
        require(amountKwh > 0, "amountKwh>0");
        require(pricePerKwh > 0, "price>0");
        require(startTime < endTime, "time window");
        require(endTime > block.timestamp, "end in future");

        Side s = side == 0 ? Side.BUY : Side.SELL;

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
            status: Status.ACTIVE
        });

        emit OrderCreated(orderId, msg.sender, side, amountKwh, pricePerKwh, startTime, endTime);
    }

    function cancelOrder(uint256 orderId) external {
        Order storage o = orders[orderId];
        require(o.maker == msg.sender, "not maker");
        require(o.status == Status.ACTIVE, "not active");

        o.status = Status.CANCELLED;

        // ✅ 잠금 해제
        if (o.side == Side.BUY) {
            uint256 cost = o.amountKwh * o.pricePerKwh;
            krwLocked[msg.sender] -= cost;
        } else {
            kwhLocked[msg.sender] -= o.amountKwh;
        }

        emit OrderCancelled(orderId);
    }
}
