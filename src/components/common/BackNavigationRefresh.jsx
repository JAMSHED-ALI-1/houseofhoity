"use client";

import { useEffect } from "react";

export default function BackNavigationRefresh() {
  useEffect(() => {
    function refreshAfterHistoryNavigation() {
      window.setTimeout(() => {
        window.location.reload();
      }, 0);
    }

    function refreshIfRestoredFromCache(event) {
      if (event.persisted) {
        window.location.reload();
      }
    }

    window.addEventListener("popstate", refreshAfterHistoryNavigation);
    window.addEventListener("pageshow", refreshIfRestoredFromCache);

    return () => {
      window.removeEventListener("popstate", refreshAfterHistoryNavigation);
      window.removeEventListener("pageshow", refreshIfRestoredFromCache);
    };
  }, []);

  return null;
}
