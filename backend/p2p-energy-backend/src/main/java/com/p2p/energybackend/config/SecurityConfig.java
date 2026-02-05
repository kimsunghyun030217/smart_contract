package com.p2p.energybackend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // ✅ 기본 로그인/Basic 인증 끄기
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)

            // ✅ CORS 연결
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            .authorizeHttpRequests(auth -> auth
                // ✅ 프리플라이트
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // ✅ 공개 API
                .requestMatchers(
                    "/api/auth/signup",
                    "/api/auth/login",
                    "/api/auth/check-username",
                    "/api/naver-geocoding"
                ).permitAll()

                // ✅ 최소 종료시간 계산 endpoint는 공개 (토큰 없이도 OK)
                .requestMatchers(HttpMethod.GET, "/orders/min-end-time").permitAll()

                // ✅ 인증 필요
                .requestMatchers("/api/auth/me").authenticated()
                .requestMatchers("/api/auth/change-password").authenticated()

                // ✅ 지갑/에너지 지갑 인증 필요
                .requestMatchers("/api/wallet/**").authenticated()
                .requestMatchers("/energy-wallet/**").authenticated()
                .requestMatchers("/api/energy-wallet/**").authenticated()

                // ✅ 주문 관련 인증 필요
                .requestMatchers("/orders/**").authenticated()

                // ❌ (기존 permitAll 제거) 누구나 충전 가능해지는 보안 구멍이었음
                // .requestMatchers(HttpMethod.POST, "/api/wallet/me/charge").permitAll()

                // ✅ 위에 /api/wallet/** 가 authenticated라서 여기 별도 지정 없이도 충전은 인증 필요

                .anyRequest().authenticated()
            )

            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 프론트 주소
        config.setAllowedOrigins(List.of("http://localhost:5173"));

        // 메서드 허용
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // preflight 헤더 허용
        config.setAllowedHeaders(List.of("*"));

        // 프론트가 읽을 헤더 노출
        config.setExposedHeaders(List.of("Authorization"));

        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
