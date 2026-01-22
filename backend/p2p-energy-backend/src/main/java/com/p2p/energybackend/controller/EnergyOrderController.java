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

        Object principal = auth.getPrincipal();

        Long userId;
        try {
            if (principal instanceof Long) userId = (Long) principal;
            else userId = Long.valueOf(principal.toString());
        } catch (Exception e) {
            return ResponseEntity.status(401).body("유효하지 않은 인증 정보");
        }

        order.setUserId(userId);

        return ResponseEntity.ok(energyOrderService.createOrder(order));
    }

    @GetMapping
    public ResponseEntity<?> getAllOrders(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).body("인증 필요");
        }
        return ResponseEntity.ok(energyOrderService.getAllOrders());
    }
}
