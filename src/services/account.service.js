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

export async function getCustomerProfile(payload = {}, options) {
  const response = await apiClient.rpc(API_ENDPOINTS.CUSTOMER.PROFILE, withCustomerContext(payload), options);

  return unwrapPayload(response);
}

export async function getCustomerAccount(payload = {}, options) {
  const response = await apiClient.rpc(API_ENDPOINTS.CUSTOMER.ACCOUNT, withCustomerContext(payload), options);

  return unwrapPayload(response);
}

export async function saveCustomerAccount(payload = {}, options) {
  const response = await apiClient.rpc(
    API_ENDPOINTS.CUSTOMER.ACCOUNT,
    withCustomerContext({ updatedData: payload }),
    options,
  );

  return unwrapPayload(response);
}

export async function getCustomerCoupons(payload = {}, options) {
  const response = await apiClient.rpc(API_ENDPOINTS.CUSTOMER.COUPONS, withCustomerContext(payload), options);

  return unwrapPayload(response);
}

export async function getCustomerInvoices(payload = {}, options) {
  const response = await apiClient.rpc(API_ENDPOINTS.CUSTOMER.INVOICES, withCustomerContext(payload), options);

  return unwrapPayload(response);
}

export async function getCountries(payload = {}, options) {
  const response = await apiClient.rpc(API_ENDPOINTS.CUSTOMER.COUNTRIES, payload, options);

  return unwrapPayload(response);
}

export async function getStates(payload = {}, options) {
  const response = await apiClient.rpc(API_ENDPOINTS.CUSTOMER.STATES, payload, options);

  return unwrapPayload(response);
}
