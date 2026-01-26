package com.p2p.energybackend.config;

import com.p2p.energybackend.util.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();

        // ✅ OPTIONS는 무조건 통과
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        // ✅ 공개 API는 토큰 검사 스킵
        if (path.equals("/api/auth/login")
                || path.equals("/api/auth/signup")
                || path.equals("/api/auth/check-username")) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7).trim();

        try {
            Claims claims = jwtUtil.validateToken(token);

            // ✅ userId 타입 안전하게 파싱 (Long/Integer/String 다 대응)
            Object rawUserId = claims.get("userId");
            Long userId = null;
            if (rawUserId instanceof Long l) userId = l;
            else if (rawUserId instanceof Integer i) userId = i.longValue();
            else if (rawUserId != null) userId = Long.valueOf(rawUserId.toString());

            if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                var authentication = new UsernamePasswordAuthenticationToken(
                        userId, // ✅ principal = Long userId (컨트롤러 extractUserId와 일치)
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_USER"))
                );

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }

        } catch (Exception e) {
            // 토큰이 이상하면 인증 세팅 없이 통과 → Security가 막음(401/403)
            System.out.println("JWT 검증 실패: " + e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
