export const getCoordinates = async (address) => {
  console.log("전달되는 주소:", address);

  try {
    const response = await fetch(
      `http://localhost:8080/api/naver-geocoding?address=${address}`
    );

    const data = await response.json();

    // 네이버 응답 규칙
    if (data.addresses && data.addresses.length > 0) {
      const addr = data.addresses[0];

      return {
        latitude: addr.y,
        longitude: addr.x,
        fullAddress: addr.roadAddress || addr.jibunAddress
      };
    }

    return null;

  } catch (error) {
    console.error("네이버 Geocoding 에러:", error);
    throw error;
  }
};
