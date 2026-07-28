import { optionsResponse, proxyOdooJsonRoute } from "@/lib/odoo-proxy";

function getFrontendOrigin(request) {
  const configuredOrigin = (
    process.env.NEXT_PUBLIC_FRONTEND_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).replace(/\/+$/g, "");

  return configuredOrigin || new URL(request.url).origin;
}

export function POST(request) {
  return proxyOdooJsonRoute(request, "/api/customer/register", {
    forwardFrontendOrigin: true,
    transformRequest(body) {
      const frontendOrigin = getFrontendOrigin(request);
      const activationBaseUrl = `${frontendOrigin}/home/activate`;
      const params = body?.params && typeof body.params === "object" ? body.params : {};

      return {
        ...body,
        params: {
          ...params,
          base_url: frontendOrigin,
          website_url: frontendOrigin,
          web_base_url: frontendOrigin,
          request_base_url: frontendOrigin,
          frontend_base_url: frontendOrigin,
          frontend_url: frontendOrigin,
          activation_base_url: frontendOrigin,
          activation_path: "/home/activate",
          activation_url: activationBaseUrl,
          frontend_activation_url: activationBaseUrl,
          customer_activation_url: activationBaseUrl,
        },
      };
    },
    transformResponse(text) {
      try {
        const data = JSON.parse(text);
        const result = data?.result;
        const userId = result?.user_id;

        if (!userId) {
          return text;
        }

        const frontendOrigin = getFrontendOrigin(request);
        const activationUrl = `${frontendOrigin}/home/activate/${encodeURIComponent(userId)}`;

        return JSON.stringify({
          ...data,
          result: {
            ...result,
            activation_url: activationUrl,
            frontend_activation_url: activationUrl,
          },
        });
      } catch {
        return text;
      }
    },
  });
}

export const OPTIONS = optionsResponse;
