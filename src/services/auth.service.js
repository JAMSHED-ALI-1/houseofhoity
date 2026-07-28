import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { apiClient } from "@/lib/api-client";

export function login(payload) {
  return apiClient.rpc(API_ENDPOINTS.AUTH.LOGIN, payload);
}

export function register(payload) {
  return apiClient.rpc(API_ENDPOINTS.AUTH.REGISTER, payload);
}

export function reactivateAccount(payload) {
  return apiClient.rpc(API_ENDPOINTS.AUTH.REACTIVATE, payload);
}

export function logout() {
  return apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
}

export function getAuthProfile(options) {
  return apiClient.rpc(API_ENDPOINTS.AUTH.PROFILE, {}, options);
}

export function forgotPassword(payload) {
  return apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, payload);
}

export function resetPassword(payload) {
  return apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, payload);
}
