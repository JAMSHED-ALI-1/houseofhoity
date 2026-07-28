import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { API_CONFIG } from "@/constants/app.constants";
import { apiClient } from "@/lib/api-client";
import { withPricingContext } from "@/lib/customer-context";

export function formatProductCurrency(value, currencySymbol = "₹") {
  const number = Number(String(value || 0).replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(number)) {
    return String(value || `${currencySymbol}0.00`);
  }

  return `${currencySymbol || "₹"}${number.toFixed(2)}`;
}

function getFirstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function buildOdooImageProxyUrl(imageUrl) {
  if (typeof imageUrl !== "string" || !imageUrl) {
    return imageUrl;
  }

  try {
    const url = imageUrl.startsWith("/") ? new URL(imageUrl, "http://odoo.local") : new URL(imageUrl);

    if (url.pathname.startsWith("/website/image/")) {
      return `/api/odoo-asset${url.pathname}`;
    }
  } catch {
    if (imageUrl.startsWith("website/image/")) {
      return `/api/odoo-asset/${imageUrl}`;
    }
  }

  return imageUrl;
}

function normalizeImage(image) {
  const imageUrl = typeof image === "string"
    ? image
    : getFirstValue(image?.url, image?.image, image?.image_url, image?.src);

  return buildOdooImageProxyUrl(imageUrl);
}

function formatAmount(value) {
  const number = Number(String(value || "").replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(number) || number <= 0) {
    return "";
  }

  return number % 1 === 0 ? `$${number}` : `$${number.toFixed(2)}`;
}

function normalizeShippingMessage(source = {}) {
  const message = getFirstValue(
    source.shippingMessage,
    source.shipping_message,
    source.free_shipping_message,
    source.delivery_message,
    source.banner_subtitle,
    source.subtitle,
  );

  if (message) {
    return String(message);
  }

  const threshold = getFirstValue(
    source.free_shipping_threshold,
    source.free_shipping_minimum,
    source.free_shipping_min_order_amount,
    source.shipping_threshold,
    source.shipping_minimum,
  );
  const formattedThreshold = formatAmount(threshold);

  return formattedThreshold ? `Free Shipping for standard order over ${formattedThreshold}` : "";
}

function normalizeEcommerceCategory(source = {}) {
  return getFirstValue(
    source.ecommerceCategory,
    source.ecommerce_category,
    source.ecommerce_category_name,
    source.website_category,
    source.website_category_name,
  );
}

function normalizeOption(option, keys = []) {
  if (typeof option === "string" || typeof option === "number") {
    return String(option);
  }

  return getFirstValue(...keys.map((key) => option?.[key]), option?.name, option?.label, option?.value);
}

function isAvailableOption(option) {
  if (!option || typeof option !== "object") {
    return true;
  }

  return option.available !== false && option.active !== false && option.visible !== false;
}

function normalizeAttributeLineSizes(attributeLines = []) {
  if (!Array.isArray(attributeLines)) {
    return [];
  }

  const sizeLine = attributeLines.find((line) => Array.isArray(line.values) && line.values.length > 0);

  if (!sizeLine) {
    return [];
  }

  return sizeLine.values
    .filter(isAvailableOption)
    .map((value) => value?.name)
    .filter(Boolean);
}

function normalizeAttributeColors(attributes = []) {
  if (!Array.isArray(attributes)) {
    return [];
  }

  return attributes
    .map((attribute) => attribute?.html_color)
    .filter((color) => typeof color === "string" && color);
}

export function cleanProductTitle(value) {
  return String(value || "")
    .replace(/^\s*\[[^\]]*]\s*/g, "")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeProduct(product = {}) {
  const id = getFirstValue(product.id, product.product_id, product.slug, product.name);
  const currencySymbol = getFirstValue(product.currency_symbol, product.currency?.symbol, "₹");
  const price = getFirstValue(product.price, product.list_price, product.sale_price, product.amount, 0);
  const oldPrice = getFirstValue(product.oldPrice, product.old_price, product.compare_at_price, product.mrp_data, product.mrp);
  const image = getFirstValue(product.image, product.image_url, product.imageUrl, product.thumbnail, product.main_image);
  const imageList = getFirstValue(product.images, product.image_ids, product.product_images, product.gallery, []);
  const colors = getFirstValue(product.colors, product.color_options, product.available_colors, product.product_colors, []);
  const sizes = getFirstValue(product.sizes, product.size_options, product.available_sizes, product.product_sizes, product.variants, []);
  const variantImages = Array.isArray(product.available_variants)
    ? product.available_variants.flatMap((variant) => [variant.image, variant.image_url, ...(Array.isArray(variant.images) ? variant.images : [])])
    : [];
  const normalizedImages = [
    ...(Array.isArray(imageList) ? imageList : []),
    ...variantImages,
  ].map(normalizeImage).filter(Boolean);
  const normalizedVariants = Array.isArray(product.available_variants)
    ? product.available_variants.map((variant) => ({
        ...variant,
        image: normalizeImage(variant.image),
        image_url: normalizeImage(variant.image_url),
        image_path: normalizeImage(variant.image_path),
        images: Array.isArray(variant.images) ? variant.images.map(normalizeImage).filter(Boolean) : variant.images,
      }))
    : product.available_variants;
  const normalizedColors = Array.isArray(colors)
    ? colors.filter(isAvailableOption).map((color) => normalizeOption(color, ["hex", "code", "color", "color_code"])).filter(Boolean)
    : [];
  const normalizedSizes = Array.isArray(sizes)
    ? sizes.filter(isAvailableOption).map((size) => normalizeOption(size, ["size", "size_name", "attribute_value", "display_name"])).filter(Boolean)
    : [];
  const attributeLineSizes = normalizeAttributeLineSizes(product.attribute_lines);
  const attributeColors = normalizeAttributeColors([
    ...(Array.isArray(product.attributes) ? product.attributes : []),
    ...(Array.isArray(product.variant_attributes) ? product.variant_attributes : []),
  ]);

  const title = getFirstValue(product.title, product.name, product.product_name, "Untitled Product");

  return {
    ...product,
    id: id === undefined || id === null ? "" : String(id),
    title: cleanProductTitle(title) || title,
    image: normalizeImage(image) || normalizedImages[0] || "/placeholder-product.png",
    images: normalizedImages.length > 0 ? normalizedImages : [normalizeImage(image) || "/placeholder-product.png"],
    image_path: normalizeImage(product.image_path),
    image_paths: Array.isArray(product.image_paths) ? product.image_paths.map(normalizeImage).filter(Boolean) : product.image_paths,
    oldPrice: oldPrice ? formatProductCurrency(oldPrice, currencySymbol) : undefined,
    price: formatProductCurrency(price, currencySymbol),
    description: getFirstValue(product.description, product.short_description, product.summary, product.details, ""),
    ecommerceCategory: normalizeEcommerceCategory(product),
    stock: Number(getFirstValue(product.stock, product.qty_available, product.quantity_on_hand, product.forecasted_quantity, product.quantity, product.available_quantity, product.inventory, 1)),
    sizes: attributeLineSizes.length > 0 ? attributeLineSizes : normalizedSizes.length > 0 ? normalizedSizes : ["Free Size"],
    colors: attributeColors.length > 0 ? attributeColors : normalizedColors.length > 0 ? normalizedColors : [],
    available_variants: normalizedVariants,
  };
}

function normalizeProductList(response) {
  const items = Array.isArray(response)
    ? response
    : response?.products || response?.items || response?.data || response?.records || [];

  return {
    items: items.map(normalizeProduct),
    page: Number(response?.page || API_CONFIG.DEFAULT_PAGE),
    limit: Number(response?.limit || response?.offset || API_CONFIG.DEFAULT_LIMIT),
    total: Number(response?.total || response?.count || items.length),
    raw: response,
  };
}

function getCategoryProductPayload(response) {
  return response?.result || response?.data || response || {};
}

function getCategoryProducts(payload, categoryId) {
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.products)) return payload.data.products;
  if (Array.isArray(payload?.category?.products)) return payload.category.products;
  if (Array.isArray(payload?.selected_category?.products)) return payload.selected_category.products;

  const categories = getCategoryListFromProductPayload(payload);
  const categoryWithProducts = categories.find((category) => String(category.id || category.category_id) === String(categoryId) && Array.isArray(category.products))
    || categories.find((category) => Array.isArray(category.products));

  return categoryWithProducts?.products || [];
}

function getCategoryListFromProductPayload(payload) {
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.data?.categories)) return payload.data.categories;
  if (Array.isArray(payload?.result?.categories)) return payload.result.categories;
  if (Array.isArray(payload?.category_list)) return payload.category_list;

  return [];
}

function normalizeCategory(category = {}) {
  const id = getFirstValue(category.id, category.category_id, category.slug);

  return {
    ...category,
    id: id === undefined || id === null ? "" : String(id),
    name: getFirstValue(category.name, category.title, category.label, "Collection"),
    image: normalizeImage(getFirstValue(category.image, category.image_url, category.thumbnail, category.banner_image)),
    ecommerceCategory: normalizeEcommerceCategory(category),
    shippingMessage: normalizeShippingMessage(category),
    parentId: getFirstValue(category.parent_id, category.parentId),
    visible: category.visible !== false,
  };
}

export async function getProducts(params = {}, options = {}) {
  try {
    const response = await apiClient.rpc(API_ENDPOINTS.PRODUCTS.DATA, withPricingContext({
      page: params.page || API_CONFIG.DEFAULT_PAGE,
      limit: params.limit || API_CONFIG.DEFAULT_LIMIT,
      ...params,
    }), options);

    return normalizeProductList(response);
  } catch (error) {
    console.error("Product API Error:", error);
    throw error;
  }
}

export async function getProductsByCategory(params = {}, options = {}) {
  const {
    categoryLimit = 200,
    productLimit = API_CONFIG.DEFAULT_LIMIT,
    categoryId,
    ...restParams
  } = params;
  const response = await apiClient.post(API_ENDPOINTS.PRODUCTS.BY_CATEGORY, {
    jsonrpc: "2.0",
    params: withPricingContext({
      category_limit: categoryLimit,
      product_limit: productLimit,
      category_id: Number(categoryId),
      ...restParams,
    }),
  }, options);
  const payload = getCategoryProductPayload(response);
  const categories = getCategoryListFromProductPayload(payload).map(normalizeCategory);
  const products = getCategoryProducts(payload, categoryId).map(normalizeProduct);
  const selectedCategory = normalizeCategory(
    payload?.category
      || payload?.selected_category
      || categories.find((category) => String(category.id) === String(categoryId))
      || {},
  );

  return {
    products,
    categories,
    selectedCategory,
    total: Number(payload?.total || payload?.count || payload?.product_count || products.length),
    raw: response,
  };
}

export async function getProductById(id, options = {}) {
  const { params = {}, ...requestOptions } = options;
  const response = await apiClient.post(API_ENDPOINTS.PRODUCTS.BY_ID(id), {
    jsonrpc: "2.0",
    params: withPricingContext(params),
  }, requestOptions);
  const product = response?.result?.product
    || response?.result?.preview_product
    || response?.result?.data
    || response?.result?.products?.[0]
    || response?.product
    || response?.data
    || response?.result
    || response;

  return normalizeProduct(product);
}

export async function searchProducts(query, params = {}, options = {}) {
  try {
    const response = await apiClient.rpc(API_ENDPOINTS.PRODUCTS.SEARCH, withPricingContext({
      page: params.page || API_CONFIG.DEFAULT_PAGE,
      limit: params.limit || 8,
      ...params,
      q: query,
      search: query,
    }), options);

    return normalizeProductList(response);
  } catch (error) {
    console.error("Product Search API Error:", error);
    throw error;
  }
}
