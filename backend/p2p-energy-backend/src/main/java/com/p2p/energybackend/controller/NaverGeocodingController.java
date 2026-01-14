package com.p2p.energybackend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
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
            System.out.println("=================================================");
            System.out.println(">>>> [요청 데이터 확인]");
            System.out.println("1. 주소 : " + address);
            System.out.println("2. Client ID   : [" + naverClientId + "]");
            System.out.println("3. Client Secret: [" + naverClientSecret + "]");
            System.out.println("=================================================");

            if (naverClientId == null || naverClientSecret == null) {
                throw new RuntimeException("API 키가 설정되지 않았습니다");
            }

            String encoded = URLEncoder.encode(address, StandardCharsets.UTF_8.toString());

            // ✅ 올바른 URL로 수정
            String url = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=" + encoded;

            HttpHeaders headers = new HttpHeaders();
            // ✅ 공식 문서에 따라 소문자로 작성 (대소문자 구분 안 함)
            headers.set("X-NCP-APIGW-API-KEY-ID", naverClientId);
            headers.set("X-NCP-APIGW-API-KEY", naverClientSecret);
            headers.set("Accept", "application/json");  // 공식 문서 권장

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), String.class
            );

            return ResponseEntity.ok(response.getBody());

        } catch (HttpClientErrorException e) {
            System.err.println("❌ HTTP 에러: " + e.getStatusCode());
            System.err.println("❌ 응답: " + e.getResponseBodyAsString());
            
            Map<String, String> error = new HashMap<>();
            error.put("status", e.getStatusCode().toString());
            error.put("error", e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode()).body(error);
            
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
