// src/utils/bucket.js
// 위도/경도 -> 버킷ID(정수)로 변환
// gridDeg: 격자 크기(도). 0.01 ≈ 1.1km(위도 기준)
export function calcBucketId(lat, lng, gridDeg = 0.01) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("lat/lng must be finite numbers");
  }

  // 위도: -90 ~ 90, 경도: -180 ~ 180
  // 음수 방지 offset
  const LAT_OFFSET = 90;
  const LNG_OFFSET = 180;

  const latIndex = Math.floor((lat + LAT_OFFSET) / gridDeg);
  const lngIndex = Math.floor((lng + LNG_OFFSET) / gridDeg);

  // 두 인덱스를 하나의 정수로 합치기
  // latIndex가 충분히 큰 범위라도 충돌 안 나게 multiplier 크게 잡음
  const MULT = 1_000_000; // gridDeg=0.01 기준으로도 충분히 여유
  return latIndex * MULT + lngIndex;
}
