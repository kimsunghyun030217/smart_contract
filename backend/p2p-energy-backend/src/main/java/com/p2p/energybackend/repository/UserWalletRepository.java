package com.p2p.energybackend.repository;

import com.p2p.energybackend.model.UserWallet;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserWalletRepository extends JpaRepository<UserWallet, Long> {}
