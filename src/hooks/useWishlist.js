"use client";

import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/constants/app.constants";
import { useAuthContext } from "@/context/AuthContext";
import * as wishlistService from "@/services/wishlist.service";

function getUserWishlistKey(user) {
  const userId = user?.id || user?.partner_id || user?.uid || user?.email || user?.login;

  return userId ? `${STORAGE_KEYS.WISHLIST}:${userId}` : null;
}

function clearLegacyWishlist() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEYS.WISHLIST);
}

function readWishlist(user) {
  if (typeof window === "undefined") return [];
  const wishlistKey = getUserWishlistKey(user);

  if (!wishlistKey) return [];

  try {
    return JSON.parse(window.localStorage.getItem(wishlistKey) || "[]");
  } catch {
    return [];
  }
}

function saveWishlist(items, user) {
  if (typeof window === "undefined") return;
  const wishlistKey = getUserWishlistKey(user);

  clearLegacyWishlist();

  if (wishlistKey) {
    window.localStorage.setItem(wishlistKey, JSON.stringify(items));
  }

  window.queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent("shop:wishlist-changed", { detail: items }));
  });
}

export function useWishlist() {
  const { user, isAuthenticated } = useAuthContext();
  const [items, setItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);

  const updateItems = useCallback((nextItems) => {
    setItems(nextItems);
    saveWishlist(nextItems, user);
  }, [user]);

  const syncWishlistItems = useCallback((response, { allowEmpty = true } = {}) => {
    if (Array.isArray(response?.items) && (response.items.length > 0 || allowEmpty)) {
      updateItems(response.items);
    }
  }, [updateItems]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedItems = readWishlist(user);

      if (storedItems.length > 0) {
        setItems(storedItems);
      }
    }, 0);

    function syncStoredWishlist(event) {
      setItems(Array.isArray(event.detail) ? event.detail : readWishlist(user));
    }

    window.addEventListener("shop:wishlist-changed", syncStoredWishlist);
    window.addEventListener("storage", syncStoredWishlist);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("shop:wishlist-changed", syncStoredWishlist);
      window.removeEventListener("storage", syncStoredWishlist);
    };
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) {
      const timeoutId = window.setTimeout(() => {
        setItems([]);
        setError(null);
        saveWishlist([], null);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    const controller = new AbortController();

    async function loadWishlist() {
      try {
        const response = await wishlistService.getWishlist({ signal: controller.signal });
        if (!controller.signal.aborted) {
          syncWishlistItems(response, { allowEmpty: true });
        }
      } catch (requestError) {
        if (requestError.code !== "REQUEST_ABORTED") {
          setError(requestError);
        }
      }
    }

    loadWishlist();

    return () => {
      controller.abort();
    };
  }, [isAuthenticated, syncWishlistItems]);

  const toggleWishlist = useCallback(async (product) => {
    if (!isAuthenticated) {
      setItems([]);
      setError(new Error("Please log in to use wishlist."));
      return null;
    }

    const productId = String(product.id || product.product_id || "");
    const savedItem = items.find((item) => String(item.id) === productId || String(item.product_id) === productId);
    const isAlreadySaved = Boolean(savedItem);
    const previousItems = items;

    setItems((currentItems) => {
      const exists = currentItems.some((item) => String(item.id) === productId || String(item.product_id) === productId);
      const nextItems = exists
        ? currentItems.filter((item) => String(item.id) !== productId && String(item.product_id) !== productId)
        : [...currentItems, product];

      saveWishlist(nextItems, user);
      return nextItems;
    });

    setIsSyncing(true);
    setError(null);

    try {
      const response = isAlreadySaved
        ? await wishlistService.removeWishlistItem({
            product_id: productId,
            wishlist_id: savedItem?.wishlistId,
            id: savedItem?.wishlistId,
          })
        : await wishlistService.addWishlistItem({
            product_id: productId,
          });
      syncWishlistItems(response, { allowEmpty: true });
      return response;
    } catch (requestError) {
      setError(requestError);
      updateItems(previousItems);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, items, syncWishlistItems, updateItems, user]);

  const isInWishlist = useCallback((productId) => (
    isAuthenticated && items.some((item) => String(item.id) === String(productId) || String(item.product_id) === String(productId))
  ), [isAuthenticated, items]);

  return {
    items,
    count: items.length,
    isSyncing,
    error,
    isInWishlist,
    toggleWishlist,
  };
}
