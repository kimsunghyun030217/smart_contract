package com.p2p.energybackend.service;

import com.p2p.energybackend.model.EnergyOrder;
import com.p2p.energybackend.repository.EnergyOrderRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EnergyOrderService {

    private final EnergyOrderRepository energyOrderRepository;

    public EnergyOrderService(EnergyOrderRepository energyOrderRepository) {
        this.energyOrderRepository = energyOrderRepository;
    }

    // 주문 저장
    public EnergyOrder createOrder(EnergyOrder order) {
        return energyOrderRepository.save(order);
    }

    // 내 주문 조회 (최신순)
    public List<EnergyOrder> getMyOrders(Long userId) {
        return energyOrderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // ✅ 주문 취소(삭제): ACTIVE인 내 주문만 가능
    public void cancelOrder(Long userId, Long orderId) {
        EnergyOrder order = energyOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없음"));

        // 내 주문인지 확인
        if (!order.getUserId().equals(userId)) {
            throw new SecurityException("권한 없음");
        }

        // ACTIVE만 취소 가능 (기존 데이터가 active일 수도 있어서 ignoreCase)
        if (order.getStatus() == null || !order.getStatus().equalsIgnoreCase("ACTIVE")) {
            throw new IllegalStateException("대기(ACTIVE) 상태만 취소 가능");
        }

        // POC: DB에서 삭제
        energyOrderRepository.deleteById(orderId);
    }
}
