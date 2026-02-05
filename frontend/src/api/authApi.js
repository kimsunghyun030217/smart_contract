// src/api/authApi.js
import { http } from "./http";

const API_URL = "/api/auth";

// 비밀번호 변경
export const changePassword = async (currentPassword, newPassword) => {
  const { data } = await http.post(`${API_URL}/change-password`, {
    currentPassword,
    newPassword,
  });
  return data;
};

// 로그인 (여긴 401이면 그냥 에러로 떨어지는 게 보통이라, http 써도 OK)
export const login = async (username, password) => {
  const { data } = await http.post(`${API_URL}/login`, { username, password });
  return data;
};

// 회원가입
export const signup = async (username, password) => {
  const { data } = await http.post(`${API_URL}/signup`, { username, password });
  return data;
};

// 아이디 중복 체크
export const checkUsername = async (username) => {
  const { data } = await http.get(`${API_URL}/check-username`, {
    params: { username },
  });
  return data;
};

// 주소 저장
export const updateLocation = async (latitude, longitude, address, detailAddress) => {
  const { data } = await http.post(`${API_URL}/update-location`, {
    latitude,
    longitude,
    address,
    detailAddress,
  });
  return data;
};

// 내 정보
export const getMyInfo = async () => {
  const { data } = await http.get(`${API_URL}/me`);
  return data;
};
