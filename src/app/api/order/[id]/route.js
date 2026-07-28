import { optionsResponse, proxyOdooJsonRoute } from "@/lib/odoo-proxy";

export async function POST(request, context) {
  const params = await context.params;

  return proxyOdooJsonRoute(request, `/api/order/${params.id}`);
}

export const OPTIONS = optionsResponse;
