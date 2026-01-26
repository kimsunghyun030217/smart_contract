package com.p2p.energybackend.service;

import com.p2p.energybackend.model.UserEnergyWallet;
import com.p2p.energybackend.repository.UserEnergyWalletRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class UserEnergyWalletService {

    private final UserEnergyWalletRepository repo;

    public UserEnergyWalletService(UserEnergyWalletRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public UserEnergyWallet getOrCreate(Long userId) {
        return repo.findByUserId(userId)
                .orElseGet(() -> repo.save(new UserEnergyWallet(userId)));
    }

    // ✅ 충전(누적)만 허용
    @Transactional
    public UserEnergyWallet charge(Long userId, BigDecimal amountKwh) {
        amountKwh = normalizeKwh(amountKwh);
        if (amountKwh.signum() <= 0) throw new IllegalArgumentException("amountKwh는 0보다 커야 함");

        UserEnergyWallet w = repo.findByUserIdLocked(userId)
                .orElseGet(() -> repo.save(new UserEnergyWallet(userId)));

        w.setTotalKwh(w.getTotalKwh().add(amountKwh));
        return repo.save(w);
    }

    private BigDecimal normalizeKwh(BigDecimal v) {
        if (v == null) throw new IllegalArgumentException("kWh 값 필요");
        return v.setScale(3, RoundingMode.HALF_UP);
    }
}
