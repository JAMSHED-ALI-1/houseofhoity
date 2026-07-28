import { optionsResponse, proxyOdooJsonRoute } from "@/lib/odoo-proxy";

export async function POST(request) {
  return proxyOdooJsonRoute(request, "/api/site-info");
}

export function OPTIONS() {
  return optionsResponse();
}
