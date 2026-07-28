import { STORAGE_KEYS } from "@/constants/app.constants";

function readStoredUser() {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.USER) || "null");
  } catch {
    return null;
  }
}

function getObjectId(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  if (value && typeof value === "object") {
    return value.id || null;
  }

  return value || null;
}

export function getCustomerContextPayload(user = readStoredUser()) {
  const partnerId =
    user?.partner_id ||
    getObjectId(user?.partner) ||
    getObjectId(user?.commercial_partner_id) ||
    user?.id;
  const login = user?.login || user?.email;

  return {
    ...(partnerId ? { partner_id: partnerId } : {}),
    ...(login ? { login, email: user?.email || login } : {}),
  };
}

export function withCustomerContext(payload = {}, user) {
  return {
    ...getCustomerContextPayload(user),
    ...payload,
  };
}

export function getPricingContextPayload(user = readStoredUser()) {
  const pricelistId =
    user?.pricelist_id ||
    getObjectId(user?.pricelist) ||
    getObjectId(user?.active_pricelist);
  const activePricelist = user?.active_pricelist || {};
  const currencyId = user?.currency_id || activePricelist.currency_id;
  const currency = user?.currency || user?.currency_code || activePricelist.currency || activePricelist.currency_code;

  return {
    ...(pricelistId ? { pricelist_id: pricelistId } : {}),
    ...(currencyId ? { currency_id: currencyId } : {}),
    ...(currency ? { currency, currency_code: currency } : {}),
  };
}

export function withPricingContext(payload = {}, user) {
  return {
    ...getPricingContextPayload(user),
    ...payload,
  };
}
