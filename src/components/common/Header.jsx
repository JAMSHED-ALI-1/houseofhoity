"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Loader from "@/components/common/Loader";
import { useAuthContext } from "@/context/AuthContext";
import { useCart } from "@/hooks/useCart";
import { getSiteLogo, getSiteName, useSiteInfo } from "@/hooks/useSiteInfo";
import AccountDashboard from "@/components/common/AccountDashboard";
import { getCountries } from "@/services/account.service";
import { reactivateAccount } from "@/services/auth.service";
import { register as registerCustomer } from "@/services/auth.service";
import { getCategories } from "@/services/category.service";
import { searchProducts } from "@/services/product.service";

const fallbackNavItems = [
  {
    // label: "COUTURE",
    href: "#",
    // dropdown: ["GLITTERATI"],
  },
  
];

const fallbackNavItemsWithoutDropdowns = fallbackNavItems.map(({ dropdown, ...item }) => item);

function getCategoryList(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.result?.categories)) {
    return response.result.categories;
  }

  if (Array.isArray(response?.categories)) {
    return response.categories;
  }

  if (Array.isArray(response?.data?.categories)) {
    return response.data.categories;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

function isRootCategory(category) {
  return category.parent_id === false || category.parent_id === null || category.parent_id === undefined || category.parent_id === "";
}

function isVisibleCategory(category) {
  return category?.visible === true;
}

function getChildCategoryDetails(child, categoryById) {
  const id = child && typeof child === "object" ? child.id : child;
  const fullChildCategory = categoryById.get(String(id));

  if (id === false || id === null || id === undefined) {
    return null;
  }

  if (fullChildCategory && !isVisibleCategory(fullChildCategory)) {
    return null;
  }

  if (child && typeof child === "object") {
    return {
      id,
      label: child.name || fullChildCategory?.name || String(id),
      href: `/collections/${id}`,
    };
  }

  return {
    id,
    label: fullChildCategory?.name || String(id),
    href: `/collections/${id}`,
  };
}

function normalizeNavCategories(response) {
  const categories = getCategoryList(response);
  const categoryById = new Map(categories.map((category) => [String(category.id), category]));

  return categories
    .filter((category) => isRootCategory(category) && isVisibleCategory(category) && category.name)
    .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0))
    .map((category) => {
      const childCategories = Array.isArray(category.child_ids)
        ? category.child_ids
          .map((child) => getChildCategoryDetails(child, categoryById))
          .filter(Boolean)
        : [];

      return {
        id: category.id,
        label: category.name,
        href: category.url || `/collections/${category.id}`,
        dropdown: childCategories.length > 0 ? childCategories : undefined,
      };
    });
}

function getNavItemKey(item, index) {
  return [item?.id, item?.href, item?.label, index]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .join("-");
}

function getDropdownItemKey(parentItem, dropdownItem, index) {
  const item = dropdownItem && typeof dropdownItem === "object" ? dropdownItem : {};

  return [parentItem?.id, parentItem?.href, item.id, item.href, item.label || dropdownItem, index]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .join("-");
}

function getWebsiteOrigin() {
  const configuredOrigin = (
    process.env.NEXT_PUBLIC_FRONTEND_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).replace(/\/+$/g, "");

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="none">
      <path
        d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.7"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12a4.75 4.75 0 1 0 0-9.5 4.75 4.75 0 0 0 0 9.5Zm0 2.25c-4.18 0-7.25 2.35-7.25 5.55 0 .94.76 1.7 1.7 1.7h11.1c.94 0 1.7-.76 1.7-1.7 0-3.2-3.07-5.55-7.25-5.55Z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.5 8.5h11l-.85 10.2a2 2 0 0 1-2 1.8h-5.3a2 2 0 0 1-2-1.8L6.5 8.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M9 8.5V7a3 3 0 0 1 6 0v1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CaretIcon() {
  return (
    <svg aria-hidden="true" className="size-4 text-[#777]" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 10.5 3.5 6h9L8 10.5Z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="size-7" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="none">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function HeaderCartAction({ cartCount, onCartClick, className = "relative grid size-8 place-items-center transition hover:text-[#2d7fc4]" }) {
  const badge = (
    <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-[#6c5caf] text-[11px] font-bold leading-none text-white">
      {cartCount}
    </span>
  );

  if (onCartClick) {
    return (
      <button type="button" onClick={onCartClick} className={className} aria-label="Cart">
        <CartIcon />
        {badge}
      </button>
    );
  }

  return (
    <Link href="/#products" className={className} aria-label="Cart">
      <CartIcon />
      {badge}
    </Link>
  );
}

function getProductSearchHref(product) {
  const id = product?.id || product?.product_id;

  if (id === undefined || id === null || id === "" || id === "undefined") {
    return "/#products";
  }

  return `/products/${encodeURIComponent(String(id))}`;
}

function SearchPanel({ compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!isOpen) return undefined;

    const controller = new AbortController();

    if (trimmedQuery.length < 2) {
      return () => controller.abort();
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await searchProducts(trimmedQuery, { limit: 8 }, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setResults(response.items || []);
      } catch (error) {
        if (error.code !== "REQUEST_ABORTED" && !controller.signal.aborted) {
          setSearchError(error.message || "Search failed.");
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isOpen, trimmedQuery]);

  function updateQuery(value) {
    setQuery(value);

    if (value.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      setSearchError("");
    } else {
      setIsSearching(true);
      setSearchError("");
    }
  }

  function closeSearch() {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setSearchError("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={compact ? "grid size-10 place-items-center text-black" : "grid size-8 place-items-center transition hover:text-[#2d7fc4]"}
        aria-label="Search products"
        aria-expanded={isOpen}
      >
        <SearchIcon />
      </button>

      {isOpen && (
        <div className={`${compact ? "fixed left-4 right-4 top-24 z-[10020]" : "absolute right-0 top-full z-[10020] mt-4 w-[360px]"} border border-[#dedede] bg-white shadow-[0_18px_36px_rgba(0,0,0,0.18)]`}>
          <form
            className="flex items-center gap-2 border-b border-[#eeeeee] p-3"
            onSubmit={(event) => event.preventDefault()}
          >
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="Search products..."
              className="h-11 min-w-0 flex-1 border border-[#d9d9d9] px-3 text-sm font-semibold text-[#333] outline-none focus:border-[#6c5caf]"
            />
            <button
              type="button"
              onClick={closeSearch}
              className="grid size-11 shrink-0 place-items-center border border-[#d9d9d9] text-[#333] transition hover:bg-[#222] hover:text-white"
              aria-label="Close search"
            >
              <CloseIcon />
            </button>
          </form>

          <div className="max-h-[420px] overflow-y-auto p-3">
            {trimmedQuery.length < 2 ? (
              <p className="px-2 py-6 text-center text-sm font-semibold text-[#777]">
                Type at least 2 letters.
              </p>
            ) : isSearching ? (
              <div className="grid place-items-center px-2 py-6">
                <Loader variant="dots" size={70} label="Searching products" />
              </div>
            ) : searchError ? (
              <p className="px-2 py-6 text-center text-sm font-semibold text-red-600">{searchError}</p>
            ) : results.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm font-semibold text-[#777]">No products found.</p>
            ) : (
              <div className="grid gap-2">
                {results.map((product, index) => (
                  <Link
                    key={[product.id, product.title, index].filter(Boolean).join("-")}
                    href={getProductSearchHref(product)}
                    onClick={closeSearch}
                    className="flex min-h-[86px] items-center gap-3 border border-[#eeeeee] bg-white p-2 transition hover:border-[#6c5caf] hover:bg-[#faf8ff]"
                  >
                    <img
                      src={product.image || "/placeholder-product.png"}
                      alt={product.title || "Product"}
                      className="size-16 shrink-0 object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[#222]">
                        {product.title || "Product"}
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-[#6c5caf]">
                        {product.price || ""}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getCustomerDisplayName(user) {
  const name = user?.name || user?.display_name || user?.email || user?.login;

  if (!name) {
    return "Account";
  }

  return String(name).trim().split(/\s+/)[0] || "Account";
}

function AccountAction({ user, isAuthenticated, className }) {
  const displayName = getCustomerDisplayName(user);

  return (
    <label
      htmlFor="account-drawer-toggle"
      className={className}
      aria-label={isAuthenticated ? `Open account for ${displayName}` : "Open account login"}
      role="button"
      tabIndex={0}
      title={isAuthenticated ? displayName : "Login"}
    >
      {isAuthenticated ? (
        <span className="max-w-[120px] truncate text-sm font-bold text-[#222] transition hover:text-[#2d7fc4]">
          {displayName}
        </span>
      ) : (
        <UserIcon />
      )}
    </label>
  );
}

function getCountryList(payload = {}) {
  const source = payload.result || payload;
  const items = Array.isArray(payload)
    ? payload
    : source.countries || source.country || source.data?.countries || source.data || [];

  return (Array.isArray(items) ? items : [])
    .map((country) => ({
      id: country.id ?? country.country_id ?? country.value,
      name: country.name || country.display_name || country.label,
    }))
    .filter((country) => country.id && country.name);
}

function getCurrencyLabel(user = {}) {
  const activePricelist = user?.active_pricelist || {};
  const currencyCode = user?.currency_code || activePricelist.currency_code || user?.currency || activePricelist.currency || "INR";
  const currencySymbol = user?.currency_symbol || activePricelist.currency_symbol || "₹";

  return `${currencyCode}- ${currencySymbol}`;
}

export default function Header({ cartCount: cartCountProp, onCartClick }) {
  const { user, isAuthenticated, isLoading: isAuthLoading, error: authError, login, logout } = useAuthContext();
  const { count: fallbackCartCount } = useCart();
  const { siteInfo } = useSiteInfo();
  const cartCount = cartCountProp ?? fallbackCartCount;
  const currencyLabel = getCurrencyLabel(user);
  const siteLogo = getSiteLogo(siteInfo);
  const siteName = getSiteName(siteInfo);
  const [apiNavItems, setApiNavItems] = useState([]);
  const [hasCategoryResponse, setHasCategoryResponse] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [accountMode, setAccountMode] = useState("login");
  const [countries, setCountries] = useState([]);
  const [isCountriesLoading, setIsCountriesLoading] = useState(false);
  const hasCountryLoadAttemptedRef = useRef(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSignupComplete, setIsSignupComplete] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const response = await getCategories({ jsonrpc: '2.0', 
          // signal: controller.signal ,
          params: {  },
        });
        if (controller.signal.aborted) return;

        const nextNavItems = normalizeNavCategories(response);
        setApiNavItems(nextNavItems);
        setHasCategoryResponse(true);
      } catch (error) {
        if (error.code !== "REQUEST_ABORTED") {
          setHasCategoryResponse(true);
        }
      }
    }

    loadCategories();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (accountMode !== "signup" || countries.length > 0 || hasCountryLoadAttemptedRef.current) {
      return undefined;
    }

    let ignore = false;

    async function loadCountries() {
      hasCountryLoadAttemptedRef.current = true;
      setIsCountriesLoading(true);

      try {
        const payload = await getCountries();

        if (!ignore) {
          setCountries(getCountryList(payload));
        }
      } catch {
        if (!ignore) {
          setCountries([]);
        }
      } finally {
        if (!ignore) {
          setIsCountriesLoading(false);
        }
      }
    }

    loadCountries();

    return () => {
      ignore = true;
    };
  }, [accountMode, countries.length]);

  const headerNavItems = useMemo(() => {
    if (apiNavItems.length > 0) {
      return apiNavItems;
    }

    return hasCategoryResponse ? [] : fallbackNavItemsWithoutDropdowns;
  }, [apiNavItems, hasCategoryResponse]);

  async function submitLogin(event) {
    event.preventDefault();
    setLoginMessage("");

    const formData = new FormData(event.currentTarget);

    try {
      await login({
        login: formData.get("email"),
        email: formData.get("email"),
        password: formData.get("password"),
      });

      setLoginMessage("Logged in successfully");
      const drawerToggle = document.getElementById("account-drawer-toggle");
      if (drawerToggle) {
        drawerToggle.checked = false;
      }
    } catch (requestError) {
      setLoginMessage(requestError.message || "Login failed");
    }
  }

  async function submitSignup(event) {
    event.preventDefault();
    setLoginMessage("");
    setIsSignupComplete(false);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setLoginMessage("Confirm password does not match");
      return;
    }

    setIsRegistering(true);

    try {
      const websiteOrigin = getWebsiteOrigin();
      const activationUrl = websiteOrigin ? `${websiteOrigin}/home/activate` : "";
      const response = await registerCustomer({
        name: String(formData.get("name") || "").trim(),
        email,
        login: email,
        country_id: formData.get("country_id"),
        mobile: String(formData.get("mobile") || "").trim(),
        phone: String(formData.get("mobile") || "").trim(),
        password,
        base_url: websiteOrigin,
        website_url: websiteOrigin,
        activation_base_url: websiteOrigin,
        activation_path: "/home/activate",
        activation_url: activationUrl,
        frontend_activation_url: activationUrl,
        customer_activation_url: activationUrl,
      });

      if (response?.error) {
        throw new Error(response.error);
      }

      setLoginMessage(response?.message || "Registration email sent successfully");
      setIsSignupComplete(true);
      form.reset();
    } catch (requestError) {
      setLoginMessage(requestError.message || "Signup failed");
    } finally {
      setIsRegistering(false);
    }
  }

  async function submitReactivate(event) {
    event.preventDefault();
    setLoginMessage("");
    setIsReactivating(true);

    const formData = new FormData(event.currentTarget);

    try {
      const websiteOrigin = getWebsiteOrigin();
      const activationUrl = websiteOrigin ? `${websiteOrigin}/home/activate` : "";
      const response = await reactivateAccount({
        email: String(formData.get("email") || "").trim(),
        base_url: websiteOrigin,
        website_url: websiteOrigin,
        activation_base_url: websiteOrigin,
        activation_path: "/home/activate",
        activation_url: activationUrl,
        frontend_activation_url: activationUrl,
        customer_activation_url: activationUrl,
      });

      if (response?.error) {
        throw new Error(response.error);
      }

      setLoginMessage(response?.message || "Account reactivation request sent");
    } catch (requestError) {
      setLoginMessage(requestError.message || "Account reactivation failed");
    } finally {
      setIsReactivating(false);
    }
  }

  async function submitLogout() {
    setIsLoggingOut(true);
    setLoginMessage("");

    try {
      await logout();
      setLoginMessage("Logged out successfully");
      const drawerToggle = document.getElementById("account-drawer-toggle");
      if (drawerToggle) {
        drawerToggle.checked = false;
      }
    } catch (requestError) {
      setLoginMessage(requestError.message || "Logout failed");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <input id="mobile-menu-toggle" type="checkbox" className="peer sr-only" aria-hidden="true" />
      <input id="account-drawer-toggle" type="checkbox" className="peer/account sr-only" aria-hidden="true" />

      <header className="sticky top-0 z-50 border-b border-[#e5e5e5] bg-white">
        <div className="flex h-[76px] items-center gap-5 px-5 lg:px-8 xl:px-10">
          <Link href="/" className="shrink-0" aria-label="Go to home page">
            <img
              src={siteLogo}
              alt={siteName}
              className="h-9 w-auto md:h-10"
            />
          </Link>

          <nav aria-label="Primary navigation" className="hidden min-w-0 flex-1 items-center justify-center gap-5 xl:gap-7 lg:flex">
            {headerNavItems.map((item, index) => (
              <div key={getNavItemKey(item, index)} className="group relative flex h-[76px] items-center">
                <Link
                  href={item.href}
                  className="whitespace-nowrap text-[14px] font-extrabold uppercase leading-none tracking-[0.02em] text-black transition hover:text-[#2d7fc4] xl:text-[16px]"
                >
                  {item.label}
                </Link>

                {item.dropdown && (
                  <div className="invisible absolute left-1/2 top-full z-50 min-w-[230px] -translate-x-1/2 translate-y-3 border border-[#d3d3d3] bg-white py-0 text-black opacity-0 shadow-[0_18px_28px_rgba(0,0,0,0.16)] transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <ul>
                      {item.dropdown.map((dropdownItem, dropdownIndex) => (
                        <li key={getDropdownItemKey(item, dropdownItem, dropdownIndex)}>
                          <Link
                            href={dropdownItem.href || "#"}
                            className={`block px-8 py-4 text-[15px] font-extrabold leading-tight ${
                              item.label === "COLLECTIONS" && index === 0 ? "bg-[#3f82ba] text-black" : "bg-white text-black hover:bg-[#f4f4f4]"
                            }`}
                          >
                            {dropdownItem.label || dropdownItem}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <label
            htmlFor="mobile-menu-toggle"
            className="ml-auto grid size-11 place-items-center text-black lg:hidden"
            aria-label="Open menu"
            aria-controls="mobile-menu"
            role="button"
            tabIndex={0}
          >
            <MenuIcon />
          </label>

          <div className="hidden shrink-0 items-center gap-4 text-black lg:flex">
            <SearchPanel />
            <button
              type="button"
              className="flex h-11 items-center gap-2 border border-[#d8d8d8] px-4 text-[15px] text-[#777] transition hover:border-[#bdbdbd]"
              aria-label="Change currency"
              title={currencyLabel}
            >
              {currencyLabel}
              <CaretIcon />
            </button>
            <HeaderCartAction cartCount={cartCount} onCartClick={onCartClick} />
            <AccountAction
              user={user}
              isAuthenticated={isAuthenticated}
              className="grid min-h-8 max-w-[132px] cursor-pointer place-items-center transition hover:text-[#2d7fc4]"
            />
          </div>
        </div>
      </header>

      <div
        className="pointer-events-none fixed inset-0 z-[9998] bg-black/45 opacity-0 transition-opacity peer-checked:pointer-events-auto peer-checked:opacity-100 lg:hidden"
        aria-hidden="true"
      >
        <label htmlFor="mobile-menu-toggle" className="block h-full w-full cursor-pointer" aria-label="Close menu" />
      </div>

      <aside
        id="mobile-menu"
        className="fixed bottom-0 right-0 top-0 z-[9999] flex w-[86vw] max-w-[360px] translate-x-full flex-col bg-white shadow-[-16px_0_30px_rgba(0,0,0,0.2)] transition-transform duration-200 peer-checked:translate-x-0 lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="flex h-[76px] items-center justify-between border-b border-[#e5e5e5] px-5">
          <Link href="/" aria-label="Go to home page">
            <img
              src={siteLogo}
              alt={siteName}
              className="h-9 w-auto"
            />
          </Link>
          <label
            htmlFor="mobile-menu-toggle"
            className="grid size-10 place-items-center text-black"
            aria-label="Close menu"
            role="button"
            tabIndex={0}
          >
            <CloseIcon />
          </label>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-5 py-4" aria-label="Mobile primary navigation">
          <ul className="divide-y divide-[#eeeeee]">
            {headerNavItems.map((item, index) => (
                <li key={getNavItemKey(item, index)}>
                  <div className="flex min-h-12 items-center justify-between gap-3">
                    <Link
                      href={item.href}
                      className="flex-1 py-4 text-[14px] font-extrabold uppercase tracking-[0.02em] text-black"
                    >
                      {item.label}
                    </Link>
                    {item.dropdown && <CaretIcon />}
                  </div>

                  {item.dropdown && (
                    <ul className="pb-3">
                      {item.dropdown.map((dropdownItem, dropdownIndex) => (
                        <li key={getDropdownItemKey(item, dropdownItem, dropdownIndex)}>
                          <Link
                            href={dropdownItem.href || "#"}
                            className="block border-l-2 border-[#3f82ba] px-4 py-3 text-[13px] font-semibold text-[#333]"
                          >
                            {dropdownItem.label || dropdownItem}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
          </ul>
        </nav>

        <div className="flex items-center justify-between border-t border-[#e5e5e5] px-5 py-4">
          <SearchPanel compact />
          <button
            type="button"
            className="flex h-11 items-center gap-2 border border-[#d8d8d8] px-4 text-[14px] text-[#777]"
            aria-label="Change currency"
            title={currencyLabel}
          >
            {currencyLabel}
            <CaretIcon />
          </button>
          <HeaderCartAction
            cartCount={cartCount}
            onCartClick={onCartClick}
            className="relative grid size-10 place-items-center text-black"
          />
          <AccountAction
            user={user}
            isAuthenticated={isAuthenticated}
            className="grid min-h-10 max-w-[112px] cursor-pointer place-items-center text-black"
          />
        </div>
      </aside>

      <div
        className="pointer-events-none fixed inset-0 z-[10000] bg-black/45 opacity-0 transition-opacity peer-checked/account:pointer-events-auto peer-checked/account:opacity-100"
        aria-hidden="true"
      >
        <label htmlFor="account-drawer-toggle" className="block h-full w-full cursor-pointer" aria-label="Close account login" />
      </div>

      <aside
        className="fixed bottom-0 right-0 top-0 z-[10001] flex w-full max-w-[430px] translate-x-full flex-col overflow-hidden bg-[#f7f2ef] shadow-[-18px_0_40px_rgba(0,0,0,0.22)] transition-transform duration-300 peer-checked/account:translate-x-0"
        aria-label="Account login"
      >
        <div className="relative h-full overflow-y-auto px-7 py-8">
          <img
            src="https://hoitymoppet.com/web/image/product.slider/5/slider_image?unique=d69883b"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-white/78 backdrop-blur-[1px]" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-5">
              <Link href="/" aria-label="Go to home page">
                <img
                  src={siteLogo}
                  alt={siteName}
                  className="h-auto w-[185px]"
                />
              </Link>
              <label
                htmlFor="account-drawer-toggle"
                className="grid size-10 shrink-0 cursor-pointer place-items-center border border-[#d8d8d8] bg-white/70 text-black transition hover:bg-[#222] hover:text-white"
                aria-label="Close account login"
                role="button"
                tabIndex={0}
              >
                <CloseIcon />
              </label>
            </div>

            {isAuthenticated ? (
              <AccountDashboard
                user={user}
                authError={authError}
                loginMessage={loginMessage}
                onLogout={submitLogout}
                isLoggingOut={isLoggingOut}
              />
            ) : accountMode === "reactivate" ? (
              <form className="mt-12" onSubmit={submitReactivate}>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6c5caf]">Account Help</p>
                  <h2 className="mt-2 text-3xl font-black text-[#333]">Reactivate Account</h2>
                  <p className="mt-4 text-base font-medium leading-7 text-[#666]">
                    Enter your email address to request account reactivation.
                  </p>
                </div>

                <label className="mt-8 block">
                  <span className="sr-only">Email</span>
                  <input
                    required
                    type="email"
                    name="email"
                    placeholder="Email"
                    className="h-14 w-full border border-[#d8d0c8] bg-white/80 px-4 text-lg font-semibold text-[#333] outline-none transition placeholder:text-[#888] focus:border-[#6c5caf]"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isReactivating}
                  className="mt-6 flex min-h-13 w-full items-center justify-center bg-[#6c5caf] px-8 text-lg font-semibold text-white shadow-[0_14px_30px_rgba(80,65,145,0.22)] transition hover:bg-[#564796] disabled:cursor-not-allowed disabled:bg-[#9f95c8]"
                >
                  {isReactivating ? (
                    <Loader variant="dots" size={52} label="Reactivating account" className="brightness-0 invert" />
                  ) : "Reactivate account"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccountMode("login");
                    setLoginMessage("");
                  }}
                  className="mt-5 w-full text-center text-base font-bold text-[#247bd1] transition hover:text-[#6c5caf]"
                >
                  Back to login
                </button>

                {(loginMessage || authError) && (
                  <p className="mt-4 text-sm font-semibold text-[#6c5caf]">
                    {loginMessage || authError?.message}
                  </p>
                )}
              </form>
            ) : accountMode === "signup" ? (
              <form className="mt-10" onSubmit={submitSignup}>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6c5caf]">Create Account</p>
                  <h2 className="mt-2 text-3xl font-black text-[#333]">Sign up</h2>
                </div>

                {isSignupComplete ? (
                  <div className="mt-8">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMode("login");
                          setLoginMessage("");
                          setIsSignupComplete(false);
                        }}
                        className="flex min-h-13 flex-1 items-center justify-center bg-[#6c5caf] px-6 text-base font-semibold text-white shadow-[0_14px_30px_rgba(80,65,145,0.22)] transition hover:bg-[#564796]"
                      >
                        Go to login page
                      </button>
                      <Link
                        href="/"
                        onClick={() => {
                          const drawerToggle = document.getElementById("account-drawer-toggle");
                          if (drawerToggle) {
                            drawerToggle.checked = false;
                          }
                          setAccountMode("login");
                          setLoginMessage("");
                          setIsSignupComplete(false);
                        }}
                        className="flex min-h-13 flex-1 items-center justify-center bg-[#6c5caf] px-6 text-base font-semibold text-white shadow-[0_14px_30px_rgba(80,65,145,0.22)] transition hover:bg-[#564796]"
                      >
                        Go to home page
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-8 grid gap-4">
                      <label className="block">
                        <span className="sr-only">Your Name</span>
                        <input
                          required
                          type="text"
                          name="name"
                          placeholder="Your Name"
                          className="h-12 w-full border border-[#d8d0c8] bg-white/80 px-4 text-base font-semibold text-[#333] outline-none transition placeholder:text-[#888] focus:border-[#6c5caf]"
                        />
                      </label>
                      <label className="block">
                        <span className="sr-only">Email</span>
                        <input
                          required
                          type="email"
                          name="email"
                          placeholder="Email"
                          className="h-12 w-full border border-[#d8d0c8] bg-white/80 px-4 text-base font-semibold text-[#333] outline-none transition placeholder:text-[#888] focus:border-[#6c5caf]"
                        />
                      </label>
                      <label className="block">
                        <span className="sr-only">Country</span>
                        <select
                          required
                          name="country_id"
                          className="h-12 w-full border border-[#d8d0c8] bg-white/80 px-4 text-base font-semibold text-[#333] outline-none transition focus:border-[#6c5caf]"
                          defaultValue=""
                        >
                          <option value="">{isCountriesLoading ? "Loading countries..." : "Country"}</option>
                          {countries.map((country) => (
                            <option key={country.id} value={country.id}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="sr-only">Mobile No</span>
                        <input
                          required
                          type="tel"
                          name="mobile"
                          placeholder="Mobile No"
                          className="h-12 w-full border border-[#d8d0c8] bg-white/80 px-4 text-base font-semibold text-[#333] outline-none transition placeholder:text-[#888] focus:border-[#6c5caf]"
                        />
                      </label>
                      <label className="block">
                        <span className="sr-only">Password</span>
                        <input
                          required
                          type="password"
                          name="password"
                          placeholder="Password"
                          className="h-12 w-full border border-[#d8d0c8] bg-white/80 px-4 text-base font-semibold text-[#333] outline-none transition placeholder:text-[#888] focus:border-[#6c5caf]"
                        />
                      </label>
                      <label className="block">
                        <span className="sr-only">Confirm Password</span>
                        <input
                          required
                          type="password"
                          name="confirmPassword"
                          placeholder="Confirm password"
                          className="h-12 w-full border border-[#d8d0c8] bg-white/80 px-4 text-base font-semibold text-[#333] outline-none transition placeholder:text-[#888] focus:border-[#6c5caf]"
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isRegistering || isAuthLoading}
                      className="mt-6 flex min-h-13 w-full items-center justify-center bg-[#6c5caf] px-8 text-lg font-semibold text-white shadow-[0_14px_30px_rgba(80,65,145,0.22)] transition hover:bg-[#564796] disabled:cursor-not-allowed disabled:bg-[#9f95c8]"
                    >
                      {isRegistering || isAuthLoading ? (
                        <Loader variant="dots" size={52} label="Creating account" className="brightness-0 invert" />
                      ) : "Create account"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAccountMode("login");
                        setLoginMessage("");
                        setIsSignupComplete(false);
                      }}
                      className="mt-5 w-full text-center text-base font-bold text-[#247bd1] transition hover:text-[#6c5caf]"
                    >
                      Back to login
                    </button>
                  </>
                )}

                {(loginMessage || authError) && (
                  <p className="mt-4 text-sm font-semibold text-[#6c5caf]">
                    {loginMessage || authError?.message}
                  </p>
                )}
              </form>
            ) : (
              <>
                <form className="mt-14" onSubmit={submitLogin}>
                  <label className="block">
                    <span className="sr-only">Email</span>
                    <input
                      required
                      type="text"
                      name="email"
                      placeholder="Login or email ..."
                      className="h-14 w-full border-0 border-b-2 border-[#d29a35] bg-transparent px-0 text-2xl font-semibold text-[#555] outline-none placeholder:text-[#777] focus:border-[#6c5caf]"
                    />
                  </label>

                  <label className="mt-6 block">
                    <span className="sr-only">Password</span>
                    <input
                      required
                      type="password"
                      name="password"
                      placeholder="Password ..."
                      className="h-14 w-full border-0 border-b border-[#cfcfcf] bg-transparent px-0 text-2xl font-semibold text-[#555] outline-none placeholder:text-[#777] focus:border-[#6c5caf]"
                    />
                  </label>

                  <div className="mt-7 grid gap-3 text-right text-lg font-medium text-[#247bd1]">
                    <a href="#" className="transition hover:text-[#6c5caf]">
                      Reset Password
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMode("signup");
                        setLoginMessage("");
                        setIsSignupComplete(false);
                      }}
                      className="text-right transition hover:text-[#6c5caf]"
                    >
                      Don&apos;t have an account?
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMode("reactivate");
                        setLoginMessage("");
                      }}
                      className="text-right transition hover:text-[#6c5caf]"
                    >
                      Reactivate Account
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="mt-6 flex min-h-13 w-full items-center justify-center bg-[#6c5caf] px-8 text-xl font-semibold text-white shadow-[0_14px_30px_rgba(80,65,145,0.22)] transition hover:bg-[#564796]"
                  >
                    {isAuthLoading ? (
                      <Loader variant="dots" size={52} label="Logging in" className="brightness-0 invert" />
                    ) : "Log in"}
                  </button>
                  {(loginMessage || authError) && (
                    <p className="mt-4 text-sm font-semibold text-[#6c5caf]">
                      {loginMessage || authError?.message}
                    </p>
                  )}
                </form>

                <div className="mt-10 text-center">
                  <p className="text-xl font-semibold text-[#626262]">Or Sign In With</p>
                  <div className="mt-6 grid justify-items-center gap-5">
                    <button
                      type="button"
                      className="flex min-h-13 w-full max-w-[330px] items-center justify-center gap-4 bg-[#4167a9] px-5 text-lg font-bold text-white shadow-md transition hover:bg-[#355894]"
                    >
                      <span className="grid size-8 place-items-center rounded-sm bg-white text-2xl font-black text-[#4167a9]">f</span>
                      Log in with Facebook
                    </button>
                    <button
                      type="button"
                      className="flex min-h-13 w-full max-w-[330px] items-center justify-center gap-4 border border-[#d9d9d9] bg-white px-5 text-lg font-semibold text-[#646464] shadow-md transition hover:border-[#bfbfbf]"
                    >
                      <span className="text-2xl font-bold text-[#4285f4]">G</span>
                      Sign in with Google
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="mt-14 flex items-center justify-center gap-3 text-lg font-medium text-[#636363]">
              <span className="grid size-12 place-items-center rounded-full border-2 border-[#6c5caf] text-xs font-bold text-[#6c5caf]">
                HM
              </span>
              <span>
                Powered by <span className="text-[#247bd1]">ARKESS</span>
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
