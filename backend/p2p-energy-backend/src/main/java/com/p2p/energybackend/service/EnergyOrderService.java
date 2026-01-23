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

    // ✅ 주문 저장 (BUY면 가중치 기본값 세팅 + 정규화)
    public EnergyOrder createOrder(EnergyOrder order) {

        // status 기본값 통일
        if (order.getStatus() == null || order.getStatus().isBlank()) {
            order.setStatus("ACTIVE");
        }

        // BUY일 때만 가중치 사용 (없으면 기본값)
        if ("buy".equalsIgnoreCase(order.getOrderType())) {
            if (order.getWeightPrice() == null) order.setWeightPrice(0.6);
            if (order.getWeightDistance() == null) order.setWeightDistance(0.3);
            if (order.getWeightTrust() == null) order.setWeightTrust(0.1);

            // 합이 1이 아니면 정규화
            double sum = order.getWeightPrice() + order.getWeightDistance() + order.getWeightTrust();
            if (sum > 0 && Math.abs(sum - 1.0) > 0.0001) {
                order.setWeightPrice(order.getWeightPrice() / sum);
                order.setWeightDistance(order.getWeightDistance() / sum);
                order.setWeightTrust(order.getWeightTrust() / sum);
            }
        }

        return energyOrderRepository.save(order);
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
    public void cancelOrder(Long userId, Long orderId) {
        EnergyOrder order = energyOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없음"));

        // 내 주문인지 확인
        if (!order.getUserId().equals(userId)) {
            throw new SecurityException("권한 없음");
        }

        // ACTIVE만 취소 가능
        if (!"ACTIVE".equalsIgnoreCase(String.valueOf(order.getStatus()))) {
            throw new IllegalStateException("대기(ACTIVE) 상태만 취소 가능");
        }

        // POC: DB에서 삭제
        energyOrderRepository.deleteById(orderId);
    }
}
