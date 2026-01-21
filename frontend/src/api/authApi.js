import axios from "axios";

const API_URL = "http://localhost:8080/api/auth";

// 공통 axios instance
const api = axios.create({
  baseURL: API_URL,
});

// JWT 토큰 자동 포함
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 비밀번호 변경 API
export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.post("/change-password", {
    currentPassword,
    newPassword,
  });
  return response.data;
};

// 로그인 API
export const login = async (username, password) => {
  const response = await api.post("/login", { username, password });
  return response.data;
};

// 회원가입 API
export const signup = async (username, password) => {
  const response = await api.post("/signup", { username, password });
  return response.data;
};

// 아이디 중복 체크
export const checkUsername = async (username) => {
  const response = await api.get(`/check-username?username=${username}`);
  return response.data;
};

//주소 저장 
export const updateLocation = async (latitude, longitude, address,detailAddress) => {
  return api.post("/update-location", {
    latitude,
    longitude,
    address,
    detailAddress,
  });
};

// 현재 사용자 정보 조회 API
export const getMyInfo = async () => {
  const response = await api.get("/me");
  return response.data;
};
