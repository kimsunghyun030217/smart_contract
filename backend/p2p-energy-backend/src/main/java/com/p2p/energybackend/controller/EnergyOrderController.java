package com.p2p.energybackend.controller;

import com.p2p.energybackend.model.EnergyOrder;
import com.p2p.energybackend.service.EnergyOrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/orders")
public class EnergyOrderController {

    private final EnergyOrderService energyOrderService;

    public EnergyOrderController(EnergyOrderService energyOrderService) {
        this.energyOrderService = energyOrderService;
    }

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody EnergyOrder order, Authentication auth) {
        Long userId = extractUserId(auth);
        order.setUserId(userId);
        return ResponseEntity.ok(energyOrderService.createOrder(order));
    }

    // ✅ 진행중 주문(완료 제외)만 조회: /orders
    @GetMapping
    public ResponseEntity<?> getMyOrders(Authentication auth) {
        Long userId = extractUserId(auth);
        return ResponseEntity.ok(energyOrderService.getMyOrdersInProgress(userId));
    }

    // ✅ 완료 주문(COMPLETED만) 조회: /orders/completed
    @GetMapping("/completed")
    public ResponseEntity<?> getMyCompletedOrders(Authentication auth) {
        Long userId = extractUserId(auth);
        return ResponseEntity.ok(energyOrderService.getMyCompletedOrders(userId));
    }

    // ✅ 주문 취소(삭제): ACTIVE인 내 주문만 가능
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id, Authentication auth) {
        Long userId = extractUserId(auth);

        try {
            energyOrderService.cancelOrder(userId, id);
            return ResponseEntity.ok("취소 완료");
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ✅ 인증에서 userId 뽑기 (401로 깔끔하게 떨어지게)
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
