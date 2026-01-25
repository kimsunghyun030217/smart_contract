package com.p2p.energybackend.controller;

import com.p2p.energybackend.service.UserWalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api/wallet")
public class UserWalletController {

    private final UserWalletService walletService;

    public UserWalletController(UserWalletService walletService) {
        this.walletService = walletService;
    }

    // ✅ 내 지갑 조회
    @GetMapping("/me")
    public ResponseEntity<?> getMyWallet(Authentication auth) {
        Long userId = extractUserId(auth);
        return ResponseEntity.ok(walletService.getMyWallet(userId));
    }

    // ✅ PoC: 내 total_krw 직접 세팅
    @PutMapping("/me/balance")
    public ResponseEntity<?> setMyBalance(@RequestBody SetBalanceRequest req, Authentication auth) {
        Long userId = extractUserId(auth);
        return ResponseEntity.ok(walletService.setMyTotalKrw(userId, req.totalKrw()));
    }

    public record SetBalanceRequest(BigDecimal totalKrw) {}

    // ✅ EnergyOrderController랑 동일
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
