import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { apiClient } from "@/lib/api-client";

export function getPaymentGateways(payload) {
  return apiClient.rpc(API_ENDPOINTS.PAYMENTS.GATEWAYS, payload);
}

export function createPaymentTransaction(payload) {
  return apiClient.rpc(API_ENDPOINTS.PAYMENTS.TRANSACTION, payload);
}

export function validatePayment(payload) {
  return apiClient.rpc(API_ENDPOINTS.PAYMENTS.VALIDATE, payload);
}
