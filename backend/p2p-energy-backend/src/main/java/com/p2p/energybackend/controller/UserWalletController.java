package com.p2p.energybackend.controller;

import com.p2p.energybackend.service.UserWalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/wallet/me")
public class UserWalletController {

    private final UserWalletService userWalletService;

    public UserWalletController(UserWalletService userWalletService) {
        this.userWalletService = userWalletService;
    }

    // ✅ 내 지갑 조회
    @GetMapping
    public ResponseEntity<?> getMyWallet(Authentication auth) {
        Long userId = extractUserId(auth);
        return ResponseEntity.ok(userWalletService.getMyWallet(userId));
    }

    // ✅ PoC: total_krw를 입력값으로 "세팅"
    @PostMapping("/set-total")
    public ResponseEntity<?> setTotal(@RequestBody SetTotalRequest req, Authentication auth) {
        Long userId = extractUserId(auth);
        return ResponseEntity.ok(userWalletService.setMyTotalKrw(userId, req.totalKrw()));
    }

    // ✅ 충전: total_krw += amountKrw
    @PostMapping("/charge")
    public ResponseEntity<?> charge(@RequestBody ChargeRequest req, Authentication auth) {
        Long userId = extractUserId(auth);
        return ResponseEntity.ok(userWalletService.chargeMyWallet(userId, req.amountKrw()));
    }

    // ===== Request DTOs =====
    public record SetTotalRequest(BigDecimal totalKrw) {}
    public record ChargeRequest(BigDecimal amountKrw) {}

    // ===== 인증 객체에서 userId 추출 =====
    private Long extractUserId(Authentication auth) {
        // 프로젝트마다 principal 타입이 다를 수 있어서 "최소 가정" 버전.
        // 네 JwtAuthenticationFilter에서 auth.getName()에 username을 넣고 있을 가능성이 큼.
        // 이미 다른 컨트롤러에서 userId 추출 함수를 쓰고 있다면 그걸 그대로 복붙해서 쓰는 게 베스트.

        // 1) principal이 커스텀 객체면 (예: CustomUserDetails)
        Object principal = auth.getPrincipal();
        try {
            // getUserId()가 있으면 그걸 사용
            var m = principal.getClass().getMethod("getUserId");
            Object v = m.invoke(principal);
            if (v instanceof Long l) return l;
            if (v instanceof Integer i) return i.longValue();
        } catch (Exception ignored) {}

        // 2) principal이 userId를 문자열로 들고 있는 케이스(드묾) 대비
        try {
            return Long.parseLong(auth.getName());
        } catch (Exception e) {
            throw new IllegalStateException("인증 객체에서 userId 추출 실패. principal=" + principal);
        }
    }
}
