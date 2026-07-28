import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { apiClient } from "@/lib/api-client";

function unwrapPayload(response) {
  const payload = response?.result || response || {};

  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}

export async function getDeliveryMethods(payload = {}, options) {
  return unwrapPayload(await apiClient.rpc(API_ENDPOINTS.DELIVERY.METHODS, payload, options));
}

export async function applyDeliveryCarrier(payload = {}, options) {
  return unwrapPayload(await apiClient.rpc(API_ENDPOINTS.DELIVERY.APPLY, payload, options));
}

export async function selectDeliveryCarrier(payload = {}, options) {
  return unwrapPayload(await apiClient.rpc(API_ENDPOINTS.DELIVERY.SELECT, payload, options));
}
