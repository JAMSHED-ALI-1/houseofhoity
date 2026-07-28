import { BASE_URL } from "@/types/API_URL";

const ODOO_BASE_URL = BASE_URL.replace(/\/+$/g, "");

function getBaseUrl(request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    return `${forwardedProto || "http"}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export async function handlePayumoneyCallback(request, callbackPath, status) {
  const encodedBody = new URLSearchParams();

  if (request.method === "GET") {
    new URL(request.url).searchParams.forEach((value, key) => {
      encodedBody.append(key, value);
    });
  } else {
    const formData = await request.formData();

    formData.forEach((value, key) => {
      encodedBody.append(key, String(value));
    });
  }

  await fetch(`${ODOO_BASE_URL}${callbackPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodedBody.toString(),
    cache: "no-store",
  }).catch(() => null);

  return Response.redirect(`${getBaseUrl(request)}/?payment=${status}`, 303);
}
