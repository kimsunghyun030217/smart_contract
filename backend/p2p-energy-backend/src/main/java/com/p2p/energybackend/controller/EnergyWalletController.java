package com.p2p.energybackend.controller;

import com.p2p.energybackend.model.UserEnergyWallet;
import com.p2p.energybackend.service.UserEnergyWalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/energy-wallet")
public class EnergyWalletController {

    private final UserEnergyWalletService energyWalletService;

    public EnergyWalletController(UserEnergyWalletService energyWalletService) {
        this.energyWalletService = energyWalletService;
    }

    // ✅ 내 전기지갑 조회
    @GetMapping
    public ResponseEntity<?> getMyEnergyWallet(Authentication auth) {
        Long userId = extractUserId(auth);

        UserEnergyWallet w = energyWalletService.getOrCreate(userId);
        BigDecimal total = nvl(w.getTotalKwh());
        BigDecimal locked = nvl(w.getLockedKwh());
        BigDecimal available = total.subtract(locked);
        if (available.signum() < 0) available = BigDecimal.ZERO;

        return ResponseEntity.ok(Map.of(
                "totalKwh", total,
                "lockedKwh", locked,
                "availableKwh", available
        ));
    }

    // ✅ 충전: total_kwh += amountKwh
    @PostMapping("/charge")
    public ResponseEntity<?> charge(Authentication auth, @RequestBody ChargeRequest req) {
        Long userId = extractUserId(auth);

        BigDecimal amount = normalizeKwh(req.amountKwh());
        UserEnergyWallet w = energyWalletService.charge(userId, amount);

        BigDecimal total = nvl(w.getTotalKwh());
        BigDecimal locked = nvl(w.getLockedKwh());
        BigDecimal available = total.subtract(locked);
        if (available.signum() < 0) available = BigDecimal.ZERO;

        return ResponseEntity.ok(Map.of(
                "totalKwh", total,
                "lockedKwh", locked,
                "availableKwh", available
        ));
    }

    public record ChargeRequest(BigDecimal amountKwh) {}

    private BigDecimal normalizeKwh(BigDecimal v) {
        if (v == null) throw new IllegalArgumentException("amountKwh 필요");
        return v.setScale(3, RoundingMode.HALF_UP);
    }

    private BigDecimal nvl(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    // ✅ EnergyOrderController랑 동일한 방식
    private Long extractUserId(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "인증 필요");
        }

        try {
            Object principal = auth.getPrincipal();
            if (principal instanceof Long) return (Long) principal;
            return Long.valueOf(principal.toString());
        } catch (Exception e) {
            throw new ResponseStatusException(UNAUTHORIZED, "유효하지 않은 인증 정보");
        }
    }
}
