import { optionsResponse, proxyOdooJsonRoute } from "@/lib/odoo-proxy";

export function POST(request) {
  return proxyOdooJsonRoute(request, "/api/payment/transaction", {
    transformRequest(body) {
      const currencyId = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY_ID || 20;
      const params = body?.params || {};
      const amount = Number(String(params.amount ?? "").replace(/[^0-9.]/g, ""));

      return {
        ...body,
        params: {
          ...params,
          currency: params.currency || "INR",
          currency_id: Number(params.currency_id || currencyId),
          ...(Number.isFinite(amount) && amount > 0 ? { amount } : {}),
        },
      };
    },
  });
}

export const OPTIONS = optionsResponse;
