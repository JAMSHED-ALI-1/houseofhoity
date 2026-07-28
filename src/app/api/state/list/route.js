import { optionsResponse, proxyOdooJsonRoute } from "@/lib/odoo-proxy";

export function POST(request) {
  return proxyOdooJsonRoute(request, "/api/state/list");
}

export const OPTIONS = optionsResponse;
