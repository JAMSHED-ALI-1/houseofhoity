import { BASE_URL } from "@/types/API_URL";

const PRODUCT_API_URL = `${BASE_URL.replace(/\/+$/g, "")}/products/data`;

export async function POST(request) {
  const body = await request.json();

  if (process.env.NODE_ENV === "development") {
    console.info("Product API request:", PRODUCT_API_URL, body);
  }

  const response = await fetch(PRODUCT_API_URL, {
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
