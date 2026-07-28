"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getProducts } from "@/services/product.service";

export function useProducts(params = {}, options = {}) {
  const { enabled = true, initialData = [] } = options;
  const initialLimit = Number(params.limit || initialData.length || 10);
  const [products, setProducts] = useState(initialData);
  const [pagination, setPagination] = useState({
    page: Number(params.page || 1),
    limit: initialLimit,
    total: initialData.length,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(enabled && initialData.length === 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const fetchProducts = useCallback(async (requestOptions = {}) => {
    const {
      append = false,
      params: nextParams = {},
      ...apiOptions
    } = requestOptions;

    await Promise.resolve();
    if (apiOptions.signal?.aborted) return null;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await getProducts({
        ...JSON.parse(paramsKey),
        ...nextParams,
      }, apiOptions);
      if (apiOptions.signal?.aborted) return null;

      let nextProductCount = response.items.length;

      setProducts((currentProducts) => {
        const nextProducts = append ? [...currentProducts, ...response.items] : response.items;
        nextProductCount = nextProducts.length;

        return nextProducts;
      });
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        hasMore: response.items.length > 0 && (nextProductCount < response.total || response.items.length >= response.limit),
      });
      return response;
    } catch (requestError) {
      if (requestError.code === "REQUEST_ABORTED") {
        return null;
      }

      setError(requestError);

      if (initialData.length > 0) {
        setProducts(initialData);
      }

      return null;
    } finally {
      if (!apiOptions.signal?.aborted) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [initialData, paramsKey]);

  const loadMore = useCallback((requestOptions = {}) => {
    return fetchProducts({
      ...requestOptions,
      append: true,
      params: {
        ...(requestOptions.params || {}),
        page: pagination.page + 1,
        limit: pagination.limit,
      },
    });
  }, [fetchProducts, pagination.limit, pagination.page]);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      fetchProducts({ signal: controller.signal });
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [enabled, fetchProducts]);

  return {
    products,
    pagination,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    refetch: fetchProducts,
  };
}
