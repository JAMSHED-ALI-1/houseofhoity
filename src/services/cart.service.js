import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { apiClient } from "@/lib/api-client";
import { normalizeProduct } from "@/services/product.service";

function getPayload(response) {
  const payload = response?.result || response || {};

  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}

function getCartLines(cart = {}) {
  if (Array.isArray(cart)) return cart;
  if (Array.isArray(cart.items)) return cart.items;
  if (Array.isArray(cart.lines)) return cart.lines;
  if (Array.isArray(cart.order_line)) return cart.order_line;
  if (Array.isArray(cart.order_lines)) return cart.order_lines;
  return [];
}

function hasCartLinePayload(cart = {}, payload = {}) {
  return [cart, payload].some((source) => (
    Array.isArray(source.items) ||
    Array.isArray(source.lines) ||
    Array.isArray(source.order_line) ||
    Array.isArray(source.order_lines)
  ));
}

function isDeliveryLine(line = {}) {
  const displayType = String(line.display_type || line.line_type || line.type || "").toLowerCase();
  const name = String(line.name || line.product_name || line.product_id?.name || line.product?.name || "").toLowerCase();

  return Boolean(
    line.is_delivery ||
      line.delivery_line ||
      line.is_delivery_line ||
      line.is_shipping ||
      line.shipping_line ||
      line.carrier_id ||
      line.delivery_id ||
      displayType.includes("delivery") ||
      displayType.includes("shipping") ||
      name.includes("delivery") ||
      name.includes("shipping"),
  );
}

function isCouponLine(line = {}) {
  const displayType = String(line.display_type || line.line_type || line.type || "").toLowerCase();
  const name = String(line.name || line.product_name || line.product_id?.name || line.product?.name || "").toLowerCase();

  return Boolean(
    line.is_reward_line ||
      line.reward_line ||
      line.is_coupon_line ||
      line.coupon_line ||
      line.coupon_id ||
      line.program_id ||
      line.reward_id ||
      displayType.includes("coupon") ||
      displayType.includes("reward") ||
      name.includes("coupon") ||
      name.includes("voucher") ||
      name.includes("discount"),
  );
}

function normalizeCartLine(line = {}) {
  const productPayload = line.product || line.product_id || line;
  const productId = productPayload?.id || line.product_id?.id || line.product_id;
  const product = normalizeProduct({
    ...productPayload,
    id: Array.isArray(productId) ? productId[0] : productId,
    name: productPayload?.name || line.name || line.product_name,
    price: line.price_unit || line.price || line.amount || productPayload?.price,
    currency_symbol: line.currency_symbol || productPayload?.currency_symbol,
    image: line.image || line.image_url || productPayload?.image || productPayload?.image_url,
  });

  return {
    ...product,
    lineId: line.line_id || line.id,
    cartKey: [
      line.line_id || line.id || product.id,
      line.selected_size || line.size || product.selectedSize || "",
      line.selected_color || line.color || product.selectedColor || "",
    ].join("__"),
    quantity: Number(line.quantity || line.product_uom_qty || line.qty || 1),
    priceSubtotal: Number(line.price_subtotal || 0),
    priceTotal: Number(line.price_total || line.price_subtotal || 0),
  };
}

function getNumber(...values) {
  const value = values.find((item) => item !== undefined && item !== null && item !== "");
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getCurrencySymbol(cart = {}, payload = {}, items = []) {
  return (
    cart.currency_symbol ||
    payload.currency_symbol ||
    cart.pricelist_currency_symbol ||
    payload.pricelist_currency_symbol ||
    cart.currency?.symbol ||
    payload.currency?.symbol ||
    items.find((item) => item.currency_symbol)?.currency_symbol ||
    "₹"
  );
}

export function normalizeCartResponse(response) {
  const payload = getPayload(response);
  const cart = payload.cart || payload.order || payload;
  const rawCartLines = getCartLines(cart);
  const deliveryLines = rawCartLines.filter(isDeliveryLine);
  const items = rawCartLines.filter((line) => !isDeliveryLine(line) && !isCouponLine(line)).map(normalizeCartLine);
  const amountUntaxed = getNumber(cart.amount_untaxed, payload.amount_untaxed);
  const amountTax = getNumber(cart.amount_tax, payload.amount_tax);
  const amountTotal = getNumber(cart.amount_total, payload.amount_total);
  const deliveryLineTotal = deliveryLines.reduce((total, line) => (
    total + Number(line.price_total ?? line.price_subtotal ?? line.price_unit ?? line.price ?? 0)
  ), 0);
  const deliveryPrice = getNumber(
    cart.delivery_price,
    payload.delivery_price,
    cart.delivery_line?.price_unit,
    cart.delivery_line?.price_total,
    deliveryLineTotal || null,
  );
  const taxLines = Array.isArray(cart.tax_lines)
    ? cart.tax_lines
    : Array.isArray(payload.tax_lines)
      ? payload.tax_lines
      : [];
  const productSubtotal = items.reduce((total, item) => (
    total + Number(item.priceSubtotal || item.priceTotal || 0 || 0)
  ), 0) || items.reduce((total, item) => total + Number(String(item.price || 0).replace(/[^0-9.]/g, "")) * item.quantity, 0);

  return {
    ...payload,
    cart,
    hasLineData: Array.isArray(cart) || hasCartLinePayload(cart, payload),
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: deliveryLines.length > 0 ? productSubtotal : amountUntaxed ?? (items.length === 0 ? 0 : null),
    tax: amountTax ?? (items.length === 0 ? 0 : null),
    delivery: deliveryPrice ?? (items.length === 0 ? 0 : null),
    deliveryCarrier: cart.carrier || payload.carrier || "",
    total: amountTotal ?? (items.length === 0 ? 0 : null),
    currencySymbol: getCurrencySymbol(cart, payload, items),
    taxLines,
  };
}

export async function getCart(options) {
  return normalizeCartResponse(await apiClient.rpc(API_ENDPOINTS.CART.ROOT, {}, options));
}

export async function addCartItem(payload, options) {
  return normalizeCartResponse(await apiClient.rpc(API_ENDPOINTS.CART.ADD, payload, options));
}

export async function updateCartItem(payload, options) {
  return normalizeCartResponse(await apiClient.rpc(API_ENDPOINTS.CART.UPDATE, payload, options));
}

export async function removeCartItem(payload, options) {
  return normalizeCartResponse(await apiClient.rpc(API_ENDPOINTS.CART.REMOVE, payload, options));
}

export async function clearCart(options) {
  return normalizeCartResponse(await apiClient.rpc(API_ENDPOINTS.CART.CLEAR, {}, options));
}

export async function calculateCartTaxes(payload = {}, options) {
  return normalizeCartResponse(await apiClient.rpc(API_ENDPOINTS.CART.TAXES, payload, options));
}

export async function applyCartCoupon(payload = {}, options) {
  return normalizeCartResponse(await apiClient.rpc(API_ENDPOINTS.CART.APPLY_COUPON, payload, options));
}
