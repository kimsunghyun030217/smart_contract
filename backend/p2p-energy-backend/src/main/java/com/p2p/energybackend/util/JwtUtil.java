package com.p2p.energybackend.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {
    
    // 비밀키 (256비트 이상)
    private static final String SECRET_KEY = "p2p-energy-trading-secret-key-must-be-at-least-256-bits-long-for-security";
    private static final Key key = Keys.hmacShaKeyFor(SECRET_KEY.getBytes());
    
    // JWT 유효기간 (1시간)
    private static final long EXPIRATION_TIME = 1000 * 60 * 60;
    
    // JWT 생성
    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username)  // 사용자 이름
                .setIssuedAt(new Date())  // 발급 시간
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))  // 만료 시간
                .signWith(key, SignatureAlgorithm.HS256)  // 암호화
                .compact();
    }
    
    // JWT에서 username 추출
    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }
    
    // JWT 유효성 검증
    public boolean validateToken(String token, String username) {
        final String extractedUsername = extractUsername(token);
        return (extractedUsername.equals(username) && !isTokenExpired(token));
    }
    
    // JWT 만료 확인
    private boolean isTokenExpired(String token) {
        return extractClaims(token).getExpiration().before(new Date());
    }
    
    // JWT Claims 추출
    private Claims extractClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
