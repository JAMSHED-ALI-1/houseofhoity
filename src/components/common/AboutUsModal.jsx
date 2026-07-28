"use client";

import { useState } from "react";
import Loader from "@/components/common/Loader";
import { getPageContent } from "@/services/about.service";

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="none">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function getPlainText(value) {
  const text = String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;nbsp;/gi, " ");

  if (typeof window === "undefined") {
    return text.replace(/\s+/g, " ").trim();
  }

  const parser = document.createElement("textarea");
  parser.innerHTML = text;

  return parser.value.replace(/\s+/g, " ").trim();
}

export default function AboutUsModal({
  children = "About Us",
  className = "",
  endpoint = "/api/about-us",
  fallbackTitle = "About Us",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState({ title: fallbackTitle, text: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function openModal() {
    setIsOpen(true);
    setError("");

    if (content.text || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await getPageContent(endpoint);
      setContent({
        title: fallbackTitle || response.title,
        text: getPlainText(response.text),
      });
    } catch (requestError) {
      setError(requestError.message || `${fallbackTitle} could not be loaded.`);
    } finally {
      setIsLoading(false);
    }
  }

  function closeModal() {
    setIsOpen(false);
  }

  return (
    <>
      <button type="button" onClick={openModal} className={className}>
        {children}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[10030] grid place-items-center bg-black/55 px-4 py-6 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-us-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label={`Close ${fallbackTitle}`}
            onClick={closeModal}
          />
          <section className="relative flex max-h-[86vh] w-full max-w-[760px] flex-col bg-white text-[#222] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#eeeeee] px-6 py-5">
              <h2 id="about-us-modal-title" className="text-xl font-black uppercase tracking-[0.12em]">
                {content.title || fallbackTitle}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="grid size-10 shrink-0 place-items-center border border-[#d8d8d8] text-black transition hover:bg-[#222] hover:text-white"
                aria-label={`Close ${fallbackTitle}`}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="min-h-[220px] overflow-y-auto px-6 py-6">
              {isLoading ? (
                <div className="grid min-h-[200px] place-items-center">
                  <Loader variant="dots" size={86} label={`Loading ${fallbackTitle}`} />
                </div>
              ) : error ? (
                <p className="text-sm font-semibold text-red-600">{error}</p>
              ) : (
                <p className="whitespace-pre-line text-base leading-8 text-[#555]">
                  {content.text || `${fallbackTitle} content is not available.`}
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
