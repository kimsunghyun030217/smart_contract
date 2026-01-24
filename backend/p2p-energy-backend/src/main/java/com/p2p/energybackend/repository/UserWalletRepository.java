package com.p2p.energybackend.repository;

import com.p2p.energybackend.model.UserWallet;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;

import java.util.Optional;

public interface UserWalletRepository extends JpaRepository<UserWallet, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM UserWallet w WHERE w.userId = :userId")
    Optional<UserWallet> findByUserIdLocked(Long userId);
}
