import { optionsResponse, proxyOdooJsonRoute } from "@/lib/odoo-proxy";

export async function POST(request) {
  return proxyOdooJsonRoute(request, "/api/my/invoices");
}

export function OPTIONS() {
  return optionsResponse();
}
