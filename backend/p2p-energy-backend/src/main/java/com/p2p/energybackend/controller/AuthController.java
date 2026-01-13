package com.p2p.energybackend.controller;
import com.p2p.energybackend.util.JwtUtil;

import com.p2p.energybackend.model.User;
import com.p2p.energybackend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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
    
    // 회원가입 API
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
    // 로그인 API
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String password = request.get("password");
            
            // 로그인 처리
            User user = userService.login(username, password);

            //JWT생성
            String token = jwtUtil.generateToken(user.getUsername());
            
            // 성공 응답
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "로그인 성공!");
            response.put("username", user.getUsername());
            response.put("token",token);
            response.put("lastLoginAt", user.getLastLoginAt());
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            // 실패 응답
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    // 아이디 중복 체크 API
    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsername(@RequestParam String username) {
        boolean exists = userService.isUsernameTaken(username);
        
        Map<String, Object> response = new HashMap<>();
        response.put("exists", exists);
        
        return ResponseEntity.ok(response);
    }
}
