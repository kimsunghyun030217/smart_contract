package com.p2p.energybackend.repository;

import com.p2p.energybackend.model.UserWallet;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.Optional;

public interface UserWalletRepository extends JpaRepository<UserWallet, Long> {

    // ✅ 일반 조회(잠금 없이)
    Optional<UserWallet> findByUserId(Long userId);

    // ✅ 잔고 변경/예약 같은 쓰기 작업 때 사용할 잠금 조회
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM UserWallet w WHERE w.userId = :userId")
    Optional<UserWallet> findByUserIdLocked(@Param("userId") Long userId);
}
