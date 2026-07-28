"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parsePrice } from "@/lib/products";
import * as cartService from "@/services/cart.service";
import { formatProductCurrency } from "@/services/product.service";

function notifyCartChanged(items) {
  if (typeof window === "undefined") return;
  window.queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent("shop:cart-changed", { detail: items }));
  });
}

function getCartItemKey(item = {}) {
  return [
    item.id,
    item.selectedSize || item.size || "",
    item.selectedColor || item.color || "",
  ].join("__");
}

function getVariantValue(variant = {}, keys = []) {
  const key = keys.find((item) => variant[item] !== undefined && variant[item] !== null && variant[item] !== "");

  if (key) {
    return variant[key];
  }

  const attributes = [
    ...(Array.isArray(variant.attributes) ? variant.attributes : []),
    ...(Array.isArray(variant.variant_attributes) ? variant.variant_attributes : []),
  ];
  const attribute = attributes.find((item) => (
    keys.includes(item?.attribute_name?.toLowerCase?.()) ||
    keys.includes(item?.name?.toLowerCase?.()) ||
    keys.includes(item?.attribute?.toLowerCase?.())
  )) || attributes[0];

  return attribute?.value_name || attribute?.value || attribute?.name || "";
}

function findSelectedVariant(product = {}) {
  const variants = Array.isArray(product.available_variants)
    ? product.available_variants
    : Array.isArray(product.variants)
      ? product.variants
      : [];

  if (!variants.length) return null;

  return variants.find((variant) => {
    const size = String(getVariantValue(variant, ["size", "age", "size_name", "attribute_value", "display_name"]));
    const color = String(getVariantValue(variant, ["color", "color_name", "html_color", "color_code"]));
    const sizeMatches = !product.selectedSize || size === String(product.selectedSize);
    const colorMatches = !product.selectedColor || !color || color === String(product.selectedColor);

    return sizeMatches && colorMatches;
  }) || null;
}

function getVariantProductId(product = {}) {
  const variant = findSelectedVariant(product);
  return variant?.id || variant?.product_variant_id || variant?.product_id || product.variantProductId || product.product_variant_id || product.variant_id || product.id;
}

function hasRemoteCartItems(response) {
  return Array.isArray(response?.items) && response.items.length > 0;
}

const emptyTotals = {
  subtotal: null,
  tax: null,
  delivery: null,
  deliveryCarrier: "",
  currencySymbol: "₹",
  total: null,
  taxLines: [],
};

function hasCartTotals(response = {}) {
  return response.subtotal !== null || response.tax !== null || response.total !== null;
}

export function useCart(initialItems = []) {
  const [items, setItems] = useState(initialItems);
  const [serverTotals, setServerTotals] = useState(emptyTotals);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);

  const updateItems = useCallback((updater) => {
    setItems((currentItems) => {
      const nextItems = typeof updater === "function" ? updater(currentItems) : updater;
      notifyCartChanged(nextItems);
      return nextItems;
    });
  }, []);

  const syncCartItems = useCallback((response) => {
    if (Array.isArray(response?.items) && (response.hasLineData || response.items.length > 0)) {
      updateItems(response.items);
    }

    if (hasCartTotals(response)) {
      setServerTotals({
        subtotal: response.subtotal,
        tax: response.tax,
        delivery: response.delivery,
        deliveryCarrier: response.deliveryCarrier || "",
        currencySymbol: response.currencySymbol || "₹",
        total: response.total,
        taxLines: Array.isArray(response.taxLines) ? response.taxLines : [],
      });
    }
  }, [updateItems]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCart() {
      try {
        const response = await cartService.getCart({ signal: controller.signal });
        if (!controller.signal.aborted) {
          syncCartItems(response);
        }
      } catch (requestError) {
        if (requestError.code !== "REQUEST_ABORTED") {
          setError(requestError);
        }
      }
    }

    loadCart();

    return () => {
      controller.abort();
    };
  }, [syncCartItems]);

  useEffect(() => {
    function syncStoredCart(event) {
      setItems(Array.isArray(event.detail) ? event.detail : []);
    }

    window.addEventListener("shop:cart-changed", syncStoredCart);

    return () => {
      window.removeEventListener("shop:cart-changed", syncStoredCart);
    };
  }, []);

  const addItem = useCallback(async (product, quantity = 1) => {
    const selectedSize = product.selectedSize || product.sizes?.[0] || "Free Size";
    const selectedColor = product.selectedColor || product.colors?.[0] || "";
    let previousItems = [];
    const productForCart = {
      ...product,
      selectedSize,
      selectedColor,
      variantProductId: getVariantProductId({ ...product, selectedSize, selectedColor }),
    };
    const optimisticProductId = productForCart.variantProductId || product.id;
    const optimisticItem = {
      ...productForCart,
      id: optimisticProductId,
      cartKey: getCartItemKey({
        id: optimisticProductId,
        selectedSize,
        selectedColor,
      }),
      quantity,
    };

    setIsSyncing(true);
    setError(null);
    updateItems((currentItems) => {
      previousItems = currentItems;
      const existingItem = currentItems.find((item) => item.cartKey === optimisticItem.cartKey);

      if (existingItem) {
        return currentItems.map((item) => (
          item.cartKey === optimisticItem.cartKey
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ));
      }

      return [...currentItems, optimisticItem];
    });

    try {
      const response = await cartService.addCartItem({
        product_id: productForCart.variantProductId || product.id,
        available_variant_id: productForCart.variantProductId || product.id,
        quantity,
        selected_size: selectedSize,
        selected_color: selectedColor,
      });
      syncCartItems(response);
      return response;
    } catch (requestError) {
      setError(requestError);
      updateItems(previousItems);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [syncCartItems, updateItems]);

  const updateQuantity = useCallback(async (itemKey, quantity) => {
    const currentItem = items.find((item) => item.cartKey === itemKey || item.id === itemKey);
    const productId = currentItem?.variantProductId || currentItem?.id || itemKey;

    setIsSyncing(true);
    setError(null);

    try {
      const response = quantity > 0
        ? await cartService.updateCartItem({
            product_id: productId,
            line_id: currentItem?.lineId,
            cart_line_id: currentItem?.lineId,
            id: currentItem?.lineId,
            quantity,
            set_qty: quantity,
          })
        : await cartService.removeCartItem({
            product_id: productId,
            line_id: currentItem?.lineId,
            cart_line_id: currentItem?.lineId,
            id: currentItem?.lineId,
            quantity: 0,
            set_qty: 0,
          });

      if (Array.isArray(response?.items)) {
        syncCartItems(response);
      } else if (quantity <= 0) {
        updateItems((currentItems) => currentItems.filter((item) => (
          item.cartKey !== itemKey &&
          item.id !== itemKey &&
          item.lineId !== currentItem?.lineId
        )));
        if (items.length <= 1) {
          setServerTotals({ subtotal: 0, tax: 0, delivery: 0, deliveryCarrier: "", currencySymbol: "₹", total: 0, taxLines: [] });
        }
      }

      return response;
    } catch (requestError) {
      setError(requestError);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [items, syncCartItems, updateItems]);

  const clearCart = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    updateItems([]);
    setServerTotals({ subtotal: 0, tax: 0, delivery: 0, deliveryCarrier: "", currencySymbol: "₹", total: 0, taxLines: [] });

    try {
      const response = await cartService.clearCart();

      if (Array.isArray(response?.items)) {
        syncCartItems(response);
      }

      return response;
    } catch (requestError) {
      setError(requestError);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [syncCartItems, updateItems]);

  const applyCoupon = useCallback(async (couponCode) => {
    const code = String(couponCode || "").trim();

    if (!code) {
      return null;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const response = await cartService.applyCartCoupon({
        coupon_code: code,
        promo_voucher: code,
        code,
      });

      syncCartItems(response);
      return response;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setIsSyncing(false);
    }
  }, [syncCartItems]);

  const resetLocalCart = useCallback(() => {
    updateItems([]);
    setServerTotals({ subtotal: 0, tax: 0, delivery: 0, deliveryCarrier: "", currencySymbol: "₹", total: 0, taxLines: [] });
    setError(null);
  }, [updateItems]);

  const count = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);
  const computedSubtotal = useMemo(() => items.reduce((sum, item) => sum + parsePrice(item.price) * item.quantity, 0), [items]);
  const subtotal = serverTotals.subtotal ?? computedSubtotal;
  const tax = serverTotals.tax ?? 0;
  const delivery = serverTotals.delivery ?? 0;
  const total = serverTotals.total ?? subtotal + tax + delivery;
  const currencySymbol = serverTotals.currencySymbol || items.find((item) => item.currency_symbol)?.currency_symbol || "₹";

  return {
    items,
    count,
    subtotal,
    tax,
    delivery,
    deliveryCarrier: serverTotals.deliveryCarrier,
    currencySymbol,
    taxLines: serverTotals.taxLines,
    total,
    formattedTotal: formatProductCurrency(total, currencySymbol),
    isSyncing,
    error,
    addItem,
    updateQuantity,
    clearCart,
    applyCoupon,
    resetLocalCart,
    setItems: updateItems,
  };
}
