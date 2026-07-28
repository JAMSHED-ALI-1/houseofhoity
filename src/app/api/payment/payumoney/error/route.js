import { handlePayumoneyCallback } from "@/lib/payumoney-callback";

export function POST(request) {
  return handlePayumoneyCallback(request, "/payment/payumoney/error", "failed");
}

export function GET(request) {
  return handlePayumoneyCallback(request, "/payment/payumoney/error", "failed");
}
