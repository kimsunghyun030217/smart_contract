// src/api/naverApi.js

export const getCoordinates = async (address) => {
  console.log("🔍 전달되는 주소:", address);

  try {
    // ✅ 주소를 URL 인코딩
    const encodedAddress = encodeURIComponent(address);
    console.log("🔍 인코딩된 주소:", encodedAddress);

    const response = await fetch(
      `http://localhost:8080/api/naver-geocoding?address=${encodedAddress}`
    );

    console.log("📊 응답 상태:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ 에러 응답:", errorData);
      throw new Error(errorData.error || "주소 검색 실패");
    }

    const data = await response.json();
    console.log("✅ 네이버 API 응답:", data);

    // 네이버 응답 규칙
    if (data.addresses && data.addresses.length > 0) {
      const addr = data.addresses[0];

      const result = {
        latitude: addr.y,
        longitude: addr.x,
        fullAddress: addr.roadAddress || addr.jibunAddress
      };

      console.log("✅ 파싱된 결과:", result);
      return result;
    }

    console.warn("⚠️ 주소를 찾을 수 없습니다");
    return null;

  } catch (error) {
    console.error("❌ 네이버 Geocoding 에러:", error);
    throw error;
  }
};
