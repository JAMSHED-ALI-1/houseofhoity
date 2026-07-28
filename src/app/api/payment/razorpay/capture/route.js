import { optionsResponse, proxyOdooJsonRoute } from "@/lib/odoo-proxy";

export function POST(request) {
  return proxyOdooJsonRoute(request, "/api/payment/razorpay/capture", {
    transformRequest(body) {
      const params = body?.params || {};
      const txnId = params.txn_id || params.txnid || params.razorpay_payment_id || params.payment_id;

      return {
        ...body,
        params: {
          ...params,
          ...(txnId ? {
            txn_id: txnId,
            txnid: txnId,
            payment_id: txnId,
          } : {}),
          reference: params.reference || params.order_reference || params.txnid || "",
        },
      };
    },
  });
}

export const OPTIONS = optionsResponse;
