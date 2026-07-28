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

function normalizeWishlistItem(item = {}) {
  const productPayload = item.product || item.product_id || item.product_variant_id || item;
  const productId = productPayload?.id || item.product_id?.id || item.product_id || item.product_variant_id || item.product_variant_id?.id || item.id;
  const product = normalizeProduct({
    ...productPayload,
    id: Array.isArray(productId) ? productId[0] : productId,
    name: productPayload?.name || item.name || item.product_name,
    price: item.price || item.price_unit || productPayload?.price,
    image: item.image || item.image_url || productPayload?.image || productPayload?.image_url,
  });

  return {
    ...product,
    product_id: String(product.id),
    wishlistId: item.wishlist_id || item.wishlist_line_id || item.line_id || item.id,
    id: String(product.id),
  };
}

export function normalizeWishlistResponse(response) {
  const payload = getPayload(response);
  const wishlist = Array.isArray(payload.wishlist)
    ? payload.wishlist
    : Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.wishlist_items)
        ? payload.wishlist_items
        : Array.isArray(payload.lines)
          ? payload.lines
          : Array.isArray(payload.products)
            ? payload.products
            : Array.isArray(payload.data)
              ? payload.data
              : [];

  return {
    ...payload,
    items: wishlist.map(normalizeWishlistItem),
  };
}

export async function getWishlist(options) {
  return normalizeWishlistResponse(await apiClient.rpc(API_ENDPOINTS.WISHLIST.ROOT, {}, options));
}

export async function addWishlistItem(payload, options) {
  return normalizeWishlistResponse(await apiClient.rpc(API_ENDPOINTS.WISHLIST.ADD, payload, options));
}

export async function removeWishlistItem(payload, options) {
  return normalizeWishlistResponse(await apiClient.rpc(API_ENDPOINTS.WISHLIST.REMOVE, payload, options));
}
