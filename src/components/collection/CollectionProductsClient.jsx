"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Loader from "@/components/common/Loader";
import { useAuthContext } from "@/context/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { cleanProductTitle, formatProductCurrency, getProductsByCategory } from "@/services/product.service";

const productStep = 12;
const gridColumnOptions = [3, 4, 5];
const productGridColumnClasses = {
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
};

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

function normalizeCategoryId(id) {
  return String(id || "").trim();
}

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

function getCollectionVariant(product = {}) {
  return getAvailableVariant(product) || (
    getStockValue(product) !== null && getStockValue(product) > 0
      ? product
      : null
  ) || null;
}

function getCollectionDisplayProduct(product = {}) {
  const availableVariant = getCollectionVariant(product);

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

function ProductGridLoader() {
  return (
    <div className="grid min-h-[360px] place-items-center">
      <Loader variant="bars" size={120} label="Loading collection products" />
    </div>
  );
}

function HeartIcon({ filled = false }) {
  return (
    <svg aria-hidden="true" className="size-8" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
      <path
        d="M20.2 5.8a5.2 5.2 0 0 0-7.35 0L12 6.65l-.85-.85a5.2 5.2 0 0 0-7.35 7.35L12 21.35l8.2-8.2a5.2 5.2 0 0 0 0-7.35Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="size-8" viewBox="0 0 24 24" fill="none">
      <path
        d="M2.75 12s3.25-6.25 9.25-6.25S21.25 12 21.25 12 18 18.25 12 18.25 2.75 12 2.75 12Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ProductCard({ product, onAddToCart, isAdding, onToggleWishlist, isInWishlist }) {
  const displayProduct = getCollectionDisplayProduct(product);
  const [quantity, setQuantity] = useState(1);
  const detailHref = getProductDetailHref(displayProduct);
  const isSaved = isInWishlist?.(displayProduct.id) || false;
  const productColors = (displayProduct.colors || []).filter(Boolean).slice(0, 4);
  const isUnavailable = isProductTemporarilyUnavailable(displayProduct);

  function changeQuantity(nextQuantity) {
    setQuantity(Math.max(1, nextQuantity));
  }

  return (
    <article className="group border border-[#eee7df] bg-white transition duration-300 hover:border-[#d8cabd] hover:shadow-[0_18px_45px_rgba(32,32,32,0.08)]">
      <div className="relative overflow-hidden bg-[#f4f1ee]">
        <Link href={detailHref || "#"} aria-label={`View ${displayProduct.title}`}>
          <img
            src={displayProduct.image}
            alt={displayProduct.title}
            className="aspect-[3/4] w-full object-cover object-top transition duration-500 group-hover:scale-105"
          />
        </Link>
        <div className="absolute right-3 top-3 grid gap-2">
          <button
            type="button"
            onClick={() => onToggleWishlist?.(displayProduct)}
            className={`grid size-10 place-items-center bg-white text-[#111] shadow-sm transition hover:bg-[#222] hover:text-white ${
              isSaved ? "text-[#b59677]" : "text-[#111]"
            }`}
            aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isSaved}
          >
            <HeartIcon filled={isSaved} />
          </button>
          {detailHref && (
            <Link
              href={detailHref}
              className="grid size-10 place-items-center bg-white text-[#111] shadow-sm transition hover:bg-[#222] hover:text-white"
              aria-label={`View ${displayProduct.title}`}
            >
              <EyeIcon />
            </Link>
          )}
        </div>
        {displayProduct.oldPrice && !isUnavailable && (
          <span className="absolute left-3 top-3 bg-[#b59677] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white">
            Sale
          </span>
        )}
        {isUnavailable && (
          <span className="absolute left-3 top-3 bg-[#222] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white">
            Temporary Out of Stock
          </span>
        )}
        <div className="absolute inset-x-3 bottom-3 translate-y-4 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="grid grid-cols-[112px_minmax(0,1fr)] bg-white shadow-lg">
            <div className="grid h-12 grid-cols-3 border border-r-0 border-[#ddd] text-[#444]">
              <button
                type="button"
                onClick={() => changeQuantity(quantity - 1)}
                className="grid place-items-center text-xl font-bold transition hover:bg-[#f4f1ee]"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="grid place-items-center text-sm font-bold">{quantity}</span>
              <button
                type="button"
                onClick={() => changeQuantity(quantity + 1)}
                className="grid place-items-center text-xl font-bold transition hover:bg-[#f4f1ee]"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => onAddToCart(displayProduct, quantity)}
              disabled={isAdding || isUnavailable}
              className="min-h-12 bg-[#222] px-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#b59677] disabled:cursor-not-allowed disabled:bg-white/90 disabled:text-[#999]"
            >
              {isAdding ? "Adding" : isUnavailable ? "Temporary Out of Stock" : "Add"}
            </button>
          </div>
        </div>
      </div>
      <div className="p-4 text-left">
        {displayProduct.ecommerceCategory && (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a29489]">
            {displayProduct.ecommerceCategory}
          </p>
        )}
        <h2 className="line-clamp-2 min-h-11 text-sm font-black uppercase leading-[1.45] tracking-[0.08em] text-[#4e5957]">
          {displayProduct.title}
        </h2>
        {displayProduct.selectedSize && (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#777]">
            Size: {displayProduct.selectedSize}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {displayProduct.oldPrice && <del className="text-[#999]">{displayProduct.oldPrice}</del>}
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

export default function CollectionProductsClient({ initialCategoryId }) {
  const { isAuthenticated, user } = useAuthContext();
  const { addItem, isSyncing } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [categoryId, setCategoryId] = useState(normalizeCategoryId(initialCategoryId));
  const [productLimit, setProductLimit] = useState(productStep);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [gridColumns, setGridColumns] = useState(4);
  const userPricelistId = user?.pricelist_id || user?.active_pricelist?.id || "";

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategoryProducts() {
      const isMoreRequest = productLimit > productStep;

      if (isMoreRequest) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const response = await getProductsByCategory({
          categoryId,
          categoryLimit: 200,
          productLimit,
        }, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setProducts(response.products);
        setCategories(response.categories.filter((category) => category.visible && category.id));
        setSelectedCategory(response.selectedCategory?.id ? response.selectedCategory : response.categories.find((category) => category.id === categoryId));
      } catch (requestError) {
        if (requestError.code !== "REQUEST_ABORTED") {
          setError(requestError);
          setProducts([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    }

    loadCategoryProducts();

    return () => {
      controller.abort();
    };
  }, [categoryId, productLimit, userPricelistId]);

  const categoryTitle = selectedCategory?.name || "Collection";
  const heroImage = selectedCategory?.image || products[0]?.image || "https://demo-gecko6.myshopify.com/cdn/shop/files/acessories.jpg?v=1667528554&width=1800";
  const ecommerceCategory = selectedCategory?.ecommerceCategory || products[0]?.ecommerceCategory || "";
  const canLoadMore = products.length >= productLimit;
  const visibleCategories = useMemo(
    () => categories.filter((category) => category.id !== categoryId).slice(0, 12),
    [categories, categoryId],
  );

  function changeCategory(nextCategoryId) {
    setCategoryId(normalizeCategoryId(nextCategoryId));
    setProductLimit(productStep);
  }

  function openLoginDrawer() {
    const drawerToggle = document.getElementById("account-drawer-toggle");
    if (drawerToggle) {
      drawerToggle.checked = true;
    }
  }

  function handleToggleWishlist(product) {
    if (!isAuthenticated) {
      openLoginDrawer();
      return;
    }

    toggleWishlist(product);
  }

  async function handleAddToCart(product, quantity) {
    if (!isAuthenticated) {
      openLoginDrawer();
      return null;
    }

    return addItem(product, quantity);
  }

  return (
    <>
      <section className="relative grid min-h-[230px] place-items-center overflow-hidden text-center text-white md:min-h-[280px]">
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[#263130]/65" />
        <div className="relative z-10 px-4">
          <h1 className="text-3xl font-extrabold tracking-[0.2em] md:text-5xl">{categoryTitle}</h1>
          {ecommerceCategory && (
            <p className="mt-4 text-sm font-semibold md:text-base">{ecommerceCategory}</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1520px] px-4 py-12 md:px-8 md:py-16">
        <div className="mb-10 grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <button type="button" className="inline-flex items-center gap-2 justify-self-start text-lg font-medium text-[#9a9a9a]">
            <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            </svg>
            Filter
          </button>
          <div className="flex justify-center gap-2 text-[#9b9b9b]" aria-label="Change product grid columns">
            {gridColumnOptions.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setGridColumns(count)}
                aria-label={`Show ${count} products per row`}
                aria-pressed={gridColumns === count}
                className={`grid h-8 w-10 grid-flow-col gap-1 border p-1 transition ${
                  gridColumns === count
                    ? "border-[#53605f] bg-[#eef1ef]"
                    : "border-[#bdbdbd] bg-white hover:border-[#53605f]"
                }`}
              >
                {Array.from({ length: count }).map((_, index) => (
                  <span
                    key={index}
                    className={gridColumns === count ? "bg-[#53605f]" : "bg-[#9b9b9b]"}
                  />
                ))}
              </button>
            ))}
          </div>
          <label className="justify-self-start md:justify-self-end">
            <span className="sr-only">Sort products</span>
            <select className="h-14 w-[220px] rounded-full border border-[#e1e1e1] bg-white px-6 text-base font-medium text-[#999] outline-none">
              <option>Featured</option>
              <option>Newest</option>
              <option>Price low to high</option>
            </select>
          </label>
        </div>

        {visibleCategories.length > 0 && (
          <div className="mb-10 flex gap-3 overflow-x-auto pb-2">
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => changeCategory(category.id)}
                className="min-h-11 shrink-0 border border-[#d9d9d9] bg-white px-5 text-sm font-bold uppercase tracking-[0.12em] text-[#555] transition hover:border-[#222] hover:bg-[#222] hover:text-white"
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="mb-8 text-center text-sm font-semibold text-[#b59677]">
            Products could not be loaded for this collection.
          </p>
        )}

        {isLoading ? (
          <ProductGridLoader />
        ) : products.length > 0 ? (
          <div className={`grid gap-x-8 gap-y-14 ${productGridColumnClasses[gridColumns]}`}>
            {products.map((product, index) => (
              <ProductCard
                key={getProductCardKey(product, index)}
                product={product}
                onAddToCart={handleAddToCart}
                isAdding={isSyncing}
                onToggleWishlist={handleToggleWishlist}
                isInWishlist={isInWishlist}
              />
            ))}
          </div>
        ) : (
          <div className="grid min-h-[260px] place-items-center text-center">
            <div>
              <h2 className="text-2xl font-bold text-[#555]">No products found</h2>
              <p className="mt-3 text-sm text-[#888]">Try another collection from the category bar.</p>
            </div>
          </div>
        )}

        {canLoadMore && (
          <div className="mt-14 text-center">
            <button
              type="button"
              onClick={() => setProductLimit((currentLimit) => currentLimit + productStep)}
              disabled={isLoadingMore}
              className="inline-flex min-h-12 items-center bg-[#222] px-10 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#b59677] disabled:cursor-not-allowed disabled:bg-[#999]"
            >
              {isLoadingMore ? (
                <Loader variant="dots" size={44} label="Loading more products" className="brightness-0 invert" />
              ) : "More Products"}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
