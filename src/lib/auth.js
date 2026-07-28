import { STORAGE_KEYS } from "@/constants/app.constants";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export function setStoredToken(token) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  window.localStorage.removeItem(STORAGE_KEYS.USER);
}
