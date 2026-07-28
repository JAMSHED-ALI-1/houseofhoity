"use client";

import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/constants/app.constants";
import * as authService from "@/services/auth.service";

function readUser() {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.USER) || "null");
  } catch {
    return null;
  }
}

function getPartnerId(value = {}) {
  const partner = value.partner || value.customer || value.user || value;
  const partnerId = value.partner_id || value.customer_id || partner?.partner_id || partner?.id;

  if (Array.isArray(partnerId)) {
    return partnerId[0];
  }

  return partnerId;
}

function isExplicitNonCustomer(value = {}) {
  const partner = value.partner || value.customer || value.user || value;
  const candidates = [value, partner];

  return candidates.some((source) => (
    source?.is_customer === false ||
    source?.customer === false ||
    source?.is_portal_customer === false ||
    source?.customer_rank === 0 ||
    source?.customer_rank === "0"
  ));
}

function assertCustomerLogin(response = {}) {
  if (!response?.uid && !response?.session_id && !response?.token) {
    throw new Error("Invalid login response");
  }

  if (!getPartnerId(response)) {
    throw new Error("Customer account not found");
  }

  if (isExplicitNonCustomer(response)) {
    throw new Error("Only customer accounts can login here");
  }
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setUser(readUser());
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const login = useCallback(async (payload) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(payload);
      if (response?.error) {
        throw new Error(response.error);
      }

      assertCustomerLogin(response);

      const nextUser = response.partner || response.user || response;

      const authUser = {
        ...nextUser,
        uid: response.uid,
        session_id: response.session_id,
        pricelist_id: response.pricelist_id ?? nextUser?.pricelist_id,
        pricelist: response.pricelist ?? nextUser?.pricelist,
        active_pricelist: response.active_pricelist ?? nextUser?.active_pricelist,
        currency_id: response.currency_id ?? nextUser?.currency_id,
        currency: response.currency ?? nextUser?.currency,
        currency_code: response.currency_code ?? nextUser?.currency_code,
        currency_symbol: response.currency_symbol ?? nextUser?.currency_symbol,
      };

      if (typeof window !== "undefined") {
        if (response.token) {
          window.localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
        } else {
          window.localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        }

        window.localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authUser));
      }

      setUser(authUser);
      return response;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        window.localStorage.removeItem(STORAGE_KEYS.USER);
      }

      setUser(null);
    }
  }, []);

  return {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
    login,
    logout,
  };
}
