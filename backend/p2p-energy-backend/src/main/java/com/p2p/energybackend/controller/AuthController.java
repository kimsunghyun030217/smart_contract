package com.p2p.energybackend.controller;

import com.p2p.energybackend.model.User;
import com.p2p.energybackend.service.UserService;
import com.p2p.energybackend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    // 회원가입
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String password = request.get("password");

            User user = userService.signup(username, password);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "회원가입 성공!");
            response.put("username", user.getUsername());

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // 로그인
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String password = request.get("password");

            User user = userService.login(username, password);
            String token = jwtUtil.generateToken(user.getId(), user.getUsername());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "로그인 성공!");
            response.put("username", user.getUsername());
            response.put("token", token);
            response.put("lastLoginAt", user.getLastLoginAt());

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // 아이디 중복 체크
    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsername(@RequestParam String username) {
        boolean exists = userService.isUsernameTaken(username);

        Map<String, Object> response = new HashMap<>();
        response.put("exists", exists);

        return ResponseEntity.ok(response);
    }

    // 비밀번호 변경 (JWT 인증 필요)
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request,
                                            @RequestHeader("Authorization") String authHeader) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("인증 토큰이 없습니다.");
        }

        String token = authHeader.substring(7);
        String username = jwtUtil.extractUsername(token);

        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(401).body("유효하지 않은 사용자입니다.");
        }

        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");

        boolean isCorrect = userService.checkPassword(user, currentPassword);
        if (!isCorrect) {
            return ResponseEntity.badRequest().body("현재 비밀번호가 일치하지 않습니다.");
        }

        userService.updatePassword(user, newPassword);

        return ResponseEntity.ok("비밀번호 변경 완료");
    }

    @PostMapping("/update-location")
    public ResponseEntity<?> updateLocation(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> request
    ) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("인증 필요");
        }

        String token = authHeader.substring(7);
        String username = jwtUtil.extractUsername(token);

        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(404).body("사용자를 찾을 수 없습니다.");
        }

        Double latitude = Double.valueOf(request.get("latitude").toString());
        Double longitude = Double.valueOf(request.get("longitude").toString());
        String address = request.get("address").toString();
        String detailAddress = request.get("detailAddress").toString();

        userService.updateLocation(user, latitude, longitude, address, detailAddress);

        return ResponseEntity.ok("주소 정보 업데이트 완료");
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyInfo(@RequestHeader("Authorization") String authHeader) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("인증 토큰이 없습니다.");
        }

        String token = authHeader.substring(7);
        String username = jwtUtil.extractUsername(token);

        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.status(404).body("사용자를 찾을 수 없습니다.");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("latitude", user.getLatitude());
        response.put("longitude", user.getLongitude());
        response.put("address", user.getAddress());
        response.put("detailAddress", user.getDetailAddress());


        return ResponseEntity.ok(response);
    }

}
