import { apiClient } from "@/lib/api-client";

function getPagePayload(response = {}) {
  return (
    response.about_us ||
    response.shipping_handling ||
    response.shipping ||
    response.delivery ||
    response.privacy_policy ||
    response.privacy ||
    response.terms_conditions ||
    response.terms_and_conditions ||
    response.terms ||
    response.faq ||
    response.faqs ||
    response.result ||
    response.page ||
    response.data ||
    response
  );
}

function formatFaqItems(items = []) {
  return items
    .map((item, index) => {
      if (typeof item === "string") {
        return item;
      }

      const question = item.question || item.title || item.name || `Question ${index + 1}`;
      const answer = item.answer || item.text || item.description || item.content || "";

      return [question, answer].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function getFaqItems(page = {}) {
  return (
    (Array.isArray(page) ? page : null) ||
    page.faqs ||
    page.faq ||
    page.questions ||
    page.items ||
    page.records ||
    page.data?.faqs ||
    page.data?.faq ||
    page.data?.questions ||
    page.data?.items ||
    page.data?.records ||
    (Array.isArray(page.data) ? page.data : null)
  );
}

export async function getPageContent(endpoint, options = {}) {
  const response = await apiClient.rpc(endpoint, {}, options);
  const page = getPagePayload(response);
  const faqItems = getFaqItems(page);
  const nestedPage = page.data && !Array.isArray(page.data) ? page.data : {};

  return {
    title: page.title || page.name || nestedPage.title || nestedPage.name || "Information",
    text: page.text || page.plain_text || page.description || nestedPage.text || nestedPage.plain_text || nestedPage.description || (Array.isArray(faqItems) ? formatFaqItems(faqItems) : ""),
  };
}

export function getAboutUs(options = {}) {
  return getPageContent("/api/about-us", options);
}
