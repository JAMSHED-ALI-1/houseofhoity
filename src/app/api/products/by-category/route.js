import { BASE_URL } from "@/types/API_URL";

const PRODUCT_BY_CATEGORY_API_URL = `${BASE_URL.replace(/\/+$/g, "")}/api/products/by-category`;

export async function POST(request) {
  const body = await request.json();

  if (process.env.NODE_ENV === "development") {
    console.info("Product by category API request:", PRODUCT_BY_CATEGORY_API_URL, body);
  }

  const response = await fetch(PRODUCT_BY_CATEGORY_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await response.json();

  return Response.json(data, { status: response.status });
}

export function OPTIONS() {
  return new Response(null, { status: 204 });
}
