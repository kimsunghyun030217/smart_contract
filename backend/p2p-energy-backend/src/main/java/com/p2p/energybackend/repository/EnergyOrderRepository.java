package com.p2p.energybackend.repository;

import com.p2p.energybackend.model.EnergyOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnergyOrderRepository extends JpaRepository<EnergyOrder, Long> {
    List<EnergyOrder> findByUserIdOrderByCreatedAtDesc(Long userId);
}