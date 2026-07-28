import { BASE_URL } from "@/types/API_URL";

const ODOO_BASE_URL = BASE_URL.replace(/\/+$/g, "");

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const setCookie = headers.get("set-cookie");
  return setCookie ? [setCookie] : [];
}

export async function proxyOdooJsonRoute(request, path, options = {}) {
  let body = await request.json().catch(() => ({}));
  const cookie = request.headers.get("cookie");
  const targetUrl = `${ODOO_BASE_URL}${path}`;
  const requestUrl = new URL(request.url);

  if (typeof options.transformRequest === "function") {
    body = options.transformRequest(body, { request, requestUrl });
  }

  if (process.env.NODE_ENV === "development") {
    console.info("Odoo API request:", targetUrl, body);
  }

  const forwardedHeaders = options.forwardFrontendOrigin
    ? {
        "X-Forwarded-Host": request.headers.get("host") || requestUrl.host,
        "X-Forwarded-Proto": requestUrl.protocol.replace(":", ""),
        "X-Forwarded-For": request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
        Origin: requestUrl.origin,
        Referer: requestUrl.origin,
      }
    : {};

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...forwardedHeaders,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  let text = await response.text();
  const responseHeaders = new Headers({
    "Content-Type": response.headers.get("content-type") || "application/json",
  });

  if (typeof options.transformResponse === "function") {
    text = options.transformResponse(text, { request, response });
  }

  getSetCookieHeaders(response.headers).forEach((setCookie) => {
    responseHeaders.append("Set-Cookie", setCookie);
  });

  return new Response(text, {
    status: response.status,
    headers: responseHeaders,
  });
}

export function optionsResponse() {
  return new Response(null, { status: 204 });
}
