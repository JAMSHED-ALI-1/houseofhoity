import { BASE_URL } from "@/types/API_URL";

const CATEGORY_API_URL = `${BASE_URL.replace(/\/+$/g, "")}/api/categories`;

export async function POST(request) {
  const body = await request.json();

  if (process.env.NODE_ENV === "development") {
    console.info("Category API request:", CATEGORY_API_URL, body);
  }

  const response = await fetch(CATEGORY_API_URL, {
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
