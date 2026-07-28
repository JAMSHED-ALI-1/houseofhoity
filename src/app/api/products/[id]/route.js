import { BASE_URL } from "@/types/API_URL";

const PRODUCT_API_BASE_URL = BASE_URL.replace(/\/+$/g, "");

export async function POST(request, context) {
  const { id } = await context.params;
  const body = await request.json();
  const productApiUrl = `${PRODUCT_API_BASE_URL}/api/products/${id}`;

  if (process.env.NODE_ENV === "development") {
    console.info("Product preview API request:", productApiUrl, body);
  }

  const response = await fetch(productApiUrl, {
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
