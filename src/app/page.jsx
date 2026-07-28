"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AboutUsModal from "@/components/common/AboutUsModal";
import Header from "@/components/common/Header";
import Loader from "@/components/common/Loader";
import SizeGuideModal from "@/components/product/SizeGuideModal";
import { useAuthContext } from "@/context/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useProducts } from "@/hooks/useProducts";
import { getSiteEmail, getSiteLogo, getSiteName, getSitePhone, useSiteInfo } from "@/hooks/useSiteInfo";
import { useWishlist } from "@/hooks/useWishlist";
import {
  parsePrice,
  products as fallbackProducts,
} from "@/lib/products";
import { getCategories } from "@/services/category.service";
import { calculateCartTaxes, clearCart as clearServerCart } from "@/services/cart.service";
import {
  createCustomerAddress,
  getCustomerAddresses,
  updateCustomerAddress,
} from "@/services/customer-address.service";
import {
  getCustomerCoupons,
  getCountries,
  getStates,
} from "@/services/account.service";
import {
  applyDeliveryCarrier,
  getDeliveryMethods,
} from "@/services/delivery.service";
import { createOrder } from "@/services/order.service";
import {
  createPaymentTransaction,
  getPaymentGateways,
  validatePayment,
} from "@/services/payment.service";
import { cleanProductTitle, formatProductCurrency } from "@/services/product.service";
import { getSliders } from "@/services/slider.service";
import { BASE_URL } from "@/types/API_URL";

const cdn = "https://demo-gecko6.myshopify.com/cdn/shop";
const odooAssetBaseUrl = BASE_URL.replace(/\/+$/g, "");

const fallbackSlides = [
  {
   
  },
 
];

const posts = [
  {
    title: "Spring summer fashion trends",
    date: "October 28, 2022",
    image: `${cdn}/articles/blog_01_540x_5b59e2be-69fd-47e3-9d20-f57d6ba9f7a6.jpg?v=1667229036&width=700`,
  },
  
];

const instagram = [
  "ins1",
  "ins2",
  "ins3",
  "ins4",
  "ins6",
  "ins7",
  "ins8",
  "ins12",
  "ins11",
  "ins9",
].map(
  (name) =>
    `${cdn}/files/${name}.jpg?v=${["ins1", "ins2", "ins3", "ins4"].includes(name) ? "1667571880" : "1667571942"}&width=500`,
);

const initialProducts = fallbackProducts.slice(0, 10);
const footerContentLinks = {
  "About Us": {
    endpoint: "/api/about-us",
    fallbackTitle: "About Us",
  },
  "Terms & Conditions": {
    endpoint: "/api/terms-conditions",
    fallbackTitle: "Terms & Conditions",
  },
  "Shipping & Delivery": {
    endpoint: "/api/shipping-handling",
    fallbackTitle: "Shipping & Delivery",
  },
  "Returns & Exchanges": {
    endpoint: "/api/faq",
    fallbackTitle: "Returns & Exchanges",
  },
  FAQs: {
    endpoint: "/api/faq",
    fallbackTitle: "FAQs",
  },
  "Privacy Policy": {
    endpoint: "/api/privacy-policy",
    fallbackTitle: "Privacy Policy",
  },
};

function getStockValue(product = {}) {
  const stock = Number(
    product.stock ??
      product.quantity_on_hand ??
      product.qty_available ??
      product.available_quantity ??
      product.quantity,
  );

  return Number.isFinite(stock) ? stock : null;
}

function getVariantAttributeValue(variant = {}, attributeNames = []) {
  const attributes = [
    ...(Array.isArray(variant.attributes) ? variant.attributes : []),
    ...(Array.isArray(variant.variant_attributes) ? variant.variant_attributes : []),
  ];
  const attribute = attributes.find((item) =>
    attributeNames.includes(String(item?.attribute_name || "").toLowerCase()),
  ) || attributes[0];

  return attribute?.value_name || attribute?.value || attribute?.name || "";
}

function getFirstVariantValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function getPriceNumber(value) {
  const number = Number(String(value ?? "").replace(/[^0-9.]/g, ""));

  return Number.isFinite(number) && number > 0 ? number : null;
}

function formatVariantPrice(value, source = {}) {
  const number = getPriceNumber(value);

  return number === null ? "" : formatProductCurrency(number, source.currency_symbol || "₹");
}

function getCurrencySymbol(source = {}, fallback = "₹") {
  return (
    source?.currency_symbol ||
    source?.pricelist_currency_symbol ||
    source?.currency?.symbol ||
    source?.active_pricelist?.currency_symbol ||
    source?.active_pricelist?.currency?.symbol ||
    fallback ||
    "₹"
  );
}

function formatCurrencyAmount(value, currencySymbol = "₹") {
  return formatProductCurrency(value, currencySymbol);
}

function getOwnCurrencySymbol(source = {}) {
  return (
    source?.currency_symbol ||
    source?.pricelist_currency_symbol ||
    source?.currency?.symbol ||
    source?.active_pricelist?.currency_symbol ||
    source?.active_pricelist?.currency?.symbol ||
    ""
  );
}

function getVariantDisplayPrice(variant = {}, fallbackPrice, fallbackSource = {}) {
  const price = getFirstVariantValue(
    variant.price,
    variant.list_price,
    variant.lst_price,
    variant.sale_price,
    variant.website_price,
    variant.display_price,
    variant.price_unit,
    variant.amount,
  );

  return formatVariantPrice(price, {
    currency_symbol: variant.currency_symbol || fallbackSource.currency_symbol,
  }) || fallbackPrice || "";
}

function getVariantDisplayOldPrice(variant = {}, fallbackOldPrice, fallbackSource = {}) {
  const oldPrice = getFirstVariantValue(
    variant.mrp_data,
    variant.mrp_price,
    variant.public_price,
    variant.list_price,
    variant.oldPrice,
    variant.old_price,
    variant.compare_at_price,
    variant.compare_list_price,
    variant.strike_price,
    variant.price_before_discount,
    variant.original_price,
    variant.regular_price,
  );

  return formatVariantPrice(oldPrice, {
    currency_symbol: variant.currency_symbol || fallbackSource.currency_symbol,
  }) || fallbackOldPrice || "";
}

function getAvailableVariant(product = {}) {
  const variants = Array.isArray(product.available_variants)
    ? product.available_variants
    : Array.isArray(product.variants)
      ? product.variants
      : [];

  return variants.find((variant) => {
    const stock = getStockValue(variant);

    return stock !== null && stock > 0 && variant.available !== false && variant.active !== false;
  }) || null;
}

function getHomeVariant(product = {}) {
  const variants = Array.isArray(product.available_variants)
    ? product.available_variants
    : Array.isArray(product.variants)
      ? product.variants
      : [];

  return getAvailableVariant(product) || (
    getStockValue(product) !== null && getStockValue(product) > 0
      ? product
      : null
  ) || null;
}

function getHomeDisplayProduct(product = {}) {
  const availableVariant = getHomeVariant(product);

  if (!availableVariant) {
    return {
      ...product,
      oldPrice: getVariantDisplayOldPrice(product, product.oldPrice),
      price: getVariantDisplayPrice(product, product.price),
    };
  }

  const selectedSize = getVariantAttributeValue(availableVariant, ["age", "size"]) || product.sizes?.[0] || "Free Size";
  const variantImages = Array.isArray(availableVariant.images) && availableVariant.images.length > 0
    ? availableVariant.images
    : [availableVariant.image, availableVariant.image_url].filter(Boolean);

  return {
    ...product,
    ...availableVariant,
    id: String(availableVariant.id || product.id),
    title: cleanProductTitle(availableVariant.name || product.title) || product.title,
    image: availableVariant.image || availableVariant.image_url || product.image,
    images: variantImages.length > 0 ? variantImages : product.images,
    oldPrice: getVariantDisplayOldPrice(availableVariant, getVariantDisplayOldPrice(product, product.oldPrice), product),
    price: getVariantDisplayPrice(availableVariant, product.price, product),
    stock: getStockValue(availableVariant),
    selectedSize,
    variantProductId: availableVariant.id || product.id,
    available_variants: product.available_variants,
    variants: product.variants,
    attribute_lines: product.attribute_lines,
    sizes: product.sizes,
    colors: product.colors,
  };
}

function isProductTemporarilyUnavailable(product = {}) {
  const stock = getStockValue(product);
  const variants = Array.isArray(product.available_variants)
    ? product.available_variants
    : Array.isArray(product.variants)
      ? product.variants
      : [];
  const hasPositiveVariantStock = variants.some((variant) => {
    const variantStock = getStockValue(variant);

    return variantStock !== null && variantStock > 0 && variant.available !== false && variant.active !== false;
  });

  return Boolean(
    product.temporary_not_available ||
      product.temporarily_unavailable ||
      product.is_temporarily_unavailable ||
      product.is_temporary_unavailable ||
      product.availability === "temporary_unavailable" ||
      product.availability === "out_of_stock" ||
      product.stock_status === "out_of_stock" ||
      product.available === false ||
      (stock !== null && stock <= 0 && !hasPositiveVariantStock),
  );
}

export default function Home() {
  const { isAuthenticated, user } = useAuthContext();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [guestInfo, setGuestInfo] = useState(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const {
    items: cartItems,
    count: cartCount,
    subtotal: cartSubtotal,
    tax: cartTax,
    delivery: cartDelivery,
    deliveryCarrier: cartDeliveryCarrier,
    currencySymbol: cartCurrencySymbol,
    total: cartTotal,
    addItem: addCartItem,
    updateQuantity,
    applyCoupon,
    resetLocalCart,
  } = useCart();
  const {
    items: wishlistItems,
    count: wishlistCount,
    isInWishlist,
    toggleWishlist,
  } = useWishlist();
  const {
    products,
    pagination: productsPagination,
    isLoading: isProductsLoading,
    isLoadingMore: isProductsLoadingMore,
    error: productsError,
    loadMore: loadMoreProducts,
    refetch: refetchProducts,
  } = useProducts({ page: 1, limit: 10 }, { initialData: initialProducts });
  const hasMoreProducts = productsPagination.hasMore;
  const userPricelistId = user?.pricelist_id || user?.active_pricelist?.id || "";

  useEffect(() => {
    if (userPricelistId) {
      refetchProducts();
    }
  }, [refetchProducts, userPricelistId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");

    if (!paymentStatus) return;

    if (paymentStatus === "success") {
      window.queueMicrotask(() => {
        setOrderPlaced(true);
      });
      clearServerCart().finally(() => {
        resetLocalCart();
      });
    } else {
      window.queueMicrotask(() => {
        setCartMessage(paymentStatus === "cancelled" ? "Payment cancelled" : "Payment failed");
        window.setTimeout(() => setCartMessage(""), 3000);
      });
    }

    params.delete("payment");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [resetLocalCart]);

  function openLoginDrawer() {
    const drawerToggle = document.getElementById("account-drawer-toggle");
    if (drawerToggle) {
      drawerToggle.checked = true;
    }
  }

  async function addToCart(product) {
    if (isProductTemporarilyUnavailable(product)) {
      setCartMessage("Temporarily not available");
      window.setTimeout(() => setCartMessage(""), 2400);
      return;
    }

    setIsAddingToCart(true);
    setOrderPlaced(false);
    setCartMessage("Adding to cart...");

    try {
      const response = await addCartItem(product);

      if (response) {
        setCartMessage("");
        setIsCartOpen(true);
      } else {
        setCartMessage("Could not add item to cart");
        window.setTimeout(() => setCartMessage(""), 2400);
      }
    } finally {
      setIsAddingToCart(false);
    }
  }

  function handleToggleWishlist(product) {
    if (!isAuthenticated) {
      openLoginDrawer();
      return;
    }

    toggleWishlist(product);
  }

  function handleOrderPlaced() {
    setOrderPlaced(true);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    resetLocalCart();
  }

  function startCheckout() {
    setIsCheckoutOpen(true);
  }

  return (
    <main className="bg-white text-[#222]">
      {/* <TopBar /> */}
      <Header cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
      <FloatingActions
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        onCartClick={() => setIsCartOpen(true)}
        onWishlistClick={() => setIsWishlistOpen(true)}
      />
      <Hero />
      <Collections />
      <ProductShowcase
        title="OUR PRODUCTS"
        variant="grid"
        products={products}
        isLoading={isProductsLoading}
        isLoadingMore={isProductsLoadingMore}
        error={productsError}
        hasMore={hasMoreProducts}
        onAddToCart={addToCart}
        onToggleWishlist={handleToggleWishlist}
        isInWishlist={isInWishlist}
        isAddingToCart={isAddingToCart}
        onLoadMore={loadMoreProducts}
      />
      <PromoBand />
      <ProductShowcase
        title="TRENDING NOW"
        variant="slider"
        products={products}
        onAddToCart={addToCart}
        onToggleWishlist={handleToggleWishlist}
        isInWishlist={isInWishlist}
        isAddingToCart={isAddingToCart}
      />
      <Blog />
      <Instagram />
      <StoreInfo />
      <Footer />
      <CartDrawer
        cartItems={cartItems}
        cartSubtotal={cartSubtotal}
        cartTax={cartTax}
        cartDelivery={cartDelivery}
        cartDeliveryCarrier={cartDeliveryCarrier}
        cartCurrencySymbol={cartCurrencySymbol}
        cartTotal={cartTotal}
        isOpen={isCartOpen}
        appliedCoupon={appliedCoupon}
        onCheckout={startCheckout}
        onClose={() => setIsCartOpen(false)}
        onApplyCoupon={applyCoupon}
        onCouponApplied={setAppliedCoupon}
        onUpdateQuantity={updateQuantity}
      />
      <WishlistDrawer
        wishlistItems={wishlistItems}
        isOpen={isWishlistOpen}
        onAddToCart={addToCart}
        onClose={() => setIsWishlistOpen(false)}
        onToggleWishlist={handleToggleWishlist}
      />
      {isCheckoutOpen && (
        <CheckoutModal
          cartItems={cartItems}
          cartSubtotal={cartSubtotal}
          cartTax={cartTax}
          cartDelivery={cartDelivery}
          cartDeliveryCarrier={cartDeliveryCarrier}
          cartCurrencySymbol={cartCurrencySymbol}
          cartTotal={cartTotal}
          appliedCoupon={appliedCoupon}
          user={user}
          guestInfo={guestInfo}
          onGuestInfoChange={setGuestInfo}
          onClose={() => setIsCheckoutOpen(false)}
          onOrderPlaced={handleOrderPlaced}
        />
      )}
      {orderPlaced && (
        <div className="fixed bottom-5 left-1/2 z-[10000] -translate-x-1/2 bg-[#222] px-6 py-3 text-sm font-semibold text-white shadow-2xl">
          Order placed successfully
        </div>
      )}
      {cartMessage && (
        <div className="fixed bottom-5 left-1/2 z-[10000] -translate-x-1/2 bg-[#222] px-6 py-3 text-sm font-semibold text-white shadow-2xl">
          <span className="inline-flex items-center gap-3">
            {isAddingToCart && <Loader variant="dots" size={34} label="Adding to cart" className="brightness-0 invert" />}
            {cartMessage}
          </span>
        </div>
      )}
    </main>
  );
}

function TopBar() {
  return (
    <div className="border-b border-[#efefef] bg-[#f7f7f7] text-xs text-[#666]">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-2 px-4 py-3 text-center md:flex-row">
        <p>
          Summer sale discount off{" "}
          <span className="font-semibold text-[#b59677]">50%</span>!{" "}
          <a className="font-semibold text-[#222]" href="#products">
            Shop Now
          </a>
        </p>
        <p className="hidden md:block">
          The Best Shopify Themes. MADE WITH LOVE
        </p>
        <div className="flex items-center gap-4">
          <span>United States USD $</span>
          <span>English</span>
        </div>
      </div>
    </div>
  );
}

function getSliderList(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.result?.sliders)) {
    return response.result.sliders;
  }

  if (Array.isArray(response?.sliders)) {
    return response.sliders;
  }

  if (Array.isArray(response?.data?.sliders)) {
    return response.data.sliders;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

function normalizeSlides(response) {
  return getSliderList(response)
    .filter((slide) => slide.active === true)
    .map((slide) => ({
      id: slide.id,
      name: slide.name || "New Collection",
      summary: slide.summary || "",
      image:
        typeof slide.image === "string" && slide.image ? slide.image : null,
      videoUrl: slide.video_url || "",
      action: "SHOP NOW",
    }));
}

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
  return (
    category.parent_id === false ||
    category.parent_id === null ||
    category.parent_id === undefined ||
    category.parent_id === ""
  );
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
      name: child.name || fullChildCategory?.name || String(id),
    };
  }

  return {
    id,
    name: fullChildCategory?.name || String(id),
  };
}

function normalizeCollections(response) {
  const categories = getCategoryList(response);
  const categoryById = new Map(categories.map((category) => [String(category.id), category]));

  return categories
    .filter((category) => isRootCategory(category) && isVisibleCategory(category) && category.name)
    .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0))
    .map((category) => {
      const children = Array.isArray(category.child_ids)
        ? category.child_ids
            .map((child) => getChildCategoryDetails(child, categoryById)?.name)
            .filter(Boolean)
            .slice(0, 3)
        : [];

      return {
        id: category.id,
        title: category.name,
        count:
          children.length > 0
            ? `${children.length} ${children.length === 1 ? "edit" : "edits"}`
            : "New arrivals",
        children,
        image: category.image,
        href: category.url || `/collections/${category.id}`,
      };
    });
}

function getCollectionClass(index) {
  const classes = [
    "md:min-h-[520px]",
    "md:min-h-[315px]",
    "md:min-h-[520px]",
    "md:min-h-[315px]",
    "md:min-h-[315px]",
    "md:min-h-[315px]",
  ];

  return classes[index] || "md:min-h-[315px]";
}

function getCollectionBackground(index) {
  const colors = [
    "#f1f1f0",
    "#edf3f0",
    "#f8f3f4",
    "#eeeeec",
    "#f2f5f7",
    "#f6f1ea",
  ];

  return colors[index % colors.length];
}

function getCollectionImageClass(index) {
  const classes = [
    "bottom-8 right-4 h-[72%] w-[78%] md:bottom-12 md:right-8 md:h-[76%] md:w-[78%]",
    "bottom-6 right-4 h-[68%] w-[68%] md:bottom-7 md:right-7 md:h-[72%] md:w-[66%]",
    "bottom-0 right-0 h-[72%] w-[78%] md:h-[76%] md:w-[74%]",
    "bottom-0 right-0 h-[72%] w-[86%] md:h-[74%] md:w-[82%]",
    "bottom-5 right-4 h-[68%] w-[72%] md:bottom-7 md:right-7 md:h-[70%] md:w-[70%]",
    "bottom-0 right-0 h-[72%] w-[80%] md:h-[74%] md:w-[76%]",
  ];

  return classes[index] || "bottom-0 right-0 h-[72%] w-[76%]";
}

function getCollectionColumns(collections) {
  if (collections.length <= 1) {
    return [collections, []];
  }

  return [
    collections.filter((_, index) => index === 0 || index === 3 || index === 4),
    collections.filter((_, index) => index === 1 || index === 2 || index > 4),
  ];
}

function Hero() {
  const [apiSlides, setApiSlides] = useState([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const slides = apiSlides.length > 0 ? apiSlides : fallbackSlides;

  useEffect(() => {
    const controller = new AbortController();

    async function loadSliders() {
      try {
        const response = await getSliders({ signal: controller.signal });
        if (controller.signal.aborted) return;

        const nextSlides = normalizeSlides(response);
        setApiSlides(nextSlides);
        setActiveSlideIndex(0);
      } catch (error) {
        if (error.code !== "REQUEST_ABORTED") {
          setApiSlides([]);
        }
      }
    }

    loadSliders();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveSlideIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, 4500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [slides.length]);

  const activeSlide = slides[activeSlideIndex] || slides[0];

  return (
    <section className="relative h-[350px] overflow-hidden bg-[#e8d9cf] md:h-[600px]">
      {slides.map((slide, index) => (
        <article
          key={slide.id || `${slide.name}-${index}`}
          className={`absolute inset-0 transition-opacity duration-700 ${index === activeSlideIndex ? "opacity-100" : "opacity-0"}`}
          aria-hidden={index !== activeSlideIndex}
        >
          {slide.image ? (
            <img
              src={slide.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: "center 5%" }}
            />
          ) : (
            // <img src={slide.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#eadfd7_0%,#9db9bd_55%,#2f4f5a_100%)]" />
          )}
          <div className="absolute inset-0 bg-black/20" />
        </article>
      ))}

      <div className="relative z-10 mx-auto flex h-full max-w-[1200px] items-center justify-center px-4 text-center text-white">
        <div>
          <p className="text-sm tracking-[0.18em] md:text-xl">
            {activeSlide.summary}
          </p>
          <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-[0.03em] md:text-5xl">
            {activeSlide.name}
          </h1>
          <a
            href="#products"
            className="mt-8 inline-flex min-h-11 items-center border border-white px-8 text-xs font-semibold tracking-[0.25em] transition hover:border-[#b59677] hover:bg-[#b59677]"
          >
            {activeSlide.action}
          </a>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-3">
        {slides.map((slide, index) => (
          <button
            key={`dot-${slide.id || index}`}
            type="button"
            className={`size-2.5 rounded-full border border-white transition ${index === activeSlideIndex ? "bg-white" : "bg-white/30"}`}
            aria-label={`Show slide ${index + 1}`}
            onClick={() => setActiveSlideIndex(index)}
          />
        ))}
      </div>
    </section>
  );
}

function Collections() {
  const [apiCollections, setApiCollections] = useState([]);
  const collections = apiCollections;
  const collectionColumns = getCollectionColumns(collections);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const response = await getCategories({ signal: controller.signal });
        if (controller.signal.aborted) return;

        setApiCollections(normalizeCollections(response));
      } catch (error) {
        if (error.code !== "REQUEST_ABORTED") {
          setApiCollections([]);
        }
      }
    }

    loadCategories();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <section className="mx-auto max-w-[1700px] px-4 pb-16 pt-7 md:px-8 md:pb-28 md:pt-10">
      <div className="mb-8 flex flex-col gap-4 border-y border-[#e7dfd6] py-6 md:mb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b59677]">
            Hoity Moppet
          </p>
          <h2 className="mt-2 text-3xl font-bold uppercase leading-tight text-[#1f1f1f] md:text-5xl">
            Shop by Collection
          </h2>
        </div>
        <a
          href="#products"
          className="inline-flex min-h-11 w-fit items-center justify-center border border-[#222] px-6 text-xs font-bold uppercase tracking-[0.18em] text-[#222] transition hover:bg-[#222] hover:text-white"
        >
          View all products
        </a>
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        {collections.length === 0 ? (
          <p className="text-sm font-medium text-[#777]">
            No active collections found.
          </p>
        ) : collectionColumns.map((column, columnIndex) => (
          <div
            key={`collection-column-${columnIndex}`}
            className="grid gap-6 md:gap-8"
          >
            {column.map((item) => {
              const index = collections.indexOf(item);

              return (
                <CollectionCard
                  key={item.id || item.title}
                  item={item}
                  index={index}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function CollectionCard({ item, index }) {
  return (
    <a
      href={item.href || "#products"}
      className={`group relative block min-h-[330px] overflow-hidden ${getCollectionClass(index)}`}
      style={{ backgroundColor: getCollectionBackground(index) }}
    >
      {item.image && (
        <img
          src={item.image}
          alt=""
          className={`absolute object-contain object-center transition duration-700 group-hover:scale-105 ${getCollectionImageClass(index)}`}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0.12)_58%,rgba(255,255,255,0)_100%)]" />
      <div className="relative z-10 flex h-full min-h-[330px] flex-col justify-between p-7 md:min-h-[inherit] md:p-10">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9a8a7a]">
            {String(index + 1).padStart(2, "0")}
          </p>
          <h2 className="mt-3 max-w-[72%] text-2xl font-semibold uppercase leading-tight tracking-[0.16em] text-[#4b5655] md:text-3xl">
            {item.title}
          </h2>
          <p className="mt-4 inline-flex items-center gap-4 font-serif text-2xl italic leading-none text-[#808080] transition group-hover:text-[#222]">
            Shop now <span className="font-sans text-2xl not-italic">→</span>
          </p>
        </div>

        <div className="flex max-w-[78%] flex-wrap gap-2">
          {(item.children || []).slice(0, 3).map((child) => (
            <span
              key={child}
              className="bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#5b6463]"
            >
              {child}
            </span>
          ))}
        </div>
      </div>
    </a>
  );
}

function getProductCardKey(product, index) {
  return [product?.id, product?.title, product?.image, index]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .join("-");
}

function getProductDetailHref(product) {
  const id = product?.id;

  if (id === undefined || id === null || id === "" || id === "undefined") {
    return null;
  }

  return `/products/${encodeURIComponent(String(id))}`;
}

function ProductShowcase({
  title,
  variant,
  products,
  isLoading = false,
  isLoadingMore = false,
  error = null,
  hasMore = false,
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
  isAddingToCart = false,
  onLoadMore,
}) {
  const visible = variant === "slider" ? products.slice(0, 3) : products;

  return (
    <section
      id={variant === "grid" ? "products" : undefined}
      className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 md:pb-28 lg:px-8"
    >
      <SectionTitle>{title}</SectionTitle>
      {variant === "grid" && (
        <div className="mb-10 flex flex-wrap justify-center gap-2 text-xs font-bold uppercase tracking-[0.12em]">
          {["Best Seller", "Sale", "Featured", "Top Rate"].map((tab, index) => (
            <button
              key={tab}
              className={`min-h-10 border px-5 transition ${
                index === 0
                  ? "border-[#222] bg-[#222] text-white"
                  : "border-[#ddd] bg-white text-[#555] hover:border-[#222]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}
      {isLoading && (
        <div className="mb-6 flex justify-center">
          <Loader variant="dots" size={86} label="Loading products" />
        </div>
      )}
      {error && (
        <p className="mb-6 text-center text-sm font-medium text-[#b59677]">
          Showing saved products while the API is unavailable.
        </p>
      )}
      <div
        className={
          variant === "slider"
            ? "grid gap-7 md:grid-cols-3"
            : "grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        {visible.map((product, index) => (
          <ProductCard
            key={getProductCardKey(product, index)}
            product={product}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
            isInWishlist={isInWishlist}
            isLoading={isLoading}
            isAddingToCart={isAddingToCart}
          />
        ))}
      </div>
      {variant === "slider" ? (
        <div className="mt-10 text-center">
          <a
            href="#products"
            className="inline-flex min-h-11 items-center bg-[#222] px-9 text-sm font-semibold text-white transition hover:bg-[#b59677]"
          >
            View All
          </a>
        </div>
      ) : hasMore ? (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex min-h-11 items-center bg-[#222] px-9 text-sm font-semibold text-white transition hover:bg-[#b59677] disabled:cursor-not-allowed disabled:bg-[#999]"
          >
            {isLoadingMore ? (
              <Loader variant="dots" size={44} label="Loading more products" className="brightness-0 invert" />
            ) : "Load More"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ProductCard({ product, onAddToCart, onToggleWishlist, isInWishlist, isLoading, isAddingToCart }) {
  const displayProduct = getHomeDisplayProduct(product);
  const productDetailHref = getProductDetailHref(displayProduct);
  const isSaved = isInWishlist?.(displayProduct.id) || false;
  const isUnavailable = isProductTemporarilyUnavailable(displayProduct);
  const productColors = (displayProduct.colors || []).filter(Boolean).slice(0, 4);

  return (
    <article className="group border border-[#eee7df] bg-white transition duration-300 hover:border-[#d8cabd] hover:shadow-[0_18px_45px_rgba(32,32,32,0.08)]">
      <div className="relative overflow-hidden bg-[#f4f1ee]">
        {isLoading ? (
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-[#ece8e3]">
            <Loader variant="bars" size={90} label="Loading product" />
          </div>
        ) : (
          <Link href={productDetailHref || "#"} aria-label={`View ${displayProduct.title}`}>
            <img
              src={displayProduct.image}
              alt={displayProduct.title}
              className="aspect-[3/4] w-full object-cover object-center transition duration-500 group-hover:scale-105"
            />
          </Link>
        )}
        <div className="absolute right-3 top-3 grid gap-2">
          <button
            type="button"
            onClick={() => onToggleWishlist?.(displayProduct)}
            className={`grid size-10 place-items-center bg-white text-2xl shadow-sm transition hover:bg-[#222] hover:text-white ${
              isSaved ? "text-[#b59677]" : "text-[#222]"
            }`}
            aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isSaved}
          >
            {isSaved ? "♥" : "♡"}
          </button>
          {productDetailHref && (
            <Link
              href={productDetailHref}
              className="grid size-10 place-items-center bg-white text-xl shadow-sm transition hover:bg-[#222] hover:text-white"
              aria-label={`View ${displayProduct.title}`}
            >
              ⌕
            </Link>
          )}
        </div>
        <div className="absolute inset-x-3 bottom-3 translate-y-4 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onAddToCart(displayProduct)}
            disabled={isUnavailable || isAddingToCart}
            className="min-h-12 w-full bg-[#222] px-4 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg transition hover:bg-[#b59677] disabled:cursor-not-allowed disabled:bg-white/90 disabled:text-[#999]"
          >
            {isAddingToCart ? "Adding..." : isUnavailable ? "Temporary Out of Stock" : "Add to cart"}
          </button>
        </div>
        {displayProduct.oldPrice && !isUnavailable && (
          <span className="absolute left-3 top-3 bg-[#b59677] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white">
            SALE
          </span>
        )}
        {isUnavailable && (
          <span className="absolute left-3 top-3 bg-[#222] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white">
            Temporary Out of Stock
          </span>
        )}
      </div>
      <div className="p-4 text-left">
        {displayProduct.ecommerceCategory && (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a29489]">
            {displayProduct.ecommerceCategory}
          </p>
        )}
        <h3 className="line-clamp-2 min-h-11 text-sm font-black uppercase leading-[1.45] tracking-[0.08em] text-[#4e5957]">
          {displayProduct.title}
        </h3>
      {displayProduct.selectedSize && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#777]">
          Size: {displayProduct.selectedSize}
        </p>
      )}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {displayProduct.oldPrice && (
              <del className="text-[#999]">{displayProduct.oldPrice}</del>
            )}
            <ins className="font-black text-[#222] no-underline">{displayProduct.price}</ins>
          </div>
          {productColors.length > 0 && (
            <div className="flex shrink-0 gap-1.5">
              {productColors.map((color) => (
                <span
                  key={color}
                  className="size-3.5 border border-[#ddd]"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductPreview({ product, onClose, onAddToCart }) {
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 px-4 py-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-full w-full max-w-[920px] overflow-y-auto bg-white shadow-2xl">
        <div className="grid md:grid-cols-2">
          <div className="bg-[#f7f7f7]">
            <img
              src={product.image}
              alt={product.title}
              className="h-full min-h-[340px] w-full object-cover"
            />
          </div>
          <div className="relative p-6 md:p-9">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 grid size-10 place-items-center border border-[#ddd] text-2xl leading-none transition hover:bg-[#222] hover:text-white"
              aria-label="Close product preview"
            >
              ×
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b59677]">
              Quick Preview
            </p>
            <h2 className="mt-4 pr-10 text-2xl font-semibold">
              {product.title}
            </h2>
            <div className="mt-3 flex gap-2 text-lg">
              {product.oldPrice && (
                <del className="text-[#999]">{product.oldPrice}</del>
              )}
              <ins className="text-[#222] no-underline">{product.price}</ins>
            </div>
            <p className="mt-5 text-sm leading-7 text-[#666]">
              {product.description}
            </p>
            <div className="mt-6">
              <p className="text-sm font-semibold">Color</p>
              <div className="mt-3 flex gap-2">
                {(product.colors || []).slice(0, 7).map((color, index) => (
                  <span
                    key={`${color}-${index}`}
                    className="size-7 rounded-full border border-[#ddd]"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold">Size</p>
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-xs font-bold uppercase tracking-[0.12em] text-[#b59677] underline-offset-4 transition hover:text-[#222] hover:underline"
                >
                  Size Guide
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(product.sizes || []).map((size) => (
                  <span
                    key={size}
                    className="grid min-h-10 min-w-12 place-items-center border border-[#ddd] px-3 text-sm"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onAddToCart(product);
                onClose();
              }}
              className="mt-8 flex min-h-12 w-full items-center justify-center bg-[#222] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#b59677]"
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>
      {isSizeGuideOpen && (
        <SizeGuideModal
          product={product}
          onClose={() => setIsSizeGuideOpen(false)}
        />
      )}
    </div>
  );
}

function FloatingActions({ cartCount, wishlistCount, onCartClick, onWishlistClick }) {
  if (wishlistCount <= 0) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9990] flex flex-col gap-3">
      <button
        type="button"
        onClick={onWishlistClick}
        className="flex min-h-12 items-center gap-3 bg-white px-5 text-sm font-semibold text-[#222] shadow-2xl transition hover:bg-[#b59677] hover:text-white"
        aria-label="Open wishlist"
      >
        <span>Wishlist</span>
        <span className="grid size-7 place-items-center rounded-full bg-[#b59677] text-white">
          {wishlistCount}
        </span>
      </button>
      {/* <button
        type="button"
        onClick={onCartClick}
        className="flex min-h-12 items-center gap-3 bg-[#222] px-5 text-sm font-semibold text-white shadow-2xl transition hover:bg-[#b59677]"
        aria-label="Open cart"
      > */}
        {/* <span>Cart</span>
        <span className="grid size-7 place-items-center rounded-full bg-white text-[#222]">
          {cartCount}
        </span>
      </button> */}
    </div>
  );
}

function WishlistDrawer({
  wishlistItems,
  isOpen,
  onAddToCart,
  onClose,
  onToggleWishlist,
}) {
  return (
    <div
      className={`fixed inset-0 z-[9999] ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        aria-label="Close wishlist"
      />
      <aside
        className={`absolute bottom-0 right-0 top-0 flex w-full max-w-[420px] flex-col bg-white shadow-[-16px_0_30px_rgba(0,0,0,0.2)] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Wishlist"
      >
        {wishlistItems.length > 0 && (
          <div className="flex h-[76px] items-center justify-between border-b border-[#eee] px-6">
            <h2 className="text-lg font-semibold">Wishlist</h2>
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 place-items-center border border-[#ddd] text-2xl leading-none"
              aria-label="Close wishlist"
            >
              ×
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {wishlistItems.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <p className="text-lg font-semibold">Your wishlist is empty</p>
                <p className="mt-2 text-sm text-[#666]">
                  Tap the heart on products you want to save.
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-5">
              {wishlistItems.map((item) => (
                <li key={item.wishlistId || item.id} className="grid grid-cols-[88px_1fr] gap-4">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="aspect-square w-full bg-[#f7f7f7] object-cover"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-[#666]">{item.price}</p>
                    {isProductTemporarilyUnavailable(item) && (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#b59677]">
                        Temporarily not available
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onAddToCart(item);
                          if (!isProductTemporarilyUnavailable(item)) {
                            onClose();
                          }
                        }}
                        disabled={isProductTemporarilyUnavailable(item)}
                        className="min-h-9 bg-[#222] px-4 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#b59677] disabled:cursor-not-allowed disabled:bg-[#aaa]"
                      >
                        Add to cart
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleWishlist?.(item)}
                        className="min-h-9 border border-[#ddd] px-4 text-xs font-semibold uppercase tracking-[0.1em] transition hover:border-[#222]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function CartDrawer({
  cartItems,
  cartSubtotal,
  cartTax,
  cartDelivery,
  cartDeliveryCarrier,
  cartCurrencySymbol = "₹",
  cartTotal,
  isOpen,
  appliedCoupon,
  onCheckout,
  onClose,
  onApplyCoupon,
  onCouponApplied,
  onUpdateQuantity,
}) {
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [couponMessage, setCouponMessage] = useState("");
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [applyingCouponCode, setApplyingCouponCode] = useState("");
  const cartProductSubtotal = cartItems.reduce((total, item) => total + parsePrice(item.price) * item.quantity, 0);
  const cartSummarySubtotal = appliedCoupon && cartProductSubtotal > 0 ? cartProductSubtotal : cartSubtotal;
  const summaryCurrencySymbol = cartCurrencySymbol || cartItems.find((item) => item.currency_symbol)?.currency_symbol || "₹";
  const cartDiscountAmount = getAppliedDiscountAmount({
    subtotal: cartProductSubtotal,
    tax: cartTax,
    delivery: cartDelivery,
    total: cartTotal,
  });

  async function openCouponModal() {
    setIsCouponModalOpen(true);
    setCouponMessage("");

    if (coupons.length > 0 || isLoadingCoupons) return;

    setIsLoadingCoupons(true);

    try {
      const payload = await getCustomerCoupons({ limit: 100 });
      const availableCoupons = Array.isArray(payload.available_coupons)
        ? payload.available_coupons
        : Array.isArray(payload.coupons)
          ? payload.coupons
          : [];

      setCoupons(availableCoupons.filter((coupon) => coupon.available !== false && coupon.is_available !== false));
    } catch (error) {
      setCouponMessage(error.message || "Could not load coupons.");
    } finally {
      setIsLoadingCoupons(false);
    }
  }

  async function applyCoupon(coupon) {
    const code = coupon?.code || coupon?.coupon_code || "";

    if (!code || applyingCouponCode) return;

    setApplyingCouponCode(code);
    setCouponMessage("");

    try {
      const response = await onApplyCoupon(code);
      onCouponApplied?.(response?.applied_coupon || response?.coupon || coupon);
      setCouponMessage("Coupon applied.");
      window.setTimeout(() => setIsCouponModalOpen(false), 500);
    } catch (error) {
      setCouponMessage(error.message || "Could not apply coupon.");
    } finally {
      setApplyingCouponCode("");
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        aria-label="Close cart"
      />
      <aside
        className={`absolute bottom-0 right-0 top-0 flex w-full max-w-[420px] flex-col bg-white shadow-[-16px_0_30px_rgba(0,0,0,0.2)] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Shopping cart"
      >
        <div className="flex h-[76px] items-center justify-between border-b border-[#eee] px-6">
          <h2 className="text-lg font-semibold">Shopping Cart</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center border border-[#ddd] text-2xl leading-none"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {cartItems.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <p className="text-lg font-semibold">Your cart is empty</p>
                <p className="mt-2 text-sm text-[#666]">
                  Preview a Product and add it when something feels right.
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-5">
              {cartItems.map((item) => (
                <li key={item.cartKey || item.id} className="grid grid-cols-[88px_1fr] gap-4">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="aspect-square w-full bg-[#f7f7f7] object-cover"
                  />
                  <div>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-[#666]">{item.price}</p>
                    {item.selectedSize && (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#777]">
                        Size: {item.selectedSize}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(item.cartKey || item.id, item.quantity - 1)
                        }
                        className="grid size-9 place-items-center border border-[#ddd]"
                      >
                        −
                      </button>
                      <span className="grid size-9 place-items-center border border-[#ddd] text-sm">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(item.cartKey || item.id, item.quantity + 1)
                        }
                        className="grid size-9 place-items-center border border-[#ddd]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {cartItems.length > 0 && (
          <div className="border-t border-[#eee] p-6">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatCurrencyAmount(cartSummarySubtotal, summaryCurrencySymbol)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Taxes</span>
                <span>{formatCurrencyAmount(cartTax, summaryCurrencySymbol)}</span>
              </div>
              {(cartDelivery > 0 || cartDeliveryCarrier) && (
                <div className="flex items-center justify-between">
                  <span>{cartDeliveryCarrier ? `Delivery (${cartDeliveryCarrier})` : "Delivery"}</span>
                  <span>{formatCurrencyAmount(cartDelivery, summaryCurrencySymbol)}</span>
                </div>
              )}
              {appliedCoupon && (
                <div className="flex items-center justify-between text-[#267341]">
                  <span>Discount ({formatAppliedCouponDiscount(appliedCoupon, cartDiscountAmount, summaryCurrencySymbol) || appliedCoupon.code})</span>
                  <span>{cartDiscountAmount > 0 ? `-${formatCurrencyAmount(cartDiscountAmount, summaryCurrencySymbol)}` : "Applied"}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[#eee] pt-3 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrencyAmount(cartTotal, summaryCurrencySymbol)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={openCouponModal}
              className="mt-5 flex min-h-11 w-full items-center justify-between border border-[#ded7ce] bg-[#fbf8f3] px-4 text-left text-sm font-semibold text-[#333] transition hover:border-[#b59677]"
            >
              <span>Available coupons</span>
              <span className="text-xs uppercase tracking-[0.12em] text-[#8b6a4b]">Select</span>
            </button>
            <button
              type="button"
              onClick={onCheckout}
              className="mt-3 flex min-h-12 w-full items-center justify-center bg-[#222] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#b59677]"
            >
              Checkout
            </button>
          </div>
        )}
      </aside>
      {isCouponModalOpen && (
        <div className="absolute inset-0 z-10 grid place-items-end bg-black/45 sm:place-items-center">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setIsCouponModalOpen(false)}
            aria-label="Close coupons"
          />
          <div className="relative max-h-[82vh] w-full overflow-hidden bg-white shadow-2xl sm:max-w-[390px]">
            <div className="flex min-h-15 items-center justify-between border-b border-[#eee] px-5">
              <p className="text-base font-semibold text-[#222]">Available coupons</p>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="grid size-9 place-items-center border border-[#ddd] text-xl leading-none"
                aria-label="Close coupons"
              >
                ×
              </button>
            </div>
            <div className="max-h-[calc(82vh-60px)] overflow-y-auto p-5">
              {couponMessage && (
                <p className="mb-3 border border-[#eadfce] bg-[#fbf8f3] px-3 py-2 text-sm font-semibold text-[#6d5437]">
                  {couponMessage}
                </p>
              )}
              {isLoadingCoupons ? (
                <div className="grid place-items-center py-8">
                  <Loader variant="dots" size={64} label="Loading coupons" />
                </div>
              ) : coupons.length === 0 ? (
                <p className="py-8 text-center text-sm font-semibold text-[#666]">No available coupons.</p>
              ) : (
                <ul className="space-y-3">
                  {coupons.map((coupon, index) => {
                    const code = coupon.code || coupon.coupon_code || "";
                    const discount = formatCouponDiscount(coupon, summaryCurrencySymbol);
                    const isApplying = applyingCouponCode === code;

                    return (
                      <li key={coupon.id || code || index} className="border border-[#eee3d4] bg-[#fffdf9] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-base font-bold text-[#222]">{coupon.name || code || "Coupon"}</p>
                            {code && (
                              <p className="mt-1 inline-flex border border-dashed border-[#b59677] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#8b6a4b]">
                                {code}
                              </p>
                            )}
                          </div>
                          {discount && <p className="shrink-0 text-sm font-black text-[#267341]">{discount}</p>}
                        </div>
                        <p className="mt-3 text-xs font-semibold leading-5 text-[#666]">
                          {[coupon.type_label, coupon.voucher_type_label, getCouponExpiry(coupon)]
                            .filter(Boolean)
                            .join(" | ")}
                        </p>
                        <button
                          type="button"
                          disabled={!code || Boolean(applyingCouponCode)}
                          onClick={() => applyCoupon(coupon)}
                          className="mt-4 flex min-h-10 w-full items-center justify-center bg-[#222] px-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#b59677] disabled:cursor-not-allowed disabled:bg-[#aaa]"
                        >
                          {isApplying ? (
                            <Loader variant="dots" size={42} label="Applying coupon" className="brightness-0 invert" />
                          ) : "Apply Coupon"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCouponDiscount(coupon = {}) {
  const value = Number(coupon.voucher_value || coupon.discount || coupon.amount || 0);
  const ownCurrencySymbol = getOwnCurrencySymbol(coupon);

  if (!Number.isFinite(value) || value <= 0) return "";

  return String(coupon.type || "").toLowerCase().includes("percentage")
    ? `${value}% off`
    : ownCurrencySymbol
      ? `${formatCurrencyAmount(value, ownCurrencySymbol)} off`
      : "";
}

function formatAppliedCouponDiscount(coupon = {}, discountAmount = 0, currencySymbol = "₹") {
  const value = Number(coupon.voucher_value || coupon.discount || coupon.amount || 0);
  const appliedAmount = Number(discountAmount || 0);

  if (String(coupon.type || "").toLowerCase().includes("percentage") && Number.isFinite(value) && value > 0) {
    return `${value}% off`;
  }

  if (Number.isFinite(appliedAmount) && appliedAmount > 0) {
    return `${formatCurrencyAmount(appliedAmount, currencySymbol)} off`;
  }

  return formatCouponDiscount(coupon, currencySymbol);
}

function getCouponExpiry(coupon = {}) {
  const expiry = coupon.end_date || coupon.expiry_date || coupon.voucher?.expiry_date;

  return expiry ? `Valid till ${expiry}` : "";
}

function getAppliedDiscountAmount({ subtotal = 0, tax = 0, delivery = 0, total = 0 } = {}) {
  const discount = Number(subtotal || 0) + Number(tax || 0) + Number(delivery || 0) - Number(total || 0);

  return Number.isFinite(discount) && discount > 0 ? discount : 0;
}

function getOptionId(option = {}) {
  if (Array.isArray(option)) {
    return getOptionId(option[0]);
  }

  const value = option.id ?? option.country_id ?? option.state_id ?? option.value;
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? String(number) : "";
}

function getOptionName(option = {}) {
  if (Array.isArray(option)) {
    return option[1] || "";
  }

  return option.name || option.country || option.state || option.label || option.display_name || "";
}

function GuestInfoFields({ form, onChange, countries = [], states = [], isLoadingCountries = false, isLoadingStates = false }) {
  return (
    <div className="border border-[#eee] p-4">
      <h3 className="font-semibold">Shipping address</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <CheckoutField label="Full name" name="name" value={form.name} onChange={onChange} />
        <CheckoutField label="Email" name="email" type="email" value={form.email} onChange={onChange} required={false} />
        <label className="mt-4 block text-sm font-semibold sm:col-span-2">
          Phone
          <span className="mt-2 grid grid-cols-[96px_1fr]">
            <select
              name="countryCode"
              value={form.countryCode}
              onChange={onChange}
              className="h-12 border border-r-0 border-[#ddd] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#b59677]"
            >
              <option value="+91">+91</option>
              <option value="+1">+1</option>
              <option value="+44">+44</option>
              <option value="+61">+61</option>
              <option value="+971">+971</option>
            </select>
            <input
              required
              name="phone"
              type="tel"
              value={form.phone}
              onChange={onChange}
              className="h-12 w-full border border-[#ddd] px-4 text-sm font-normal outline-none transition focus:border-[#b59677]"
            />
          </span>
        </label>
      </div>
      <CheckoutField label="Street" name="street" value={form.street} onChange={onChange} />
      <CheckoutField label="Street 2" name="street2" value={form.street2} onChange={onChange} required={false} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CheckoutField label="City" name="city" value={form.city} onChange={onChange} />
        <CheckoutField label="Pincode" name="zip" value={form.zip} onChange={onChange} />
        <CheckoutSelect
          label="State"
          name="state_id"
          value={form.state_id}
          onChange={onChange}
          options={states}
          placeholder={isLoadingStates ? "Loading states..." : "Select State"}
        />
        <CheckoutSelect
          label="Country"
          name="country_id"
          value={form.country_id}
          onChange={onChange}
          options={countries}
          placeholder={isLoadingCountries ? "Loading countries..." : "Select Country"}
        />
      </div>
    </div>
  );
}

const blankAddressForm = {
  name: "",
  email: "",
  phone: "",
  mobile: "",
  street: "",
  street2: "",
  city: "",
  zip: "",
  state_id: "",
  country_id: "104",
};

function getPartnerId(user) {
  const partnerId = (
    user?.partner_id ||
    user?.partner?.id ||
    user?.id ||
    null
  );

  return Array.isArray(partnerId) ? partnerId[0] : partnerId;
}

function formatAddress(address) {
  return [
    address.street,
    address.street2,
    address.city,
    address.state,
    address.zip,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildAddressPayload(form, partnerId, type) {
  const payload = {
    type,
  };

  if (partnerId) {
    payload.partner_id = partnerId;
  }

  Object.entries(form).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      payload[key] = value;
    }
  });

  return payload;
}

function getApiId(value) {
  if (Array.isArray(value)) {
    return getApiId(value[0]);
  }

  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function getGuestPhone(guestInfo = {}) {
  return [guestInfo.countryCode, guestInfo.phone]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeZipValue(value) {
  return String(value ?? "").trim();
}

function normalizeGuestInfo(guestInfo = {}) {
  const info = guestInfo || {};

  return {
    name: (info.name || "").trim(),
    email: (info.email || "").trim(),
    phone: (info.phone || "").trim(),
    countryCode: info.countryCode || "+91",
    street: (info.street || "").trim(),
    street2: (info.street2 || "").trim(),
    city: (info.city || "").trim(),
    zip: normalizeZipValue(info.zip),
    state: (info.state || "").trim(),
    state_id: String(info.state_id || info.stateId || ""),
    country: (info.country || "India").trim(),
    country_id: String(info.country_id || info.countryId || "104"),
  };
}

function isGuestInfoComplete(guestInfo = {}) {
  const normalizedGuestInfo = normalizeGuestInfo(guestInfo);

  return Boolean(
    normalizedGuestInfo.name &&
      normalizedGuestInfo.phone &&
      normalizedGuestInfo.street &&
      normalizedGuestInfo.city &&
      normalizedGuestInfo.zip &&
      normalizedGuestInfo.state &&
      normalizedGuestInfo.country,
  );
}

function getGuestAddress(guestInfo) {
  if (!guestInfo) return null;

  const phone = getGuestPhone(guestInfo);

  return {
    id: "guest",
    name: guestInfo.name,
    email: guestInfo.email,
    phone,
    mobile: phone,
    street: guestInfo.street,
    street2: guestInfo.street2,
    city: guestInfo.city,
    zip: guestInfo.zip,
    state: guestInfo.state,
    country: guestInfo.country,
    isGuest: true,
  };
}

function getGuestPayload(guestInfo) {
  if (!guestInfo) return {};

  const phone = getGuestPhone(guestInfo);
  const countryId = getApiId(guestInfo.country_id || guestInfo.countryId) || 104;
  const stateId = getApiId(guestInfo.state_id || guestInfo.stateId);
  const zip = normalizeZipValue(guestInfo.zip);
  const customer = {
    name: guestInfo.name,
    email: guestInfo.email,
    phone,
    mobile: phone,
    street: guestInfo.street,
    street2: guestInfo.street2,
    city: guestInfo.city,
    zip,
    country_id: countryId,
    ...(stateId ? { state_id: stateId } : {}),
  };

  return {
    is_guest_checkout: true,
    guest_checkout: true,
    create_guest_partner: true,
    update_guest_partner: true,
    customer,
    customer_data: customer,
    shipping: customer,
    shipping_address: customer,
    billing: customer,
    billing_address: customer,
    guest_name: guestInfo.name,
    guest_email: guestInfo.email,
    guest_phone: phone,
    partner_name: guestInfo.name,
    partner_email: guestInfo.email,
    partner_phone: phone,
    partner_mobile: phone,
    partner_street: guestInfo.street,
    partner_street2: guestInfo.street2,
    partner_city: guestInfo.city,
    partner_zip: zip,
    partner_state: guestInfo.state,
    partner_country: guestInfo.country,
    customer_name: guestInfo.name,
    customer_email: guestInfo.email,
    customer_phone: phone,
    name: guestInfo.name,
    email: guestInfo.email,
    phone,
    mobile: phone,
    street: guestInfo.street,
    street2: guestInfo.street2,
    city: guestInfo.city,
    zip,
    country_id: countryId,
    ...(stateId ? { state_id: stateId } : {}),
    state: guestInfo.state,
    country: guestInfo.country,
    shipping_name: guestInfo.name,
    shipping_email: guestInfo.email,
    shipping_phone: phone,
    shipping_street: guestInfo.street,
    shipping_street2: guestInfo.street2,
    shipping_city: guestInfo.city,
    shipping_zip: zip,
    shipping_country_id: countryId,
    ...(stateId ? { shipping_state_id: stateId } : {}),
    shipping_state: guestInfo.state,
    shipping_country: guestInfo.country,
  };
}

function getOrderPartnerId(order = {}) {
  order = order || {};
  const partnerId = order.partner_id || order.partner?.id || order.cart?.partner_id || order.order?.partner_id;

  return Array.isArray(partnerId) ? partnerId[0] : partnerId;
}

function getOrderCurrency(order = {}) {
  order = order || {};

  return (
    order.currency ||
    order.currency_name ||
    order.cart?.currency ||
    order.order?.currency ||
    "INR"
  );
}

function getOrderCurrencyId(order = {}) {
  order = order || {};
  const currency = (
    order.currency_id ||
    order.currency?.id ||
    order.pricelist_id?.currency_id ||
    order.pricelist?.currency_id ||
    order.cart?.currency_id ||
    order.cart?.currency?.id ||
    order.order?.currency_id ||
    order.order?.currency?.id ||
    process.env.NEXT_PUBLIC_DEFAULT_CURRENCY_ID ||
    20
  );

  return Array.isArray(currency) ? currency[0] : currency;
}

function buildDraftOrderPayload(cartItems, partnerId, shippingAddressId, billingAddressId, order, carrierId, guestInfo) {
  const carrierValue = carrierId === "" || carrierId === null
    ? 0
    : carrierId ?? order?.carrier_id ?? order?.delivery_id ?? order?.carrier?.id ?? 0;
  const selectedCarrierId = Number(carrierValue);
  const productItems = cartItems.filter((item) => !isCheckoutDeliveryItem(item));
  const productLines = productItems.map((item) => {
    const productId = Number(item.variantProductId || item.productVariantId || item.id);
    const quantity = Number(item.quantity || 1);

    return {
      line_id: item.lineId,
      cart_line_id: item.lineId,
      product_id: productId,
      available_variant_id: productId,
      product_uom_qty: quantity,
      quantity,
      qty: quantity,
      set_qty: quantity,
      price_unit: parsePrice(item.price),
      selected_size: item.selectedSize,
      selected_color: item.selectedColor,
      name: [item.title, item.selectedSize ? `Size: ${item.selectedSize}` : ""]
        .filter(Boolean)
        .join(" - "),
    };
  });
  const shippingId = getApiId(shippingAddressId);
  const billingId = getApiId(billingAddressId);
  const orderPartnerId = getOrderPartnerId(order);
  const effectivePartnerId = partnerId || (guestInfo ? null : orderPartnerId);
  const currencyId = getOrderCurrencyId(order);

  const payload = {
    order_id: getOrderId(order),
    access_token: order?.access_token,
    ...(currencyId ? { currency_id: Number(currencyId) } : {}),
    currency: getOrderCurrency(order),
    ...(effectivePartnerId ? { partner_id: effectivePartnerId } : {}),
    ...(shippingId ? { partner_shipping_id: shippingId } : {}),
    ...(billingId ? { partner_invoice_id: billingId } : {}),
    ...getGuestPayload(guestInfo),
    ...(selectedCarrierId ? { carrier_id: selectedCarrierId, delivery_id: selectedCarrierId } : {}),
    send_email: false,
    notify: false,
    mail_notify: false,
    skip_mail: true,
    context: {
      mail_create_nosubscribe: true,
      mail_notrack: true,
      tracking_disable: true,
    },
    cart_line_ids: productItems.map((item) => item.lineId).filter(Boolean),
  };

  if (!payload.order_id) {
    payload.lines = productLines;
  }

  return payload;
}

function isCheckoutDeliveryItem(item = {}) {
  const title = String(item.title || item.name || item.product_name || "").toLowerCase();
  const type = String(item.type || item.line_type || item.display_type || "").toLowerCase();

  return Boolean(
    item.is_delivery ||
      item.delivery_line ||
      item.is_delivery_line ||
      item.is_shipping ||
      item.shipping_line ||
      item.carrier_id ||
      item.delivery_id ||
      type.includes("delivery") ||
      type.includes("shipping") ||
      title.includes("delivery") ||
      title.includes("shipping"),
  );
}

function isMailDraftStateError(error) {
  return String(error || "").includes("Wrong value for mail.mail.state: 'draft'");
}

function isPartnerRequiredError(error) {
  const message = String(error?.message || error || "").toLowerCase();

  return message.includes("partner_id required") || message.includes("customer login");
}

function isDeliveryCarrierUnavailableError(error) {
  const message = String(error?.message || error || "").toLowerCase();

  return message.includes("delivery carrier not available") || message.includes("carrier not available");
}

function getOrderId(order) {
  const orderId = (
    order?.id ||
    order?.order_id ||
    order?.sale_order_id ||
    order?.so_id ||
    order?.order?.id ||
    order?.order?.order_id ||
    null
  );

  return Array.isArray(orderId) ? orderId[0] : orderId;
}

function getPaymentGatewayList(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.gateways)) {
    return response.gateways;
  }

  if (Array.isArray(response?.result?.gateways)) {
    return response.result.gateways;
  }

  if (Array.isArray(response?.data?.gateways)) {
    return response.data.gateways;
  }

  return [];
}

function getDeliveryCarrierList(response) {
  const payload = response?.result || response || {};
  const order = payload.order || payload.cart || payload || {};
  const candidates = [
    payload.delivery_methods,
    payload.carriers,
    payload.deliveryMethods,
    payload.available_carriers,
    order.delivery_methods,
    order.carriers,
  ];
  const carriers = candidates.find(Array.isArray) || [];

  return carriers
    .map((carrier) => ({
      ...carrier,
      id: carrier.id || carrier.carrier_id || carrier.delivery_id,
      name: carrier.name || carrier.carrier || carrier.display_name || "Delivery",
      price: Number(carrier.price ?? carrier.delivery_price ?? carrier.amount ?? carrier.rate ?? 0),
      message: carrier.delivery_message || carrier.message || carrier.error_message || "",
    }))
    .filter((carrier) => carrier.id);
}

function getOrderAmount(order = {}, key, fallback = 0) {
  order = order || {};
  const value = order[key] ?? order.cart?.[key] ?? order.order?.[key];
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function getOrderDeliveryPrice(order = {}) {
  return getOrderAmount(order, "delivery_price", 0);
}

function getOrderDeliveryCarrier(order = {}) {
  order = order || {};

  return order.carrier || order.delivery?.name || order.cart?.carrier || order.order?.carrier || "";
}

function getUpdatedOrderFromPayload(response, fallbackOrder = {}) {
  const payload = response?.result || response || {};
  const order = payload.cart || payload.order || payload;

  return {
    ...(fallbackOrder || {}),
    ...order,
    amount_untaxed: getOrderAmount(order, "amount_untaxed", getOrderAmount(payload, "amount_untaxed", getOrderAmount(fallbackOrder, "amount_untaxed", 0))),
    amount_tax: getOrderAmount(order, "amount_tax", getOrderAmount(payload, "amount_tax", getOrderAmount(fallbackOrder, "amount_tax", 0))),
    amount_total: getOrderAmount(order, "amount_total", getOrderAmount(payload, "amount_total", getOrderAmount(fallbackOrder, "amount_total", 0))),
    delivery_price: getOrderDeliveryPrice(order) || getOrderDeliveryPrice(payload) || getOrderDeliveryPrice(fallbackOrder),
    carrier: getOrderDeliveryCarrier(order) || getOrderDeliveryCarrier(payload) || getOrderDeliveryCarrier(fallbackOrder),
  };
}

function resolveOdooAssetUrl(src) {
  if (!src) {
    return src;
  }

  const url = new URL(src, `${odooAssetBaseUrl}/`);

  if (url.origin !== odooAssetBaseUrl) {
    return src;
  }

  return `/api/odoo-asset/${url.pathname.replace(/^\/+/g, "")}${url.search}`;
}

function normalizePaymentActionUrl(actionUrl) {
  if (!actionUrl) {
    return actionUrl;
  }

  return String(actionUrl)
    .replace(/^http:\/\/(apitest\.payu\.in|test\.payu\.in|secure\.payu\.in)/i, "https://$1")
    .replace(/^http:\/\/(.*payumoney.*)$/i, "https://$1");
}

function getPaymentProvider(paymentData, gateway) {
  return String(paymentData?.provider || gateway?.provider || gateway?.name || "").toLowerCase();
}

function isRazorpayPayment({ html, paymentData, provider } = {}) {
  const fields = paymentData?.form_fields || {};
  const haystack = [
    getPaymentProvider(paymentData, { provider }),
    paymentData?.checkout_js,
    paymentData?.action_url,
    fields.provider,
    fields.key,
    fields.key_id,
    fields.razorpay_key,
    fields.razorpay_key_id,
    html,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes("razorpay");
}

function getValidRazorpayOrderId(value) {
  const orderId = String(value || "").trim();

  return orderId.startsWith("order_") ? orderId : "";
}

function getRazorpayAmount(value) {
  const rawValue = String(value || "").trim();
  const number = Number(rawValue);

  if (!Number.isFinite(number) || number <= 0) {
    return "";
  }

  if (rawValue.includes(".")) {
    return String(Math.round(number * 100));
  }

  return String(Math.round(number));
}

function getPaymentCallbackBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_PAYMENT_CALLBACK_BASE_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/g, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

function getPaymentFormConfig({ html, paymentData, provider = "" }) {
  const formFields = paymentData?.form_fields || {};
  const fields = { ...formFields };
  let actionUrl = paymentData?.action_url || "";
  let method = paymentData?.method || "POST";

  if (html) {
    const template = document.createElement("template");
    template.innerHTML = html;

    template.content.querySelectorAll("input[name]").forEach((input) => {
      if (input.name) {
        fields[input.name] = input.value || "";
      }

      if (!actionUrl && input.dataset?.actionUrl) {
        actionUrl = input.dataset.actionUrl;
      }
    });
  }

  const callbackBaseUrl = getPaymentCallbackBaseUrl();
  if (callbackBaseUrl && provider.includes("payu")) {
    fields.surl = `${callbackBaseUrl}/payment/payumoney/return`;
    fields.furl = `${callbackBaseUrl}/payment/payumoney/error`;
    fields.curl = `${callbackBaseUrl}/payment/payumoney/cancel`;
  }

  return {
    actionUrl: normalizePaymentActionUrl(actionUrl),
    method: method || "POST",
    fields,
  };
}

function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);

    if (existingScript) {
      resolve(existingScript);
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error("Could not load payment gateway script."));
    document.body.appendChild(script);
  });
}

function PaymentGatewayForm({ html, paymentData, provider, transaction, onPaymentSuccess, onVerificationChange }) {
  const gatewayRef = useRef(null);
  const formRef = useRef(null);
  const [formConfig, setFormConfig] = useState(null);
  const [gatewayMessage, setGatewayMessage] = useState("Opening the secure payment gateway...");

  useEffect(() => {
    const gatewayNode = gatewayRef.current;

    if (!gatewayNode || (!html && !paymentData)) return undefined;

    gatewayNode.innerHTML = "";
    const paymentProvider = getPaymentProvider(paymentData, { provider });
    const nextFormConfig = getPaymentFormConfig({ html, paymentData, provider: paymentProvider });
    const isRazorpay = isRazorpayPayment({ html, paymentData, provider });
    setFormConfig(nextFormConfig);

    if (!html || isRazorpay) {
      return () => {
        gatewayNode.innerHTML = "";
      };
    }

    const template = document.createElement("template");
    template.innerHTML = html;
    const scripts = Array.from(template.content.querySelectorAll("script"));

    scripts.forEach((script) => script.remove());
    gatewayNode.appendChild(template.content.cloneNode(true));

    const mountedScripts = scripts.map((script) => {
      const nextScript = document.createElement("script");
      let shouldMountScript = true;

      Array.from(script.attributes).forEach((attribute) => {
        const nextValue = attribute.name === "src"
          ? resolveOdooAssetUrl(attribute.value)
          : attribute.value;

        if (attribute.name === "src" && (!nextValue || nextValue.includes("/undefined"))) {
          shouldMountScript = false;
          return;
        }

        nextScript.setAttribute(attribute.name, nextValue);
      });

      if (!shouldMountScript) {
        return null;
      }

      if (!nextScript.src && script.textContent) {
        nextScript.textContent = script.textContent;
      }

      gatewayNode.appendChild(nextScript);
      return nextScript;
    }).filter(Boolean);

    return () => {
      mountedScripts.forEach((script) => script.remove());
      gatewayNode.innerHTML = "";
    };
  }, [html, paymentData, provider]);

  useEffect(() => {
    const paymentProvider = getPaymentProvider(paymentData, { provider });
    if (paymentProvider.includes("razorpay") || isRazorpayPayment({ html, paymentData, provider }) || !formConfig?.actionUrl || !formRef.current) return;

    formRef.current.submit();
  }, [formConfig, html, paymentData, provider]);

  async function openRazorpayCheckout() {
    const paymentProvider = getPaymentProvider(paymentData, { provider });
    if (!paymentProvider.includes("razorpay") && !isRazorpayPayment({ html, paymentData, provider })) return;

    try {
      setGatewayMessage("Opening Razorpay...");
      await loadExternalScript(paymentData?.checkout_js || "https://checkout.razorpay.com/v1/checkout.js");

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout script did not load.");
      }

      const fields = {
        ...(formConfig?.fields || {}),
        ...(paymentData?.form_fields || {}),
      };
      const gatewayError = paymentData?.error || paymentData?.result?.error || fields.error;
      if (gatewayError) {
        throw new Error(String(gatewayError));
      }

      const key = paymentData?.key || paymentData?.key_id || fields.key || fields.key_id || fields.razorpay_key || fields.razorpay_key_id;
      const amount = getRazorpayAmount(paymentData?.amount || fields.amount || fields.amount_total || fields.total);
      const razorpayOrderId = getValidRazorpayOrderId(
        paymentData?.razorpay_order_id ||
          paymentData?.razorpayOrderId ||
          paymentData?.razorpay_order ||
          paymentData?.order_id ||
        fields.razorpay_order_id ||
          fields.razorpayOrderId ||
          fields.razorpay_order ||
          fields.orderId,
      );
      const customerName = fields.name || fields.firstname || fields.customer_name || fields.partner_name || "";
      const customerEmail = fields.email || fields.customer_email || fields.partner_email || "";
      const customerContact = fields.contact || fields.phone || fields.mobile || fields.customer_phone || fields.partner_phone || "";
      const transactionReference = (
        transaction?.reference ||
        fields.reference ||
        fields.txnid ||
        fields.order_reference ||
        fields.order_id ||
        ""
      );

      if (!key || !amount) {
        throw new Error("Razorpay payment fields are incomplete.");
      }

      const razorpay = new window.Razorpay({
        key,
        amount,
        ...(razorpayOrderId ? { order_id: razorpayOrderId } : {}),
        currency: fields.currency || fields.currency_id || "INR",
        name: fields.merchant_name || customerName || "Payment",
        description: fields.order_id || transaction?.reference || "Order payment",
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerContact,
        },
        notes: {
          order_reference: fields.order_id || transactionReference,
          transaction_id: transaction?.id || "",
        },
        handler: async (response) => {
          try {
            onVerificationChange?.(true);
            setGatewayMessage("Verifying Razorpay payment...");

            await onPaymentSuccess?.({
              transaction_id: transaction?.id,
              reference: transactionReference,
              order_reference: fields.order_id || transactionReference,
              gateway_payment_id: response.razorpay_payment_id,
              gateway_order_id: response.razorpay_order_id,
              gateway_signature: response.razorpay_signature,
            });
          } catch (error) {
            onVerificationChange?.(false);
            setGatewayMessage(error.message || "Could not verify Razorpay payment.");
          }
        },
        modal: {
          ondismiss: () => {
            setGatewayMessage("Payment was not completed. Click Open Razorpay Payment to try again.");
          },
        },
      });

      razorpay.open();
    } catch (error) {
      setGatewayMessage(error.message || "Could not open Razorpay.");
    }
  }

  if (!html && !paymentData) {
    return null;
  }

  const currentProvider = getPaymentProvider(paymentData, { provider });
  const isRazorpay = currentProvider.includes("razorpay") || isRazorpayPayment({ html, paymentData, provider });
  const visibleGatewayMessage = isRazorpay && gatewayMessage === "Opening the secure payment gateway..."
    ? "Click Open Razorpay Payment to continue."
    : gatewayMessage;
  const isVerifyingGatewayPayment = gatewayMessage === "Verifying Razorpay payment...";

  return (
    <div className="border border-[#ddd] bg-white p-4">
      <div ref={gatewayRef} className="payment-gateway-form" />
      {formConfig?.actionUrl && !isRazorpay && (
        <form
          ref={formRef}
          action={formConfig.actionUrl}
          method={formConfig.method}
          className="hidden"
        >
          {Object.entries(formConfig.fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={String(value ?? "")} readOnly />
          ))}
        </form>
      )}
      {!isVerifyingGatewayPayment && (
        <div className="mt-3 flex items-center gap-3 text-xs leading-5 text-[#666]">
          <Loader variant="dots" size={44} label="Loading payment gateway" />
          <span>{visibleGatewayMessage}</span>
        </div>
      )}
      {isRazorpay && (
        <button
          type="button"
          onClick={openRazorpayCheckout}
          className="mt-3 min-h-11 w-full bg-[#222] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#b59677]"
        >
          Open Razorpay Payment
        </button>
      )}
      {formConfig?.actionUrl && (
        <button
          type="button"
          onClick={() => formRef.current?.submit()}
          className="mt-3 min-h-11 w-full bg-[#222] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#b59677]"
        >
          Open Payment Gateway
        </button>
      )}
    </div>
  );
}

function CheckoutModal({
  cartItems,
  cartSubtotal,
  cartTax,
  cartDelivery,
  cartDeliveryCarrier,
  cartCurrencySymbol = "₹",
  cartTotal,
  appliedCoupon,
  user,
  guestInfo,
  onGuestInfoChange,
  onClose,
  onOrderPlaced,
}) {
  const partnerId = getPartnerId(user);
  const isGuestCheckout = !partnerId;
  const [guestForm, setGuestForm] = useState(() => normalizeGuestInfo(guestInfo));
  const normalizedGuestInfo = useMemo(() => normalizeGuestInfo(guestForm), [guestForm]);
  const hasGuestInfo = isGuestInfoComplete(guestForm);
  const checkoutGuestInfo = isGuestCheckout ? normalizedGuestInfo : guestInfo;
  const guestAddress = useMemo(
    () => (isGuestCheckout && hasGuestInfo ? getGuestAddress(checkoutGuestInfo) : null),
    [checkoutGuestInfo, hasGuestInfo, isGuestCheckout],
  );
  const [step, setStep] = useState("review");
  const [addresses, setAddresses] = useState(() => (guestAddress ? [guestAddress] : []));
  const [shippingAddressId, setShippingAddressId] = useState(() => (guestAddress ? "guest" : ""));
  const [billingAddressId, setBillingAddressId] = useState(() => (guestAddress ? "guest" : ""));
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [addressForm, setAddressForm] = useState({
    ...blankAddressForm,
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || user?.mobile || "",
    mobile: user?.mobile || "",
  });
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(Boolean(partnerId));
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false);
  const [isApplyingDelivery, setIsApplyingDelivery] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [deliveryMethods, setDeliveryMethods] = useState([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState("");
  const [paymentGateways, setPaymentGateways] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("gateway");
  const [selectedGatewayId, setSelectedGatewayId] = useState("");
  const [paymentFormHtml, setPaymentFormHtml] = useState("");
  const [paymentData, setPaymentData] = useState(null);
  const [paymentTransaction, setPaymentTransaction] = useState(null);
  const [isPaymentVerifying, setIsPaymentVerifying] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);

  useEffect(() => {
    if (!partnerId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadAddresses() {
      setIsLoadingAddresses(true);
      setCheckoutError("");

      try {
        const payload = await getCustomerAddresses(
          { partner_id: partnerId },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;

        const nextAddresses = Array.isArray(payload.addresses) ? payload.addresses : [];
        setAddresses(nextAddresses);
        setShippingAddressId(String(nextAddresses[0]?.id || ""));
        setBillingAddressId(String(nextAddresses[0]?.id || ""));
        setIsAddressFormOpen(nextAddresses.length === 0);
      } catch (error) {
        if (error.code !== "REQUEST_ABORTED") {
          setCheckoutError(error.message || "Could not load addresses.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingAddresses(false);
        }
      }
    }

    loadAddresses();

    return () => {
      controller.abort();
    };
  }, [partnerId]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCountries() {
      setIsLoadingCountries(true);

      try {
        const payload = await getCountries({}, { signal: controller.signal });
        if (controller.signal.aborted) return;

        const nextCountries = Array.isArray(payload.countries) ? payload.countries : [];
        setCountries(nextCountries);

        if (isGuestCheckout) {
          setGuestForm((currentForm) => {
            const currentCountryId = currentForm.country_id || "104";
            const selectedCountry = nextCountries.find((country) => getOptionId(country) === String(currentCountryId));

            return {
              ...currentForm,
              country_id: String(currentCountryId),
              country: selectedCountry ? getOptionName(selectedCountry) : currentForm.country,
            };
          });
        }
      } catch (error) {
        if (error.code !== "REQUEST_ABORTED") {
          setCheckoutError(error.message || "Could not load countries.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCountries(false);
        }
      }
    }

    loadCountries();

    return () => {
      controller.abort();
    };
  }, [isGuestCheckout]);

  useEffect(() => {
    const countryId = isGuestCheckout ? guestForm.country_id : addressForm.country_id;
    if (!countryId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadStates() {
      setIsLoadingStates(true);

      try {
        const payload = await getStates({ country_id: Number(countryId) }, { signal: controller.signal });
        if (controller.signal.aborted) return;

        const nextStates = Array.isArray(payload.states) ? payload.states : [];
        setStates(nextStates);
      } catch (error) {
        if (error.code !== "REQUEST_ABORTED") {
          setCheckoutError(error.message || "Could not load states.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingStates(false);
        }
      }
    }

    loadStates();

    return () => {
      controller.abort();
    };
  }, [addressForm.country_id, guestForm.country_id, isGuestCheckout]);

  function updateAddressForm(event) {
    const { name, value } = event.target;
    setAddressForm((currentForm) => ({
      ...currentForm,
      [name]: value,
      ...(name === "country_id" ? { state_id: "" } : {}),
    }));
  }

  function resetAddressForm() {
    setEditingAddressId(null);
    setAddressForm({
      ...blankAddressForm,
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || user?.mobile || "",
      mobile: user?.mobile || "",
    });
  }

  function editAddress(address) {
    setEditingAddressId(address.id);
    setAddressForm({
      name: address.name || "",
      email: address.email || "",
      phone: address.phone || "",
      mobile: address.mobile || "",
      street: address.street || "",
      street2: address.street2 || "",
      city: address.city || "",
      zip: address.zip || "",
      state_id: getOptionId(address.state_id) || "",
      country_id: getOptionId(address.country_id) || "104",
    });
    setIsAddressFormOpen(true);
  }

  async function saveAddress(event) {
    event.preventDefault();

    if (!partnerId) {
      setCheckoutError("Guest checkout only needs user information.");
      return;
    }

    setIsSavingAddress(true);
    setCheckoutError("");

    try {
      const payload = buildAddressPayload(addressForm, partnerId, "delivery");
      const createPayload = addresses.length > 0
        ? { ...payload, add_another_address: true }
        : payload;
      const response = editingAddressId
        ? await updateCustomerAddress({ ...payload, address_id: editingAddressId })
        : await createCustomerAddress(createPayload);
      const savedAddress = response.address;

      if (!savedAddress) {
        throw new Error("Address was not returned by the server.");
      }

      setAddresses((currentAddresses) => {
        const exists = currentAddresses.some((address) => address.id === savedAddress.id);
        return exists
          ? currentAddresses.map((address) => (address.id === savedAddress.id ? savedAddress : address))
          : [...currentAddresses, savedAddress];
      });
      setShippingAddressId(String(savedAddress.id));
      setBillingAddressId(String(savedAddress.id));
      setSameAsShipping(true);
      setIsAddressFormOpen(false);
      resetAddressForm();
    } catch (error) {
      setCheckoutError(error.message || "Could not save address.");
    } finally {
      setIsSavingAddress(false);
    }
  }

  async function loadPaymentGateways(order) {
    const orderId = getOrderId(order);

    if (!orderId) {
      setPaymentGateways([]);
      setSelectedGatewayId("");
      setSelectedPaymentMethod("gateway");
      return;
    }

    const gatewaysResponse = await getPaymentGateways({
      order_id: orderId,
      access_token: order?.access_token,
    });

    if (gatewaysResponse?.error) {
      throw new Error(gatewaysResponse.error);
    }

    const gateways = getPaymentGatewayList(gatewaysResponse);
    const gatewayOrder = gatewaysResponse?.order || gatewaysResponse?.result?.order || order;

    setCheckoutOrder(gatewayOrder);
    setPaymentGateways(gateways);
    setSelectedGatewayId(String(gateways[0]?.id || ""));
    setSelectedPaymentMethod("gateway");
  }

  function updateGuestForm(event) {
    const { name, value } = event.target;
    setGuestForm((currentForm) => {
      if (name === "country_id") {
        const selectedCountry = countries.find((country) => getOptionId(country) === String(value));
        return {
          ...currentForm,
          country_id: value,
          country: selectedCountry ? getOptionName(selectedCountry) : "",
          state_id: "",
          state: "",
        };
      }

      if (name === "state_id") {
        const selectedState = states.find((state) => getOptionId(state) === String(value));
        return {
          ...currentForm,
          state_id: value,
          state: selectedState ? getOptionName(selectedState) : "",
        };
      }

      return { ...currentForm, [name]: value };
    });
  }

  async function refreshCartTaxes(order) {
    const orderId = getOrderId(order);
    const currentShippingAddressId = isGuestCheckout ? "guest" : shippingAddressId;
    const currentBillingAddressId = isGuestCheckout ? "guest" : billingAddressId;
    const billingId = sameAsShipping ? currentShippingAddressId : currentBillingAddressId;
    const shippingApiId = getApiId(currentShippingAddressId);
    const billingApiId = getApiId(billingId);
    const taxesResponse = await calculateCartTaxes({
      order_id: orderId,
      access_token: order?.access_token,
      ...(partnerId ? { partner_id: partnerId } : {}),
      ...(shippingApiId ? { partner_shipping_id: shippingApiId } : {}),
      ...(billingApiId ? { partner_invoice_id: billingApiId } : {}),
      ...getGuestPayload(checkoutGuestInfo),
    });
    const nextOrder = getUpdatedOrderFromPayload(taxesResponse, order);

    setCheckoutOrder(nextOrder);
    return nextOrder;
  }

  async function createDraftOrderSummary(order, carrierId = selectedDeliveryId) {
    const currentShippingAddressId = isGuestCheckout ? "guest" : shippingAddressId;
    const currentBillingAddressId = isGuestCheckout ? "guest" : billingAddressId;
    const billingId = sameAsShipping ? currentShippingAddressId : currentBillingAddressId;
    const orderResponse = await createOrder(
      buildDraftOrderPayload(
        cartItems,
        partnerId,
        currentShippingAddressId,
        billingId,
        order,
        carrierId,
        checkoutGuestInfo,
      ),
    );

    if (orderResponse?.error) {
      if (isMailDraftStateError(orderResponse.error)) {
        setCheckoutOrder(order);
        return order;
      }

      if (carrierId && isDeliveryCarrierUnavailableError(orderResponse.error)) {
        setSelectedDeliveryId("");
        return createDraftOrderSummary(order, "");
      }

      throw new Error(orderResponse.error);
    }

    const nextOrder = getUpdatedOrderFromPayload(orderResponse, order);

    setCheckoutOrder(nextOrder);
    return nextOrder;
  }

  async function goToDelivery() {
    if (isGuestCheckout && !hasGuestInfo) {
      setCheckoutError("Please enter name, phone and complete shipping address.");
      return;
    }

    const currentShippingAddressId = isGuestCheckout ? "guest" : shippingAddressId;
    const currentBillingAddressId = isGuestCheckout ? "guest" : billingAddressId;

    if (!currentShippingAddressId) {
      setCheckoutError("Please select or add a shipping address.");
      return;
    }

    if (!sameAsShipping && !currentBillingAddressId) {
      setCheckoutError("Please select a billing address.");
      return;
    }

    if ((!partnerId && !isGuestCheckout) || cartItems.length === 0) return;

    setIsPreparingPayment(true);
    setIsLoadingDelivery(true);
    setCheckoutError("");

    try {
      if (isGuestCheckout) {
        onGuestInfoChange?.(checkoutGuestInfo);
      }

      const billingId = sameAsShipping ? currentShippingAddressId : currentBillingAddressId;
      const shippingApiId = getApiId(currentShippingAddressId);
      const billingApiId = getApiId(billingId);
      const draftOrder = await createDraftOrderSummary(checkoutOrder, "");
      const draftOrderId = getOrderId(draftOrder);
      const deliveryResponse = await getDeliveryMethods({
        order_id: draftOrderId,
        access_token: draftOrder?.access_token,
        ...(partnerId ? { partner_id: partnerId } : {}),
        ...(shippingApiId ? { partner_shipping_id: shippingApiId } : {}),
        ...(billingApiId ? { partner_invoice_id: billingApiId } : {}),
        ...getGuestPayload(checkoutGuestInfo),
        include_rates: true,
      });
      const methods = getDeliveryCarrierList(deliveryResponse);
      const deliveryOrder = deliveryResponse.order || deliveryResponse.cart || deliveryResponse;

      setCheckoutOrder(deliveryOrder);
      setDeliveryMethods(methods);
      const defaultDeliveryId = String(deliveryOrder?.carrier_id || methods[0]?.id || "");
      setSelectedDeliveryId(defaultDeliveryId);

      if (methods.length > 0) {
        setStep("delivery");
        if (defaultDeliveryId) {
          const appliedOrder = await applyDeliverySelection(defaultDeliveryId, { order: deliveryOrder });
          if (appliedOrder?.__skipDeliveryCarrier) {
            const draftOrder = await createDraftOrderSummary(appliedOrder, "");
            await loadPaymentGateways(draftOrder);
            setDeliveryMethods([]);
            setStep("payment");
          }
          if (isGuestCheckout) {
            setCheckoutError("");
          }
        }
      } else {
        const taxedOrder = isGuestCheckout ? deliveryOrder : await refreshCartTaxes(deliveryOrder);
        await loadPaymentGateways(taxedOrder);
        setStep("payment");
      }

      setPaymentFormHtml("");
      setPaymentData(null);
      setPaymentTransaction(null);
    } catch (error) {
      setCheckoutError(
        error.code === "REQUEST_TIMEOUT"
          ? "Delivery methods are taking longer than expected. Please try again after a moment."
          : error.message || "Could not prepare delivery.",
      );
    } finally {
      setIsPreparingPayment(false);
      setIsLoadingDelivery(false);
    }
  }

  async function applyDeliverySelection(deliveryId, { order = checkoutOrder } = {}) {
    if (!deliveryId) {
      setCheckoutError("Please select a delivery method.");
      return null;
    }

    if (!order) return null;

    setSelectedDeliveryId(String(deliveryId));
    setIsApplyingDelivery(true);
    setCheckoutError("");

    try {
      const currentShippingAddressId = isGuestCheckout ? "guest" : shippingAddressId;
      const currentBillingAddressId = isGuestCheckout ? "guest" : billingAddressId;
      const billingId = sameAsShipping ? currentShippingAddressId : currentBillingAddressId;
      const shippingApiId = getApiId(currentShippingAddressId);
      const billingApiId = getApiId(billingId);
      const response = await applyDeliveryCarrier({
        carrier_id: Number(deliveryId),
        delivery_id: Number(deliveryId),
        order_id: getOrderId(order),
        access_token: order?.access_token,
        ...(partnerId ? { partner_id: partnerId } : {}),
        ...(shippingApiId ? { partner_shipping_id: shippingApiId } : {}),
        ...(billingApiId ? { partner_invoice_id: billingApiId } : {}),
        ...getGuestPayload(checkoutGuestInfo),
      });
      const nextOrder = response.cart || response.order || order;

      setCheckoutOrder(nextOrder);
      return nextOrder;
    } catch (error) {
      if (isGuestCheckout && isPartnerRequiredError(error)) {
        setCheckoutOrder(order);
        setCheckoutError("");
        return order;
      }

      if (isDeliveryCarrierUnavailableError(error)) {
        const nextOrder = {
          ...order,
          carrier_id: null,
          delivery_id: null,
          carrier: "",
          __skipDeliveryCarrier: true,
        };

        setSelectedDeliveryId("");
        setCheckoutOrder(nextOrder);
        setCheckoutError("");
        return nextOrder;
      }

      setCheckoutError(error.message || "Could not apply delivery method.");
      return null;
    } finally {
      setIsApplyingDelivery(false);
    }
  }

  async function applyDeliveryAndGoToPayment() {
    if (!selectedDeliveryId) {
      setCheckoutError("Please select a delivery method.");
      return;
    }

    const nextOrder = await applyDeliverySelection(selectedDeliveryId);

    if (!nextOrder) return;

    try {
      setIsPreparingPayment(true);
      const taxedOrder = isGuestCheckout ? nextOrder : await refreshCartTaxes(nextOrder);
      const draftOrder = await createDraftOrderSummary(
        taxedOrder,
        nextOrder.__skipDeliveryCarrier ? "" : selectedDeliveryId,
      );
      await loadPaymentGateways(draftOrder);
      setPaymentFormHtml("");
      setPaymentData(null);
      setPaymentTransaction(null);
      setStep("payment");
    } catch (error) {
      setCheckoutError(error.message || "Could not prepare payment.");
    } finally {
      setIsPreparingPayment(false);
    }
  }

  async function confirmOrder() {
    if ((!partnerId && !isGuestCheckout) || cartItems.length === 0) return;

    setIsPlacingOrder(true);
    setCheckoutError("");

    try {
      if (paymentTransaction) {
        await validateCurrentPayment();
        return;
      }

      if (!selectedGatewayId) {
        throw new Error("Please select a payment gateway.");
      }

      const orderId = getOrderId(checkoutOrder);
      if (!orderId) {
        throw new Error("Order id was not returned by the server.");
      }

      const currencyId = getOrderCurrencyId(checkoutOrder);
      const response = await createPaymentTransaction({
        order_id: orderId,
        access_token: checkoutOrder?.access_token,
        acquirer_id: Number(selectedGatewayId),
        gateway_id: Number(selectedGatewayId),
        amount: getOrderAmount(checkoutOrder, "amount_total", summaryTotal),
        currency: getOrderCurrency(checkoutOrder),
        ...(currencyId ? { currency_id: Number(currencyId) } : {}),
      });

      if (response?.error) {
        throw new Error(response.error);
      }

      setPaymentTransaction(response?.transaction || null);
      setPaymentFormHtml(response?.payment_form || "");
      setPaymentData(response?.payment_data || null);
    } catch (error) {
      setCheckoutError(error.message || "Could not start payment.");
    } finally {
      setIsPlacingOrder(false);
    }
  }

  async function validateCurrentPayment(gatewayPayload = {}) {
    const orderId = getOrderId(checkoutOrder);
    const transactionId = paymentTransaction?.id || paymentTransaction?.transaction_id;
    const transactionReference = gatewayPayload.reference || paymentTransaction?.reference || "";
    const {
      payment_id: _paymentId,
      payment_token: _paymentToken,
      razorpay_payment_id: _razorpayPaymentId,
      razorpay_paymentid: _razorpayPaymentIdAlt,
      token: _token,
      txn_id: _txnId,
      txnid: _txnid,
      ...safeGatewayPayload
    } = gatewayPayload;
    const paymentToken = (
      paymentData?.payment_token ||
      paymentData?.form_fields?.payment_token ||
      paymentData?.form_fields?.token ||
      ""
    );

    if (!orderId) {
      throw new Error("Order id was not returned by the server.");
    }

    const response = await validatePayment({
      order_id: orderId,
      access_token: checkoutOrder?.access_token,
      transaction_id: transactionId,
      reference: transactionReference,
      gateway_id: Number(selectedGatewayId),
      acquirer_id: Number(selectedGatewayId),
      ...safeGatewayPayload,
      ...(paymentToken ? {
        payment_token: paymentToken,
        token: paymentToken,
      } : {}),
    });

    if (response?.error) {
      throw new Error(response.error);
    }

    onOrderPlaced(response?.order || response?.cart || checkoutOrder);
    if (typeof window !== "undefined") {
      window.location.href = "/?payment=success";
    }
  }

  const checkoutAddresses = isGuestCheckout ? (guestAddress ? [guestAddress] : []) : addresses;
  const currentShippingAddressId = isGuestCheckout ? "guest" : shippingAddressId;
  const currentBillingAddressId = isGuestCheckout ? "guest" : billingAddressId;
  const selectedShippingAddress = checkoutAddresses.find(
    (address) => String(address.id) === String(currentShippingAddressId),
  );
  const selectedBillingAddress = sameAsShipping
    ? selectedShippingAddress
    : checkoutAddresses.find((address) => String(address.id) === String(currentBillingAddressId));
  const visibleCheckoutError = checkoutError || (!partnerId && !isGuestCheckout
    ? "Please enter user information to continue checkout."
    : "");
  const selectedDeliveryMethod = deliveryMethods.find((method) => String(method.id) === String(selectedDeliveryId));
  const selectedGateway = paymentGateways.find((gateway) => String(gateway.id) === String(selectedGatewayId));
  const selectedPaymentProvider = getPaymentProvider(null, selectedGateway);
  const shouldAutoValidatePayment = selectedPaymentProvider.includes("razorpay");
  const checkoutProductItems = cartItems.filter((item) => !isCheckoutDeliveryItem(item));
  const checkoutProductSubtotal = checkoutProductItems.reduce((total, item) => total + parsePrice(item.price) * item.quantity, 0);
  const summaryTax = checkoutOrder ? getOrderAmount(checkoutOrder, "amount_tax", cartTax) : cartTax;
  const appliedDelivery = checkoutOrder ? getOrderDeliveryPrice(checkoutOrder) : cartDelivery;
  const summaryDelivery = appliedDelivery || selectedDeliveryMethod?.price || 0;
  const discountedSubtotal = checkoutOrder ? getOrderAmount(checkoutOrder, "amount_untaxed", cartSubtotal) : cartSubtotal;
  const summarySubtotal = appliedCoupon && checkoutProductSubtotal > 0 ? checkoutProductSubtotal : discountedSubtotal;
  const summaryDeliveryCarrier = getOrderDeliveryCarrier(checkoutOrder || {}) || selectedDeliveryMethod?.name || cartDeliveryCarrier;
  const summaryTotal = checkoutOrder ? getOrderAmount(checkoutOrder, "amount_total", cartTotal) : cartTotal;
  const summaryCurrencySymbol = getCurrencySymbol(checkoutOrder, cartCurrencySymbol || user?.currency_symbol || "₹");
  const summaryDiscountAmount = getAppliedDiscountAmount({
    subtotal: checkoutProductSubtotal,
    tax: summaryTax,
    delivery: summaryDelivery,
    total: summaryTotal,
  });

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 px-4 py-6"
      role="dialog"
      aria-modal="true"
    >
      {isPaymentVerifying && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/45 px-4">
          <div className="w-full max-w-sm bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto grid size-20 place-items-center">
              <Loader variant="dots" size={78} label="Confirming payment" />
            </div>
            <p className="mt-4 text-lg font-black text-[#222]">Confirming payment</p>
            <p className="mt-2 text-sm leading-6 text-[#666]">
              Please wait while we verify your Razorpay payment and confirm the order.
            </p>
          </div>
        </div>
      )}
      <div className="max-h-full w-full max-w-[920px] overflow-y-auto bg-white p-6 shadow-2xl md:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Checkout</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center border border-[#ddd] text-2xl leading-none"
            aria-label="Close checkout"
          >
            ×
          </button>
        </div>
        <div className="mt-5 flex gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
          <span className={step === "review" ? "text-[#b59677]" : "text-[#777]"}>
            Review
          </span>
          <span className="text-[#bbb]">/</span>
          <span className={step === "delivery" ? "text-[#b59677]" : "text-[#777]"}>
            Delivery
          </span>
          <span className="text-[#bbb]">/</span>
          <span className={step === "payment" ? "text-[#b59677]" : "text-[#777]"}>
            Payment
          </span>
        </div>
        {visibleCheckoutError && (
          <div className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {visibleCheckoutError}
          </div>
        )}
        <div className="mt-7 grid gap-6 md:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            {step === "review" ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold">Billing and shipping</h3>
                  {!isGuestCheckout && (
                    <button
                      type="button"
                      onClick={() => {
                        resetAddressForm();
                        setIsAddressFormOpen(true);
                      }}
                      className="min-h-10 border border-[#222] px-4 text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-[#222] hover:text-white"
                    >
                      Add Address
                    </button>
                  )}
                </div>
                {isGuestCheckout ? (
                    <GuestInfoFields
                      form={guestForm}
                      onChange={updateGuestForm}
                      countries={countries}
                      states={states}
                      isLoadingCountries={isLoadingCountries}
                      isLoadingStates={isLoadingStates}
                    />
                ) : isLoadingAddresses ? (
                  <div className="flex items-center gap-3 border border-[#eee] p-5 text-sm text-[#666]">
                    <Loader variant="dots" size={48} label="Loading addresses" />
                    <span>Loading addresses...</span>
                  </div>
                ) : (
                  <AddressPicker
                    addresses={addresses}
                    title="Shipping address"
                    selectedAddressId={shippingAddressId}
                    onSelect={setShippingAddressId}
                    onEdit={editAddress}
                  />
                )}
                <label className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={sameAsShipping}
                    onChange={(event) => setSameAsShipping(event.target.checked)}
                    className="size-4 accent-[#b59677]"
                  />
                  Billing address is same as shipping
                </label>
                {!sameAsShipping && (
                  isGuestCheckout ? (
                    <div className="border border-[#eee] p-4 text-sm text-[#666]">
                      Billing address will use the same guest information.
                    </div>
                  ) : (
                    <AddressPicker
                      addresses={addresses}
                      title="Billing address"
                      selectedAddressId={billingAddressId}
                      onSelect={setBillingAddressId}
                      onEdit={editAddress}
                    />
                  )
                )}
                {!isGuestCheckout && isAddressFormOpen && (
                  <form onSubmit={saveAddress} className="border border-[#eee] p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <CheckoutField label="Full name" name="name" value={addressForm.name} onChange={updateAddressForm} />
                      <CheckoutField label="Email" name="email" type="email" value={addressForm.email} onChange={updateAddressForm} />
                      <CheckoutField label="Phone" name="phone" type="tel" value={addressForm.phone} onChange={updateAddressForm} />
                      <CheckoutField label="Mobile" name="mobile" type="tel" value={addressForm.mobile} onChange={updateAddressForm} required={false} />
                    </div>
                    <CheckoutField label="Street" name="street" value={addressForm.street} onChange={updateAddressForm} />
                    <CheckoutField label="Street 2" name="street2" value={addressForm.street2} onChange={updateAddressForm} required={false} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <CheckoutField label="City" name="city" value={addressForm.city} onChange={updateAddressForm} />
                      <CheckoutField label="Pincode" name="zip" value={addressForm.zip} onChange={updateAddressForm} />
                      <CheckoutSelect
                        label="State"
                        name="state_id"
                        value={addressForm.state_id}
                        onChange={updateAddressForm}
                        options={states}
                        placeholder={isLoadingStates ? "Loading states..." : "Select State"}
                        required={false}
                      />
                      <CheckoutSelect
                        label="Country"
                        name="country_id"
                        value={addressForm.country_id}
                        onChange={updateAddressForm}
                        options={countries}
                        placeholder={isLoadingCountries ? "Loading countries..." : "Select Country"}
                        required={false}
                      />
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="submit"
                        disabled={isSavingAddress}
                        className="min-h-11 bg-[#222] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#b59677] disabled:bg-[#bbb]"
                      >
                        {isSavingAddress ? (
                          <Loader variant="dots" size={44} label="Saving address" className="brightness-0 invert" />
                        ) : editingAddressId ? "Update Address" : "Save Address"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddressFormOpen(false);
                          resetAddressForm();
                        }}
                        className="min-h-11 border border-[#ddd] px-5 text-xs font-semibold uppercase tracking-[0.12em]"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : step === "delivery" ? (
              <div className="space-y-4">
                <h3 className="font-semibold">Delivery method</h3>
                {isLoadingDelivery ? (
                  <div className="flex items-center gap-3 border border-[#eee] p-5 text-sm text-[#666]">
                    <Loader variant="dots" size={48} label="Loading delivery methods" />
                    <span>Loading delivery methods...</span>
                  </div>
                ) : deliveryMethods.length > 0 ? (
                  <div className="space-y-3">
                    {deliveryMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex cursor-pointer items-center justify-between gap-4 border p-4 transition ${
                          String(selectedDeliveryId) === String(method.id)
                            ? "border-[#222] bg-white"
                            : "border-[#ddd] bg-[#fafafa]"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <input
                            type="radio"
                            name="delivery_method"
                            checked={String(selectedDeliveryId) === String(method.id)}
                            onChange={() => applyDeliverySelection(String(method.id))}
                            className="size-4 shrink-0 accent-[#b59677]"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{method.name}</span>
                            {method.message && (
                              <span className="mt-1 block text-xs leading-5 text-[#666]">{method.message}</span>
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold">
                          {formatCurrencyAmount(method.price || 0, getCurrencySymbol(method, summaryCurrencySymbol))}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="border border-[#eee] p-5 text-sm text-[#666]">
                    No delivery method required for this order.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold">Payment</h3>
                {paymentGateways.length > 0 ? (
                  <div className="space-y-3">
                    {paymentGateways.map((gateway) => (
                      <label
                        key={gateway.id}
                        className={`flex cursor-pointer items-center gap-3 border p-4 transition ${
                          selectedPaymentMethod === "gateway" && String(selectedGatewayId) === String(gateway.id)
                            ? "border-[#222] bg-white"
                            : "border-[#ddd] bg-[#fafafa]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          checked={selectedPaymentMethod === "gateway" && String(selectedGatewayId) === String(gateway.id)}
                          onChange={() => {
                            setSelectedPaymentMethod("gateway");
                            setSelectedGatewayId(String(gateway.id));
                            setPaymentFormHtml("");
                            setPaymentData(null);
                            setPaymentTransaction(null);
                            setIsPaymentVerifying(false);
                          }}
                          className="size-4 accent-[#b59677]"
                        />
                        {gateway.image_small || gateway.image ? (
                          <img
                            src={gateway.image_small || gateway.image}
                            alt=""
                            className="size-9 object-contain"
                          />
                        ) : null}
                        <span>
                          <span className="block text-sm font-semibold">{gateway.name}</span>
                          <span className="mt-1 block text-xs text-[#666]">
                            Pay securely with {gateway.provider || "online payment"}.
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="border border-[#eee] p-5 text-sm leading-6 text-[#666]">
                    No payment gateway is available for this draft order.
                  </div>
                )}
                {paymentTransaction && (
                  <div className="border border-[#d9ead8] bg-[#f4fbf3] p-4 text-sm text-[#2d672d]">
                    Payment transaction created
                      {paymentTransaction.reference ? `: ${paymentTransaction.reference}` : ""}.
                    <span className="mt-1 block text-[#4f754f]">
                      {shouldAutoValidatePayment
                        ? "Complete Razorpay payment to confirm the order automatically."
                        : "Complete the gateway payment, then validate it to confirm the order."}
                    </span>
                  </div>
                )}
                {(paymentFormHtml || paymentData) && (
                  <PaymentGatewayForm
                    html={paymentFormHtml}
                    paymentData={paymentData}
                    provider={selectedGateway?.provider}
                    transaction={paymentTransaction}
                    onPaymentSuccess={validateCurrentPayment}
                    onVerificationChange={setIsPaymentVerifying}
                  />
                )}
                <AddressPreview title="Shipping" address={selectedShippingAddress} />
                <AddressPreview title="Billing" address={selectedBillingAddress} />
              </div>
            )}
          </div>
          <div className="bg-[#f7f7f7] p-5">
            <h3 className="font-semibold">Order Summary</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {checkoutProductItems.map((item) => (
                <li key={item.cartKey || item.id} className="flex justify-between gap-4">
                  <span>
                    {item.title} × {item.quantity}
                    {item.selectedSize ? ` (${item.selectedSize})` : ""}
                  </span>
                  <span>
                    {formatCurrencyAmount(parsePrice(item.price) * item.quantity, getCurrencySymbol(item, summaryCurrencySymbol))}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-[#ddd] pt-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrencyAmount(summarySubtotal, summaryCurrencySymbol)}</span>
                </div>
                <div className="flex justify-between text-[#666]">
                  <span>Taxes</span>
                  <span>{formatCurrencyAmount(summaryTax, summaryCurrencySymbol)}</span>
                </div>
                {(summaryDelivery > 0 || summaryDeliveryCarrier) && (
                  <div className="flex justify-between text-[#666]">
                    <span>{summaryDeliveryCarrier ? `Delivery (${summaryDeliveryCarrier})` : "Delivery"}</span>
                    <span>{formatCurrencyAmount(summaryDelivery, summaryCurrencySymbol)}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-[#267341]">
                    <span>Discount ({formatAppliedCouponDiscount(appliedCoupon, summaryDiscountAmount, summaryCurrencySymbol) || appliedCoupon.code})</span>
                    <span>{summaryDiscountAmount > 0 ? `-${formatCurrencyAmount(summaryDiscountAmount, summaryCurrencySymbol)}` : "Applied"}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-between border-t border-[#ddd] pt-4 font-semibold">
                <span>Total</span>
                <span>{formatCurrencyAmount(summaryTotal, summaryCurrencySymbol)}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#666]">
                The order will be confirmed with the selected shipping and
                billing address.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {step !== "review" && (
            <button
              type="button"
              onClick={() => setStep(step === "payment" && deliveryMethods.length > 0 ? "delivery" : "review")}
              className="flex min-h-12 flex-1 items-center justify-center border border-[#ddd] px-6 text-sm font-semibold uppercase tracking-[0.12em] transition hover:border-[#222]"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={step === "review" ? goToDelivery : step === "delivery" ? applyDeliveryAndGoToPayment : confirmOrder}
            disabled={
              isLoadingAddresses ||
              isSavingAddress ||
              isPreparingPayment ||
              isLoadingDelivery ||
              isApplyingDelivery ||
              isPlacingOrder ||
              (!partnerId && !isGuestCheckout) ||
              (step === "payment" && !paymentTransaction && !selectedGatewayId) ||
              (step === "payment" && paymentTransaction && shouldAutoValidatePayment)
            }
            className="flex min-h-12 flex-[2] items-center justify-center bg-[#b59677] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#222] disabled:cursor-not-allowed disabled:bg-[#bbb]"
          >
            {step === "review"
              ? isPreparingPayment
                ? "Preparing Delivery..."
                : "Continue to Delivery"
              : step === "delivery"
                ? isApplyingDelivery
                  ? "Applying Delivery..."
                  : "Continue to Payment"
              : isPlacingOrder
                ? paymentTransaction
                  ? "Validating Payment..."
                  : "Starting Payment..."
                : paymentTransaction && shouldAutoValidatePayment
                  ? "Waiting for Payment"
                  : paymentTransaction
                  ? "Validate Payment"
                  : "Create Payment Transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressPicker({ addresses, title, selectedAddressId, onSelect, onEdit }) {
  if (addresses.length === 0) {
    return (
      <div className="border border-dashed border-[#ccc] p-5 text-sm text-[#666]">
        No saved addresses yet.
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      <div className="space-y-3">
        {addresses.map((address) => (
          <label
            key={address.id}
            className={`block cursor-pointer border p-4 transition ${
              String(selectedAddressId) === String(address.id)
                ? "border-[#b59677] bg-[#fbf8f4]"
                : "border-[#eee] hover:border-[#ccc]"
            }`}
          >
            <span className="flex items-start gap-3">
              <input
                type="radio"
                checked={String(selectedAddressId) === String(address.id)}
                onChange={() => onSelect(String(address.id))}
                className="mt-1 size-4 accent-[#b59677]"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{address.name}</span>
                <span className="mt-1 block text-sm leading-6 text-[#666]">
                  {formatAddress(address)}
                </span>
              <span className="mt-1 block text-xs text-[#777]">
                {[address.email, address.phone || address.mobile].filter(Boolean).join(" | ")}
              </span>
              </span>
              {!address.isGuest && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    onEdit(address);
                  }}
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b59677]"
                >
                  Edit
                </button>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function AddressPreview({ title, address }) {
  return (
    <div className="border border-[#eee] p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      {address ? (
        <>
          <p className="mt-2 text-sm font-semibold">{address.name}</p>
          <p className="mt-1 text-sm leading-6 text-[#666]">{formatAddress(address)}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-[#666]">No address selected.</p>
      )}
    </div>
  );
}

function CheckoutField({ label, name, value, onChange, type = "text", required = true }) {
  return (
    <label className="mt-4 block text-sm font-semibold">
      {label}
      <input
        required={required}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="mt-2 h-12 w-full border border-[#ddd] px-4 text-sm font-normal outline-none transition focus:border-[#b59677]"
      />
    </label>
  );
}

function CheckoutSelect({ label, name, value, onChange, options = [], placeholder = "Select", required = true }) {
  return (
    <label className="mt-4 block text-sm font-semibold">
      {label}
      <select
        required={required}
        name={name}
        value={value}
        onChange={onChange}
        className="mt-2 h-12 w-full border border-[#ddd] bg-white px-4 text-sm font-normal outline-none transition focus:border-[#b59677]"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const id = getOptionId(option);
          return id ? (
            <option key={id} value={id}>
              {getOptionName(option)}
            </option>
          ) : null;
        })}
      </select>
    </label>
  );
}

function PromoBand() {
  return (
    <section className="relative mb-16 h-[350px] overflow-hidden md:mb-28 md:h-[500px]">
      <img
        src={`https://hoitymoppet.com/web/image/product.slider/1/slider_image?unique=0bdbf88`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10 flex h-full items-center justify-center px-4 text-center text-white">
        <div>
          <p className="text-lg tracking-[0.15em]">MY NAME&apos;S HOITY</p>
          <h2 className="mt-4 text-3xl font-bold tracking-[0.04em] md:text-5xl">
            <span className="text-[#b59677]">HOITY</span> MOPPET
          </h2>
          <a
            href="#"
            className="mt-8 inline-flex min-h-11 items-center border border-white px-8 font-semibold transition hover:border-[#b59677] hover:bg-[#b59677]"
          >
            PURCHASE NOW
          </a>
        </div>
      </div>
    </section>
  );
}

function Blog() {
  return (
    <section className="bg-[#f7f7f7] px-4 py-16 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionTitle>LATEST NEWS</SectionTitle>
        <div className="grid gap-7 md:grid-cols-3">
          {posts.map((post) => (
            <article key={post.title} className="bg-white">
              <img
                src={post.image}
                alt=""
                className="aspect-[540/360] w-full object-cover"
              />
              <div className="p-7 text-center">
                <p className="text-xs uppercase tracking-[0.18em] text-[#999]">
                  {post.date}
                </p>
                <h3 className="mt-3 text-lg font-semibold">{post.title}</h3>
                <a
                  href="#"
                  className="mt-5 inline-flex text-sm font-semibold text-[#b59677]"
                >
                  Read more
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Instagram() {
  return (
    <section className="py-16 md:py-28">
      <SectionTitle>FOLLOW US ON INSTAGRAM</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-5">
        {instagram.map((image) => (
          <a
            key={image}
            href="#"
            className="group relative aspect-square overflow-hidden"
          >
            <img
              src={image}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            />
            <span className="absolute inset-0 grid place-items-center bg-black/0 text-2xl text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
              ◎
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function StoreInfo() {
  const { siteInfo } = useSiteInfo();
  const siteName = getSiteName(siteInfo);
  const siteEmail = getSiteEmail(siteInfo);

  return (
    <section className="relative h-[370px] overflow-hidden md:h-[554px]">
      <img
        src={`https://hoitymoppet.com/web/image/product.slider/1/slider_image?unique=0bdbf88`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="relative z-10 flex h-full items-center justify-center px-4 text-center text-white">
        <div className="bg-[#b59677]/90 px-8 py-10 md:px-32 md:py-16">
          <h2 className="text-xl font-bold tracking-[0.12em]">{siteName}.</h2>
          <p className="mt-3 text-sm">{siteEmail}</p>
          <div className="mx-auto my-5 h-px w-20 bg-white" />
          <h3 className="text-sm font-bold tracking-[0.12em]">Opening Hours</h3>
          <p className="mt-3 text-sm leading-7">
            Monday to Friday: 9:00 AM - 9:00 PM
            <br />
            Saturday to Sunday: 9:30 AM - 8:00 PM
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { siteInfo } = useSiteInfo();
  const siteLogo = getSiteLogo(siteInfo);
  const siteName = getSiteName(siteInfo);
  const siteEmail = getSiteEmail(siteInfo);
  const sitePhone = getSitePhone(siteInfo);
  const columns = [
    // ["CATEGORIES", "Men", "Women", "Accessories", "Shoes", "Baby", "Dress"],
    [
      "INFORMATION",
      "About Us",
      "Contact Us",
      "Terms & Conditions",
      "Returns & Exchanges",
      "Shipping & Delivery",
      "Privacy Policy",
    ],
    [
      "USEFUL LINKS",
      // "Store Location",
      "Latest News",
      "My Account",
      "Size Guide",
      // "Instructions",
      "FAQs",
    ],
  ];

  return (
    <footer className="bg-black text-white">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 md:grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_1.2fr] md:py-20">
        <div>
          <img
            src={siteLogo}
            alt={siteName}
            className="h-auto w-[190px]"
          />
          <div className="mt-8 space-y-4 text-sm leading-6 text-white/80">
            <p>{siteName}</p>
            {siteEmail && <p>{siteEmail}</p>}
            {sitePhone && <p>{sitePhone}</p>}
          </div>
          <div className="mt-7 flex gap-3 text-sm">
            {["f", "x", "ig", "in", "p", "yt"].map((item) => (
              <a
                key={item}
                href="#"
                className="grid size-8 place-items-center bg-[#b59677] text-white"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
        {columns.map(([title, ...links]) => (
          <div key={title}>
            <h3 className="mb-7 text-sm font-semibold tracking-[0.15em]">
              {title}
            </h3>
            <ul className="space-y-3 text-sm text-white/80">
              {links.map((link) => (
                <li key={link}>
                  {footerContentLinks[link] ? (
                    <AboutUsModal
                      endpoint={footerContentLinks[link].endpoint}
                      fallbackTitle={footerContentLinks[link].fallbackTitle}
                      className="text-left transition hover:text-[#b59677]"
                    >
                      {link}
                    </AboutUsModal>
                  ) : (
                    <a href="#" className="transition hover:text-[#b59677]">
                      {link}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="mb-7 text-sm font-semibold tracking-[0.15em]">
            NEWSLETTER SIGNUP
          </h3>
          <p className="text-sm leading-6 text-white/80">
            Subscribe to our newsletter and get 10% off your first purchase
          </p>
          <form className="mt-5 flex border border-white/25">
            <input
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-white/60"
              placeholder="Your email address"
              type="email"
            />
            <button className="bg-[#b59677] px-5 text-sm font-semibold transition hover:bg-white hover:text-black">
              Subscribe
            </button>
          </form>
          <img
            src={`${cdn}/files/payment2.png?v=1667575840&width=400`}
            alt=""
            className="mt-7 h-auto w-[197px]"
          />
        </div>
      </div>
      <div className="bg-[#222]">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-4 py-5 text-center text-sm text-white/75 md:flex-row">
          <p>All Rights Copyright © 2020 {siteName}</p>
          <div className="flex gap-6">
            {/* {["Shop", "About Us", "Contact", "Blog"].map((item) => (
              footerContentLinks[item] ? (
                <AboutUsModal
                  key={item}
                  endpoint={footerContentLinks[item].endpoint}
                  fallbackTitle={footerContentLinks[item].fallbackTitle}
                  className="hover:text-[#b59677]"
                >
                  {item}
                </AboutUsModal>
              ) : (
                <a key={item} href="#" className="hover:text-[#b59677]">
                  {item}
                </a>
              )
            ))} */}
          </div>
        </div>
      </div>
    </footer>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="mb-9 text-center">
      <h2 className="text-2xl font-semibold tracking-[0.08em] text-[#4d5959] md:text-3xl">
        {children}
      </h2>
      <div className="mx-auto mt-4 h-px w-16 bg-[#b59677]" />
    </div>
  );
}
