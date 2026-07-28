import { handlePayumoneyCallback } from "@/lib/payumoney-callback";

export function POST(request) {
  return handlePayumoneyCallback(request, "/payment/payumoney/cancel", "cancelled");
}

export function GET(request) {
  return handlePayumoneyCallback(request, "/payment/payumoney/cancel", "cancelled");
}
