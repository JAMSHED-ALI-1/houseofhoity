"use client";

import React, { useState } from "react";
import Link from "next/link";

const navLinks = [
  { label: "HOME", badge: null },
  { label: "SHOP", badge: { text: "NEW", color: "#4A90D9" } },
  { label: "PRODUCT", badge: { text: "HOT", color: "#E74C3C" } },
  { label: "SALE", badge: null },
  { label: "PAGES", badge: null },
  { label: "LOOKBOOK", badge: null },
  { label: "BLOG", badge: null },
  { label: "BUY", badge: null },
];

const socialLinks = [
  {
    label: "Facebook",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
      </svg>
    ),
  },
  {
    label: "Twitter/X",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    label: "Pinterest",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 001.95-1.97A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white" />
      </svg>
    ),
  },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Montserrat:wght@300;400;500;600;700&display=swap');

        :root {
          --gecko-black: #111111;
          --gecko-white: #ffffff;
          --gecko-gray: #f5f5f5;
          --gecko-mid: #888888;
          --gecko-badge-new: #4A90D9;
          --gecko-badge-hot: #E74C3C;
          --gecko-border: #e8e8e8;
          --gecko-top-bg: #1a1a1a;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .gecko-header-wrapper {
          font-family: 'Montserrat', sans-serif;
          width: 100%;
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        /* Top Bar */
        .gecko-topbar {
          background: var(--gecko-top-bg);
          color: var(--gecko-white);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 32px;
          font-size: 11px;
          letter-spacing: 0.08em;
        }

        .gecko-topbar-social {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .gecko-topbar-social a {
          color: rgba(255,255,255,0.65);
          transition: color 0.2s;
          display: flex;
          align-items: center;
          text-decoration: none;
        }

        .gecko-topbar-social a:hover { color: var(--gecko-white); }

        .gecko-topbar-tagline {
          font-weight: 400;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.8);
          text-transform: uppercase;
          font-size: 10px;
        }

        .gecko-topbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 11px;
          color: rgba(255,255,255,0.7);
        }

        .gecko-topbar-right select {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.7);
          font-family: inherit;
          font-size: 11px;
          cursor: pointer;
          outline: none;
          letter-spacing: 0.05em;
        }

        .gecko-topbar-right select option { color: #111; }

        /* Main Nav */
        .gecko-main-nav {
          background: var(--gecko-white);
          border-bottom: 1px solid var(--gecko-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          height: 70px;
          gap: 24px;
        }

        .gecko-logo {
          font-family: 'Montserrat', sans-serif;
          font-weight: 700;
          font-size: 26px;
          letter-spacing: 0.35em;
          color: var(--gecko-black);
          text-decoration: none;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .gecko-nav-links {
          display: flex;
          align-items: center;
          gap: 0;
          list-style: none;
          flex: 1;
          justify-content: center;
        }

        .gecko-nav-item {
          position: relative;
        }

        .gecko-nav-link {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0 14px;
          height: 70px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gecko-black);
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s;
          border-bottom: 2px solid transparent;
          position: relative;
        }

        .gecko-nav-link:hover {
          color: var(--gecko-mid);
          border-bottom-color: var(--gecko-black);
        }

        .gecko-nav-link::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 14px;
          right: 14px;
          height: 2px;
          background: var(--gecko-black);
          transform: scaleX(0);
          transition: transform 0.25s ease;
        }

        .gecko-nav-link:hover::after { transform: scaleX(1); }

        .gecko-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 2px 6px;
          border-radius: 20px;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: white;
          text-transform: uppercase;
        }

        .gecko-nav-icons {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .gecko-icon-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--gecko-black);
          border-radius: 50%;
          transition: background 0.2s;
          position: relative;
          text-decoration: none;
        }

        .gecko-icon-btn:hover { background: var(--gecko-gray); }

        .gecko-icon-btn svg { display: block; }

        .gecko-badge-count {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 16px;
          height: 16px;
          background: var(--gecko-black);
          color: white;
          border-radius: 50%;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        /* Mobile toggle */
        .gecko-mobile-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: var(--gecko-black);
        }

        /* Mobile Menu */
        .gecko-mobile-menu {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border-bottom: 1px solid var(--gecko-border);
          padding: 16px 0;
          flex-direction: column;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        }

        .gecko-mobile-menu.open { display: flex; }

        .gecko-mobile-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 32px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gecko-black);
          text-decoration: none;
          transition: background 0.15s;
        }

        .gecko-mobile-link:hover { background: var(--gecko-gray); }

        @media (max-width: 960px) {
          .gecko-nav-links { display: none; }
          .gecko-mobile-toggle { display: flex; }
          .gecko-topbar-tagline { display: none; }
        }

        @media (max-width: 600px) {
          .gecko-topbar { padding: 8px 16px; }
          .gecko-main-nav { padding: 0 16px; }
          .gecko-topbar-right { gap: 8px; }
        }
      `}</style>

      <header className="gecko-header-wrapper">
        {/* Top Bar */}
        <div className="gecko-topbar">
          <div className="gecko-topbar-social">
            {socialLinks.map((s) => (
              <a key={s.label} href={s.href} aria-label={s.label} title={s.label}>
                {s.icon}
              </a>
            ))}
          </div>

          <span className="gecko-topbar-tagline">Made With Love</span>

          <div className="gecko-topbar-right">
            <select aria-label="Language">
              <option>English</option>
              <option>French</option>
              <option>Spanish</option>
            </select>
            <select aria-label="Currency">
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="gecko-main-nav">
          <Link href="/" className="gecko-logo">Hoity Moppet</Link>

          <ul className="gecko-nav-links">
            {navLinks.map((link) => (
              <li key={link.label} className="gecko-nav-item">
                <a
                  href="#"
                  className="gecko-nav-link"
                  onClick={(e) => { e.preventDefault(); setActiveLink(link.label); }}
                >
                  {link.label}
                  {link.badge && (
                    <span
                      className="gecko-badge"
                      style={{ background: link.badge.color }}
                    >
                      {link.badge.text}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>

          <div className="gecko-nav-icons">
            {/* Search */}
            <button className="gecko-icon-btn" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            {/* Account */}
            <button className="gecko-icon-btn" aria-label="Account">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            {/* Wishlist */}
            <button className="gecko-icon-btn" aria-label="Wishlist">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
              <span className="gecko-badge-count">0</span>
            </button>

            {/* Cart */}
            <button className="gecko-icon-btn" aria-label="Cart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <span className="gecko-badge-count">0</span>
            </button>

            {/* Mobile toggle */}
            <button
              className="gecko-mobile-toggle gecko-icon-btn"
              aria-label="Menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          <div className={`gecko-mobile-menu ${menuOpen ? "open" : ""}`}>
            {navLinks.map((link) => (
              <a key={link.label} href="#" className="gecko-mobile-link">
                {link.label}
                {link.badge && (
                  <span className="gecko-badge" style={{ background: link.badge.color }}>
                    {link.badge.text}
                  </span>
                )}
              </a>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
}
