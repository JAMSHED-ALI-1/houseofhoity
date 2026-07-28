import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { apiClient } from "@/lib/api-client";

export function getSliders(options) {
  return apiClient.post(API_ENDPOINTS.SLIDERS.ROOT, {
    jsonrpc: "2.0",
    params: {},
  }, options);
}
