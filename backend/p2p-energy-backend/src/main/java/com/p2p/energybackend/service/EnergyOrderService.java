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

    // 전체 주문 조회
    public List<EnergyOrder> getAllOrders() {
        return energyOrderRepository.findAll();
    }
}
