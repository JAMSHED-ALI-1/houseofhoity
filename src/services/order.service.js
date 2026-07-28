import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { apiClient } from "@/lib/api-client";
import { withCustomerContext } from "@/lib/customer-context";

export function getOrders(payload = {}, options) {
  return apiClient.rpc(API_ENDPOINTS.ORDERS.LIST, withCustomerContext(payload), options);
}

export function getOrderById(id, payload = {}, options) {
  return apiClient.rpc(API_ENDPOINTS.ORDERS.BY_ID(id), withCustomerContext(payload), options);
}

export function createOrder(payload) {
  return apiClient.rpc(API_ENDPOINTS.ORDERS.ROOT, payload, { timeout: 60000 });
}
