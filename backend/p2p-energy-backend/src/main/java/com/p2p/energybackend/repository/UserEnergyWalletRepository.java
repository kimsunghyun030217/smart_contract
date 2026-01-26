package com.p2p.energybackend.repository;

import com.p2p.energybackend.model.UserEnergyWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserEnergyWalletRepository extends JpaRepository<UserEnergyWallet, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM UserEnergyWallet w WHERE w.userId = :userId")
    Optional<UserEnergyWallet> findByUserIdLocked(@Param("userId") Long userId);

    Optional<UserEnergyWallet> findByUserId(Long userId);
}
