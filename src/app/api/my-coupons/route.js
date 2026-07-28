import { optionsResponse, proxyOdooJsonRoute } from "@/lib/odoo-proxy";

export function POST(request) {
  return proxyOdooJsonRoute(request, "/api/my-coupons");
}

export const OPTIONS = optionsResponse;
