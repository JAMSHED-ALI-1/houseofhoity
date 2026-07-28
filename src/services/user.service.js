import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { apiClient } from "@/lib/api-client";

export function getUserProfile(options) {
  return apiClient.get(API_ENDPOINTS.USERS.PROFILE, options);
}

export function updateUserProfile(payload) {
  return apiClient.patch(API_ENDPOINTS.USERS.UPDATE_PROFILE, payload);
}

export function getUserAddresses(options) {
  return apiClient.get(API_ENDPOINTS.USERS.ADDRESSES, options);
}
