package com.p2p.energybackend.controller;

import com.p2p.energybackend.model.EnergyOrder;
import com.p2p.energybackend.service.EnergyOrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/orders")
public class EnergyOrderController {

    private final EnergyOrderService energyOrderService;

    public EnergyOrderController(EnergyOrderService energyOrderService) {
        this.energyOrderService = energyOrderService;
    }

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody EnergyOrder order, Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).body("인증 필요");
        }

        Long userId;
        try {
            Object principal = auth.getPrincipal();
            if (principal instanceof Long) userId = (Long) principal;
            else userId = Long.valueOf(principal.toString());
        } catch (Exception e) {
            return ResponseEntity.status(401).body("유효하지 않은 인증 정보");
        }

        order.setUserId(userId);
        return ResponseEntity.ok(energyOrderService.createOrder(order));
    }

    // ✅ 내 주문만 조회
    @GetMapping
    public ResponseEntity<?> getMyOrders(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).body("인증 필요");
        }

        Long userId;
        try {
            Object principal = auth.getPrincipal();
            if (principal instanceof Long) userId = (Long) principal;
            else userId = Long.valueOf(principal.toString());
        } catch (Exception e) {
            return ResponseEntity.status(401).body("유효하지 않은 인증 정보");
        }

        return ResponseEntity.ok(energyOrderService.getMyOrders(userId));
    }

    // ✅ 주문 취소(삭제): ACTIVE인 내 주문만 가능
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id, Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).body("인증 필요");
        }

        Long userId;
        try {
            Object principal = auth.getPrincipal();
            if (principal instanceof Long) userId = (Long) principal;
            else userId = Long.valueOf(principal.toString());
        } catch (Exception e) {
            return ResponseEntity.status(401).body("유효하지 않은 인증 정보");
        }

        try {
            energyOrderService.cancelOrder(userId, id);
            return ResponseEntity.ok("취소 완료");
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
