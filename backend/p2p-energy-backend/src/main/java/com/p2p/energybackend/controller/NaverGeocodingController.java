package com.p2p.energybackend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/naver-geocoding")
@CrossOrigin(origins = "http://localhost:5173")
public class NaverGeocodingController {

    @Value("${naver.client.id}")
    private String naverClientId;

    @Value("${naver.client.secret}")
    private String naverClientSecret;

    @GetMapping
    public ResponseEntity<?> getCoordinates(@RequestParam String address) {

        try {
            System.out.println("\n=================================================");
            System.out.println("🔍 [Geocoding 요청]");
            System.out.println("받은 주소: [" + address + "]");
            System.out.println("주소 길이: " + address.length());
            System.out.println("Client ID: [" + naverClientId + "]");
            System.out.println("Client Secret 존재: " + (naverClientSecret != null && !naverClientSecret.isEmpty()));
            System.out.println("=================================================");

            // 검증
            if (address == null || address.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "주소가 비어있습니다");
                return ResponseEntity.badRequest().body(error);
            }

            if (naverClientId == null || naverClientId.trim().isEmpty() ||
                naverClientSecret == null || naverClientSecret.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "API 키가 설정되지 않았습니다");
                return ResponseEntity.status(500).body(error);
            }

            // ✅ UriComponentsBuilder 사용 (자동 인코딩)
            URI uri = UriComponentsBuilder
                    .fromHttpUrl("https://maps.apigw.ntruss.com/map-geocode/v2/geocode")
                    .queryParam("query", address.trim())
                    .build()
                    .encode()
                    .toUri();

            System.out.println("📤 최종 요청 URI: " + uri.toString());

            // 헤더 설정
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-NCP-APIGW-API-KEY-ID", naverClientId.trim());
            headers.set("X-NCP-APIGW-API-KEY", naverClientSecret.trim());

            System.out.println("📤 헤더 설정 완료");

            // API 호출
            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class
            );

            System.out.println("✅ 네이버 API 응답: " + response.getStatusCode());
            System.out.println("📥 응답 본문: " + response.getBody());
            System.out.println("=================================================\n");

            return ResponseEntity.ok(response.getBody());

        } catch (HttpClientErrorException e) {
            System.err.println("\n❌ HTTP 에러 발생");
            System.err.println("상태 코드: " + e.getStatusCode());
            System.err.println("응답 본문: " + e.getResponseBodyAsString());
            System.err.println("=================================================\n");
            
            Map<String, String> error = new HashMap<>();
            error.put("httpStatus", String.valueOf(e.getStatusCode().value()));
            error.put("error", e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode()).body(error);
            
        } catch (Exception e) {
            System.err.println("\n❌ 예외 발생");
            System.err.println("예외 타입: " + e.getClass().getName());
            System.err.println("예외 메시지: " + e.getMessage());
            e.printStackTrace();
            System.err.println("=================================================\n");
            
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getClass().getSimpleName());
            error.put("message", e.getMessage() != null ? e.getMessage() : "알 수 없는 오류");
            return ResponseEntity.status(500).body(error);
        }
    }
}
