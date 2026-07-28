import { optionsResponse, proxyOdooJsonRoute } from "@/lib/odoo-proxy";

export function POST(request) {
  return proxyOdooJsonRoute(request, "/api/account");
}

export const OPTIONS = optionsResponse;
