package com.p2p.energybackend.repository;

import com.p2p.energybackend.model.EnergyTrade;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnergyTradeRepository extends JpaRepository<EnergyTrade, Long> {}
