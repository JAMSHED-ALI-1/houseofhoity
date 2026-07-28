import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { apiClient } from "@/lib/api-client";

export function getCategories(options) {
  return apiClient.post(API_ENDPOINTS.CATEGORIES.ROOT, {
    jsonrpc: "2.0",
    params: {},
  }, options);
}

export function getCategoryById(id, options) {
  return apiClient.get(API_ENDPOINTS.CATEGORIES.BY_ID(id), options);
}
