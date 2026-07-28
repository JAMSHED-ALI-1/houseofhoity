import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { apiClient } from "@/lib/api-client";

function getPayload(response) {
  const payload = response?.result || response || {};

  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}

export function getSiteInfo(payload = {}, options) {
  return apiClient.rpc(API_ENDPOINTS.SITE.INFO, payload, options).then(getPayload);
}
