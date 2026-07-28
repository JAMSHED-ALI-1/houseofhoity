import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { apiClient } from "@/lib/api-client";

export function getCareInstructions(payload = {}, options) {
  return apiClient.rpc(API_ENDPOINTS.SUPPORT.CARE_INSTRUCTIONS, payload, options);
}

export function getProductCareInstructions(payload = {}, options) {
  return apiClient.rpc(API_ENDPOINTS.PRODUCTS.CARE_INSTRUCTIONS, payload, options);
}

export function getCustomMeasureOptions(payload = {}, options) {
  return apiClient.rpc(API_ENDPOINTS.SUPPORT.CUSTOM_MEASURES, payload, options);
}
