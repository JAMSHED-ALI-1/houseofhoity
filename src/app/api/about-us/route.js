import { optionsResponse, proxyOdooJsonRoute } from "@/lib/odoo-proxy";

export function POST(request) {
  return proxyOdooJsonRoute(request, "/api/about-us");
}

export const OPTIONS = optionsResponse;
