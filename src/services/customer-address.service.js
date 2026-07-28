import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { apiClient } from "@/lib/api-client";
import { withCustomerContext } from "@/lib/customer-context";

function unwrapPayload(response) {
  const payload = response?.result || response || {};

  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}

export async function getCustomerAddresses(payload, options) {
  const response = await apiClient.rpc(
    API_ENDPOINTS.CUSTOMER.ADDRESSES.LIST,
    withCustomerContext(payload),
    options,
  );

  return unwrapPayload(response);
}

export async function createCustomerAddress(payload, options) {
  const response = await apiClient.rpc(
    API_ENDPOINTS.CUSTOMER.ADDRESSES.CREATE,
    withCustomerContext(payload),
    options,
  );

  return unwrapPayload(response);
}

export async function updateCustomerAddress(payload, options) {
  const response = await apiClient.rpc(
    API_ENDPOINTS.CUSTOMER.ADDRESSES.UPDATE,
    withCustomerContext(payload),
    options,
  );

  return unwrapPayload(response);
}
