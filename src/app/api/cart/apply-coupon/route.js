import { optionsResponse, proxyOdooJsonRoute } from "@/lib/odoo-proxy";

export function POST(request) {
  return proxyOdooJsonRoute(request, "/api/cart/apply-coupon");
}

export const OPTIONS = optionsResponse;
