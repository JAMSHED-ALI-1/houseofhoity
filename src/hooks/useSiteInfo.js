"use client";

import { useEffect, useState } from "react";
import { getSiteInfo } from "@/services/site.service";
import { BASE_URL } from "@/types/API_URL";

export const fallbackSiteInfo = {
  company: {
    name: "Hoitymoppet",
    email: "hello@hoitymoppet.com",
    phone: "+91-9654902007",
    mobile: "+91-9654902007",
    logo_url: "https://hoitymoppet.com/web/image/res.company/1/logo?unique=16f2f81",
  },
  website: {},
  logo_url: "https://hoitymoppet.com/web/image/res.company/1/logo?unique=16f2f81",
};

function normalizeAssetUrl(value, siteInfo = {}) {
  if (!value || typeof value !== "string") {
    return value;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }

  const baseUrl = (
    siteInfo.base_url ||
    BASE_URL
  ).replace(/\/+$/g, "");

  return `${baseUrl}/${value.replace(/^\/+/g, "")}`;
}

export function getSiteLogo(siteInfo = fallbackSiteInfo) {
  return normalizeAssetUrl((
    siteInfo.logo_url ||
    siteInfo.logo ||
    siteInfo.company?.logo_url ||
    siteInfo.website?.logo_url ||
    fallbackSiteInfo.logo_url
  ), siteInfo);
}

export function getSiteName(siteInfo = fallbackSiteInfo) {
  return (
    siteInfo.company?.name ||
    siteInfo.website?.name ||
    fallbackSiteInfo.company.name
  );
}

export function getSiteEmail(siteInfo = fallbackSiteInfo) {
  return (
    siteInfo.company?.email ||
    siteInfo.company?.contact_email ||
    siteInfo.company?.mail ||
    siteInfo.website?.email ||
    siteInfo.website?.contact_email ||
    fallbackSiteInfo.company.email
  );
}

export function getSitePhone(siteInfo = fallbackSiteInfo) {
  return (
    siteInfo.company?.phone ||
    siteInfo.company?.mobile ||
    siteInfo.company?.contact_number ||
    siteInfo.company?.telephone ||
    siteInfo.website?.phone ||
    siteInfo.website?.mobile ||
    siteInfo.website?.contact_number ||
    fallbackSiteInfo.company.phone
  );
}

export function useSiteInfo() {
  const [siteInfo, setSiteInfo] = useState(fallbackSiteInfo);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSiteInfo() {
      try {
        const payload = await getSiteInfo({}, { signal: controller.signal });

        if (!controller.signal.aborted) {
          setSiteInfo({ ...fallbackSiteInfo, ...payload });
        }
      } catch (requestError) {
        if (requestError.code !== "REQUEST_ABORTED") {
          setError(requestError);
        }
      }
    }

    loadSiteInfo();

    return () => {
      controller.abort();
    };
  }, []);

  return { siteInfo, error };
}
