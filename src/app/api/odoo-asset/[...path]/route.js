import { BASE_URL } from "@/types/API_URL";

const ODOO_BASE_URL = BASE_URL.replace(/\/+$/g, "");

const ALLOWED_ASSET_PREFIXES = [
  "payment_",
  "razorpay_payment/",
  "web/",
  "website/image/",
];

function isAllowedAssetPath(path) {
  return ALLOWED_ASSET_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export async function GET(_request, context) {
  const params = await context.params;
  const assetPath = Array.isArray(params?.path) ? params.path.join("/") : "";
  const proxiedAssetPath = assetPath.replace(/\/full_quality_image$/i, "/image_1024");

  if (!assetPath || assetPath.includes("..") || !isAllowedAssetPath(assetPath)) {
    return Response.json({ error: "Asset path is not allowed" }, { status: 400 });
  }

  const response = await fetch(`${ODOO_BASE_URL}/${proxiedAssetPath}`, {
    next: { revalidate: 3600 },
  });
  const headers = new Headers();
  const contentType = response.headers.get("content-type");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
