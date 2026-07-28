import { optionsResponse, proxyOdooJsonRoute } from "@/lib/odoo-proxy";

export function POST(request) {
  return proxyOdooJsonRoute(request, "/api/customer/login");
}

export const OPTIONS = optionsResponse;
