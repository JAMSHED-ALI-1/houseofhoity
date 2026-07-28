"use client";

import { useEffect, useMemo, useState } from "react";
import AboutUsModal from "@/components/common/AboutUsModal";
import Loader from "@/components/common/Loader";
import SizeGuideModal from "@/components/product/SizeGuideModal";
import { useAuthContext } from "@/context/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { cleanProductTitle, formatProductCurrency, getProductById } from "@/services/product.service";

const fallbackImage = "https://demo-gecko6.myshopify.com/cdn/shop/products/p-45_92e6d9ce-1d2d-4820-a190-4c534313fb58.jpg?v=1665680779&width=900";
const trustBadges = ["McAfee Secure", "Norton", "VeriSign", "TRUSTe"];

function formatCurrency(value, source = {}) {
  return formatProductCurrency(value, source.currency_symbol || "₹");
}

function getFirstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function getProductImages(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const nextImages = [product?.image, ...images].filter(Boolean);
  const uniqueImages = Array.from(new Set(nextImages));

  return uniqueImages.length > 0 ? uniqueImages : [];
}

function getStock(product) {
  const stock = Number(
    product?.stock ??
      product?.quantity_on_hand ??
      product?.qty_available ??
      product?.available_quantity ??
      product?.quantity,
  );

  if (!Number.isFinite(stock)) {
    return 1;
  }

  return Math.max(0, stock);
}

function getRawStock(product = {}) {
  return (
    product.stock ??
    product.quantity_on_hand ??
    product.qty_available ??
    product.available_quantity ??
    product.quantity
  );
}

function hasStockValue(product) {
  return [
    product?.stock,
    product?.quantity_on_hand,
    product?.qty_available,
    product?.available_quantity,
    product?.quantity,
  ].some((value) => value !== undefined && value !== null && value !== "");
}

function getVariantValue(variant = {}, keys = []) {
  const key = keys.find((item) => variant[item] !== undefined && variant[item] !== null && variant[item] !== "");

  if (key) {
    return variant[key];
  }

  const attributes = [
    ...(Array.isArray(variant.attributes) ? variant.attributes : []),
    ...(Array.isArray(variant.variant_attributes) ? variant.variant_attributes : []),
  ];
  const attribute = attributes.find((item) => (
    keys.includes(item?.attribute_name?.toLowerCase?.()) ||
    keys.includes(item?.name?.toLowerCase?.()) ||
    keys.includes(item?.attribute?.toLowerCase?.())
  )) || attributes[0];

  return attribute?.value_name || attribute?.value || attribute?.name || "";
}

function normalizeSelectionValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getVariantId(variant = {}) {
  return getFirstValue(
    variant.id,
    variant.product_variant_id,
    variant.variant_id,
    variant.product_id,
    variant.available_product_id,
  );
}

function getAttributeValueName(value = {}) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return getFirstValue(
    value.name,
    value.value_name,
    value.value,
    value.label,
    value.display_name,
  ) || "";
}

function getAttributeValueVariantId(value = {}) {
  const availableProductIds = Array.isArray(value.available_product_ids)
    ? value.available_product_ids
    : [];

  return getFirstValue(
    availableProductIds[0],
    value.product_variant_id,
    value.variant_id,
    value.product_id,
    value.available_product_id,
  );
}

function getAttributeValueProductIds(value = {}) {
  if (Array.isArray(value.available_product_ids)) {
    return value.available_product_ids;
  }

  const variantId = getAttributeValueVariantId(value);
  return variantId ? [variantId] : [];
}

function findAttributeLine(product, names = []) {
  return Array.isArray(product?.attribute_lines)
    ? product.attribute_lines.find((line) => {
        const lineName = normalizeSelectionValue(line.attribute_name || line.name || line.attribute);

        return Array.isArray(line.values) && names.some((name) => lineName.includes(name));
      })
    : null;
}

function findAttributeValue(line, selectedValue) {
  return line?.values?.find((value) => (
    normalizeSelectionValue(getAttributeValueName(value)) === normalizeSelectionValue(selectedValue) ||
    normalizeSelectionValue(value?.html_color) === normalizeSelectionValue(selectedValue)
  ));
}

function getColorOptionValue(value = {}) {
  return getFirstValue(value.html_color, value.color, value.color_code, value.name, value.value_name, value.value, "");
}

function getColorOptionLabel(value = {}) {
  return getFirstValue(value.name, value.value_name, value.value, value.label, value.html_color, "Color");
}

function getVariantAttribute(variant = {}, names = []) {
  const safeVariant = variant || {};
  const attributes = [
    ...(Array.isArray(safeVariant.attributes) ? safeVariant.attributes : []),
    ...(Array.isArray(safeVariant.variant_attributes) ? safeVariant.variant_attributes : []),
  ];

  return attributes.find((attribute) => {
    const attributeName = normalizeSelectionValue(attribute.attribute_name || attribute.name || attribute.attribute);
    return names.some((name) => attributeName.includes(name));
  });
}

function getVariantSizeValue(variant = {}) {
  const attribute = getVariantAttribute(variant, ["size", "age"]);
  const safeVariant = variant || {};
  return getFirstValue(attribute?.value_name, attribute?.value, attribute?.name, safeVariant.size, safeVariant.age, "");
}

function getVariantColorValue(variant = {}) {
  const attribute = getVariantAttribute(variant, ["color"]);
  const safeVariant = variant || {};
  return getFirstValue(attribute?.html_color, attribute?.value_name, attribute?.value, attribute?.name, safeVariant.color, safeVariant.color_name, "");
}

function getVariantColorLabel(variant = {}) {
  const attribute = getVariantAttribute(variant, ["color"]);
  const safeVariant = variant || {};
  return getFirstValue(attribute?.value_name, attribute?.value, attribute?.name, safeVariant.color_name, safeVariant.color, "");
}

function getSelectedVariantId(product, size, color) {
  const sizeLine = findAttributeLine(product, ["size", "age"]);
  const colorLine = findAttributeLine(product, ["color"]);
  const sizeValue = findAttributeValue(sizeLine, size);
  const colorValue = findAttributeValue(colorLine, color);
  const sizeIds = getAttributeValueProductIds(sizeValue).map(String);
  const colorIds = getAttributeValueProductIds(colorValue).map(String);

  if (sizeIds.length && colorIds.length) {
    return sizeIds.find((id) => colorIds.includes(id));
  }

  return sizeIds[0] || colorIds[0] || null;
}

function getVariantPrice(variant = {}, fallbackPrice, fallbackSource = {}) {
  const price = getFirstValue(
    variant.price,
    variant.list_price,
    variant.sale_price,
    variant.price_unit,
    variant.amount,
  );

  if (price === undefined || price === null || price === "") {
    return fallbackPrice;
  }

  return formatCurrency(price, {
    currency_symbol: variant.currency_symbol || fallbackSource.currency_symbol,
  });
}

function getVariantOldPrice(variant = {}, fallbackOldPrice, fallbackSource = {}) {
  const oldPrice = getFirstValue(
    variant.mrp_data,
    variant.oldPrice,
    variant.old_price,
    variant.compare_at_price,
  );

  if (oldPrice === undefined || oldPrice === null || oldPrice === "") {
    return fallbackOldPrice;
  }

  return formatCurrency(oldPrice, {
    currency_symbol: variant.currency_symbol || fallbackSource.currency_symbol,
  });
}

function findSelectedVariant(product, selectedSize, selectedColor) {
  const variants = Array.isArray(product?.available_variants)
    ? product.available_variants
    : Array.isArray(product?.variants)
      ? product.variants
      : [];

  if (!variants.length) return null;

  return variants.find((variant) => {
    const size = normalizeSelectionValue(getVariantSizeValue(variant));
    const color = normalizeSelectionValue(getVariantColorValue(variant));
    const colorLabel = normalizeSelectionValue(getVariantColorLabel(variant));
    const sizeMatches = !selectedSize || !size || size === normalizeSelectionValue(selectedSize);
    const colorMatches = !selectedColor || !color || color === normalizeSelectionValue(selectedColor) || colorLabel === normalizeSelectionValue(selectedColor);

    return sizeMatches && colorMatches;
  }) || null;
}

function getSizeVariant(product, size, color) {
  const productId = getSelectedVariantId(product, size, color);
  const variants = Array.isArray(product?.available_variants)
    ? product.available_variants
    : Array.isArray(product?.variants)
      ? product.variants
      : [];

  if (productId) {
    const mappedVariant = variants.find((variant) => String(getVariantId(variant)) === String(productId));

    if (mappedVariant) {
      return mappedVariant;
    }
  }

  const variant = findSelectedVariant(product, size, color);

  if (variant) {
    return variant;
  }

  if (productId) {
    return {
      id: productId,
      name: product.name,
      price: product.price,
      mrp: getFirstValue(product.mrp_data, product.mrp),
      currency_symbol: product.currency_symbol,
      image: product.image,
      image_url: product.image_url,
      images: product.images,
    };
  }

  return null;
}

function getProductSelectedSize(product) {
  const variantSize = getVariantSizeValue(product) || getVariantValue(product, ["size", "age", "size_name", "attribute_value", "display_name"]);

  return variantSize || product?.sizes?.[0] || "";
}

function getProductSelectedColor(product) {
  return getVariantColorValue(product) || product?.colors?.[0] || "";
}

function getVariantProduct(product, variant, selectedSize, selectedColor) {
  if (!variant) {
    return product;
  }

  const variantImages = Array.isArray(variant.images) && variant.images.length > 0
    ? variant.images
    : [variant.image, variant.image_url].filter(Boolean);

  return {
    ...product,
    ...variant,
    id: String(variant.id || product.id),
    title: cleanProductTitle(variant.name || product.title) || product.title,
    image: variant.image || variant.image_url || product.image,
    images: variantImages.length > 0 ? variantImages : product.images,
    oldPrice: getVariantOldPrice(variant, product.oldPrice, product),
    price: getVariantPrice(variant, product.price, product),
    stock: getRawStock(variant),
    selectedSize,
    selectedColor,
    variantProductId: variant.id || product.id,
    available_variants: product.available_variants,
    attribute_lines: product.attribute_lines,
    sizes: product.sizes,
    colors: product.colors,
  };
}

function isVariantUnavailable(variant) {
  if (!variant) return false;
  const stock = getStock(variant);

  return Boolean(
    variant.temporary_not_available ||
      variant.temporarily_unavailable ||
      variant.is_temporarily_unavailable ||
      variant.is_temporary_unavailable ||
      variant.availability === "temporary_unavailable" ||
      variant.availability === "out_of_stock" ||
      variant.stock_status === "out_of_stock" ||
      variant.available === false ||
      (hasStockValue(variant) && stock <= 0),
  );
}

function isProductTemporarilyUnavailable(product, selectedSize, selectedColor) {
  if (!product) return false;
  const selectedVariant = findSelectedVariant(product, selectedSize, selectedColor);

  return Boolean(
    product.temporary_not_available ||
      product.temporarily_unavailable ||
      product.is_temporarily_unavailable ||
      product.is_temporary_unavailable ||
      product.availability === "temporary_unavailable" ||
      product.availability === "out_of_stock" ||
      product.stock_status === "out_of_stock" ||
      product.available === false ||
      isVariantUnavailable(selectedVariant) ||
      (!selectedVariant && hasStockValue(product) && getStock(product) <= 0),
  );
}

function getSaleTimeLeft() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const totalSeconds = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));

  return {
    days: 0,
    hours: Math.floor(totalSeconds / 3600),
    mins: Math.floor((totalSeconds % 3600) / 60),
    secs: totalSeconds % 60,
  };
}

function padTime(value) {
  return String(value).padStart(2, "0");
}

function getCareInstruction(product) {
  const safeProduct = product || {};
  const instruction = safeProduct.care_instruction || safeProduct.careInstruction || safeProduct.instructions || safeProduct.instruction;

  if (instruction && typeof instruction === "object") {
    return {
      title: getFirstValue(instruction.name, instruction.title, "Care Instructions"),
      details: getFirstValue(instruction.care_details, instruction.details, instruction.description, instruction.note, ""),
    };
  }

  return {
    title: "Care Instructions",
    details: getFirstValue(instruction, safeProduct.care_details, safeProduct.careDetails, safeProduct.wash_instruction, safeProduct.washInstruction, ""),
  };
}

export default function ProductDetailClient({  productId }) {
  const { isAuthenticated, user } = useAuthContext();
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [product, setProduct] = useState( null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState( "");
  const [variantDetailsById, setVariantDetailsById] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(getSaleTimeLeft);
  const [isLoading, setIsLoading] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const userPricelistId = user?.pricelist_id || user?.active_pricelist?.id || "";

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      setIsLoading(true);

      try {
        const nextProduct = await getProductById(productId, { signal: controller.signal });
        if (controller.signal.aborted) return;

        setProduct(nextProduct);
        setVariantDetailsById({});
        setSelectedColor(getProductSelectedColor(nextProduct));
        setSelectedSize(getProductSelectedSize(nextProduct));
        setSelectedImageIndex(0);
      } catch (error) {
        if (error.code !== "REQUEST_ABORTED" ) {
          setProduct(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      controller.abort();
    };
  }, [productId, userPricelistId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimeLeft(getSaleTimeLeft());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!isInstructionsOpen) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setIsInstructionsOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isInstructionsOpen]);

  const sizes = useMemo(() => (
    product?.sizes?.length ? product.sizes : [""]
  ), [product]);
  const colorOptions = useMemo(() => {
    const colorLine = findAttributeLine(product, ["color"]);

    if (Array.isArray(colorLine?.values) && colorLine.values.length > 0) {
      return colorLine.values.map((value) => ({
        value: getColorOptionValue(value),
        label: getColorOptionLabel(value),
        swatch: getColorOptionValue(value),
      })).filter((value) => value.value);
    }

    return (product?.colors?.length ? product.colors : []).map((color) => ({
      value: color,
      label: color,
      swatch: color,
    })).filter((color) => color.value);
  }, [product]);
  const selectedVariant = useMemo(
    () => getSizeVariant(product, selectedSize || sizes[0], selectedColor),
    [product, selectedColor, selectedSize, sizes],
  );
  const selectedVariantId = useMemo(
    () => getSelectedVariantId(product, selectedSize || sizes[0], selectedColor),
    [product, selectedColor, selectedSize, sizes],
  );
  const selectedVariantDetails = selectedVariantId
    ? variantDetailsById[String(selectedVariantId)]
    : null;
  const effectiveSelectedVariant = useMemo(
    () => selectedVariantDetails
      ? {
          ...selectedVariant,
          ...selectedVariantDetails,
          available_variants: product?.available_variants,
          attribute_lines: product?.attribute_lines,
          sizes: product?.sizes,
          colors: product?.colors,
        }
      : selectedVariant,
    [product, selectedVariant, selectedVariantDetails],
  );
  const displayProduct = useMemo(
    () => getVariantProduct(product, effectiveSelectedVariant, selectedSize || sizes[0], selectedColor),
    [effectiveSelectedVariant, product, selectedColor, selectedSize, sizes],
  );
  const images = useMemo(() => getProductImages(displayProduct), [displayProduct]);
  const activeImage = images[selectedImageIndex] || images[0];
  const stock = hasStockValue(effectiveSelectedVariant) ? getStock(effectiveSelectedVariant) : getStock(displayProduct);
  const isUnavailable = product?.available === false ||
    product?.availability === "out_of_stock" ||
    product?.stock_status === "out_of_stock" ||
    (effectiveSelectedVariant ? isVariantUnavailable(effectiveSelectedVariant) : isProductTemporarilyUnavailable(displayProduct, selectedSize || sizes[0], selectedColor));
  const careInstruction = getCareInstruction(displayProduct);
  const selectedColorLabel = getVariantColorLabel(effectiveSelectedVariant) || colorOptions.find((color) => (
    normalizeSelectionValue(color.value) === normalizeSelectionValue(selectedColor)
  ))?.label || selectedColor;
  const hasColorOptions = colorOptions.length > 0;

  function getFirstAvailableColorForSize(size) {
    const variants = Array.isArray(product?.available_variants)
      ? product.available_variants
      : [];
    const sizeLine = findAttributeLine(product, ["size", "age"]);
    const sizeValue = findAttributeValue(sizeLine, size);
    const firstVariantId = getAttributeValueProductIds(sizeValue)[0];
    const variant = firstVariantId
      ? variants.find((item) => String(getVariantId(item)) === String(firstVariantId))
      : variants.find((item) => normalizeSelectionValue(getVariantSizeValue(item)) === normalizeSelectionValue(size));

    return getVariantColorValue(variant) || selectedColor || colorOptions[0]?.value || "";
  }

  useEffect(() => {
    if (!selectedVariantId || String(selectedVariantId) === String(product?.id)) return undefined;
    if (variantDetailsById[String(selectedVariantId)]) return undefined;

    const controller = new AbortController();

    async function loadVariantDetails() {
      try {
        const variantProduct = await getProductById(selectedVariantId, { signal: controller.signal });
        if (controller.signal.aborted) return;

        setVariantDetailsById((currentDetails) => ({
          ...currentDetails,
          [String(selectedVariantId)]: variantProduct,
        }));
      } catch (error) {
        if (error.code !== "REQUEST_ABORTED") {
          setVariantDetailsById((currentDetails) => ({
            ...currentDetails,
            [String(selectedVariantId)]: selectedVariant,
          }));
        }
      }
    }

    loadVariantDetails();

    return () => {
      controller.abort();
    };
  }, [product?.id, selectedVariant, selectedVariantId, userPricelistId, variantDetailsById]);

  async function addToCart() {
    if (!product) return;

    if (isUnavailable) {
      setMessage("Temporary Out of Stock");
      window.setTimeout(() => setMessage(""), 2400);
      return;
    }

    if (!isAuthenticated) {
      const drawerToggle = document.getElementById("account-drawer-toggle");
      if (drawerToggle) {
        drawerToggle.checked = true;
      }
      setMessage("Please log in before adding items to cart");
      window.setTimeout(() => setMessage(""), 2400);
      return;
    }

    await addItem(
      {
        ...product,
        ...displayProduct,
        selectedColor,
        selectedSize: selectedSize || sizes[0],
        variantProductId: effectiveSelectedVariant?.id || displayProduct?.variantProductId || product.id,
      },
      quantity,
    );
    setMessage(`${quantity} item${quantity > 1 ? "s" : ""} added to cart`);
    window.setTimeout(() => setMessage(""), 2400);
  }

  async function toggleProductWishlist() {
    if (!product) return;

    if (!isAuthenticated) {
      setMessage("Please log in to use wishlist");
      window.setTimeout(() => setMessage(""), 2400);
      return;
    }

    const wasSaved = isInWishlist(product.id);
    await toggleWishlist(product);
    setMessage(wasSaved ? "Removed from wishlist" : "Added to wishlist");
    window.setTimeout(() => setMessage(""), 2400);
  }

  function changeImage(direction) {
    setSelectedImageIndex((currentIndex) => (currentIndex + direction + images.length) % images.length);
  }

  if (!product && !isLoading) {
    return (
      <div className="grid min-h-[420px] place-items-center text-center">
        <div>
          <h1 className="text-2xl font-semibold text-[#555]">Product not found</h1>
          <p className="mt-3 text-sm text-[#888]">The preview product API did not return this item.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto grid w-full max-w-[1320px] gap-10 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)] lg:gap-14 lg:px-8">
        <div className="grid gap-4 md:grid-cols-[84px_minmax(0,1fr)]">
          <div className="order-2 flex gap-3 overflow-x-auto pb-1 md:order-1 md:max-h-[680px] md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pb-0">
            {images.slice(0, 8).map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setSelectedImageIndex(index)}
                className={`h-24 w-20 shrink-0 overflow-hidden border bg-[#f4f4f2] transition md:h-[104px] md:w-full ${
                  index === selectedImageIndex ? "border-[#222]" : "border-[#e7e1dc] opacity-75 hover:opacity-100"
                }`}
                aria-label={`Show product image ${index + 1}`}
              >
                <img src={image} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          <div className="relative order-1 aspect-[4/5] min-h-[420px] overflow-hidden bg-[#f1efec] md:order-2 lg:min-h-[680px]">
            {isLoading && (
              <div className="absolute left-5 top-5 z-10 flex items-center gap-2 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#777] shadow-sm">
                <Loader variant="dots" size={36} label="Loading preview" />
                <span>Loading preview</span>
              </div>
            )}
            <img
              src={activeImage}
              alt={displayProduct?.title || product?.title || "Product preview"}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => changeImage(-1)}
              className="absolute left-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center border border-[#252525] bg-white/85 text-3xl leading-none text-[#252525] transition hover:bg-[#252525] hover:text-white"
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => changeImage(1)}
              className="absolute right-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center border border-[#252525] bg-white/85 text-3xl leading-none text-[#252525] transition hover:bg-[#252525] hover:text-white"
              aria-label="Next image"
            >
              ›
            </button>
            <div className="absolute bottom-4 left-4 bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#555]">
              {selectedImageIndex + 1} / {Math.max(images.length, 1)}
            </div>
          </div>
        </div>

        <section className="text-[#4f5a58] lg:sticky lg:top-8 lg:self-start">
          <div className="border-b border-[#e6dfd8] pb-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className={`inline-flex min-h-9 items-center border px-4 text-xs font-bold uppercase tracking-[0.14em] ${
                isUnavailable ? "border-[#ef4c4c] text-[#ef4c4c]" : "border-[#41a9a3] text-[#29817c]"
              }`}>
                {isUnavailable ? "Temporary Out of Stock" : "In Stock"}
              </span>
              {displayProduct?.internal_reference && (
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a9088]">
                  {displayProduct.internal_reference}
                </span>
              )}
            </div>
            <h1 className="text-[28px] font-black uppercase leading-tight tracking-[0.08em] text-[#27302f] sm:text-4xl">
              {displayProduct?.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              {displayProduct?.oldPrice && <del className="pb-1 text-xl font-semibold text-[#a7a09a]">{displayProduct.oldPrice}</del>}
              <ins className="text-4xl font-black leading-none text-[#1f2625] no-underline">{displayProduct?.price || "₹0.00"}</ins>
            </div>
          </div>

          {product?.description && (
            <p className="mt-7 max-w-[720px] text-base font-medium leading-8 text-[#79716b]">
              {product.description}
            </p>
          )}

          <div className="mt-7">
            {isUnavailable ? (
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#ef4c4c]">
                Temporary Out of Stock.
              </p>
            ) : (
              <>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#53605f]">
                  HURRY! ONLY <span className="text-[#ef4c4c]">{Math.max(1, stock)}</span> LEFT IN STOCK.
                </p>
                <div className="mt-4 h-2 overflow-hidden bg-[#f4dadf]">
                  <div className="h-full w-[12%] min-w-8 bg-[#ef4c4c]" />
                </div>
              </>
            )}
          </div>

          <div className="mt-8">
            {/* <p className="text-1xl font-semibold text-[#596463]">⏱ Hurry up! Sale Ends in</p> */}
            {/* <div className="mt-6 grid max-w-[620px] grid-cols-4 gap-8 text-[#222]">
              {[
                ["day", timeLeft.days],
                ["hours", padTime(timeLeft.hours)],
                ["mins", padTime(timeLeft.mins)],
                ["secs", padTime(timeLeft.secs)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-3xl font-bold leading-none">{value}</p>
                  <p className="mt-3 text-xl font-medium">{label}</p>
                </div>
              ))}
            </div> */}
          </div>

          {hasColorOptions && (
            <div className="mt-8 border-y border-[#eee7df] py-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#38413f]">Color</p>
                <p className="text-sm font-semibold text-[#7c756f]">{selectedColorLabel}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {colorOptions.slice(0, 7).map((color, index) => (
                  <button
                    key={`${color.value}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedColor(color.value);
                      setSelectedImageIndex(0);
                    }}
                    className={`grid size-12 place-items-center border transition ${
                      normalizeSelectionValue(selectedColor) === normalizeSelectionValue(color.value) ? "border-[#222]" : "border-[#ded6cf] hover:border-[#777]"
                    }`}
                    aria-label={`Select color ${color.label}`}
                    title={color.label}
                  >
                    <span className="size-8 border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" style={{ backgroundColor: color.swatch }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#38413f]">Size</p>
              <p className="text-sm font-semibold text-[#7c756f]">{selectedSize || sizes[0]}</p>
            </div>
            <label className="mt-4 block">
              <span className="sr-only">Select size</span>
              <select
                value={selectedSize || sizes[0]}
                onChange={(event) => {
                  const nextSize = event.target.value;
                  setSelectedSize(nextSize);
                  setSelectedColor(getFirstAvailableColorForSize(nextSize));
                  setSelectedImageIndex(0);
                }}
                className="h-14 w-full border border-[#d8d0c8] bg-white px-5 text-base font-bold text-[#333] outline-none transition focus:border-[#222]"
              >
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)_56px]">
            <div className="grid h-14 grid-cols-3 border border-[#9aa1a0] text-xl font-bold text-[#586261]">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity" className="transition hover:bg-[#f4f1ee]">−</button>
              <span className="grid place-items-center text-base">{quantity}</span>
              <button type="button" onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity" className="transition hover:bg-[#f4f1ee]">+</button>
            </div>
            <button
              type="button"
              onClick={addToCart}
              disabled={isUnavailable}
              className="h-14 bg-[#bd9a78] px-8 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#222] disabled:cursor-not-allowed disabled:bg-[#aaa]"
            >
              {isUnavailable ? "Temporary Out of Stock" : "Add To Cart"}
            </button>
            <button
              type="button"
              onClick={toggleProductWishlist}
              className={`grid size-14 place-items-center border border-[#8f9695] text-3xl transition hover:border-[#222] ${
                product && isInWishlist(product.id) ? "text-[#bd9a78]" : ""
              }`}
              aria-label={product && isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={product ? isInWishlist(product.id) : false}
            >
              {product && isInWishlist(product.id) ? "♥" : "♡"}
            </button>
          </div>

          {/* <button type="button" className="mt-5 h-16 w-full max-w-[520px] rounded-full bg-[#202020] text-lg font-bold uppercase text-white">
            Buy It Now
          </button> */}

          {/* <div className="mt-9 flex max-w-[520px] flex-wrap items-center gap-7 text-sm font-bold text-[#5d5d5d]">
            {trustBadges.map((badge) => (
              <span key={badge} className="inline-flex min-h-10 items-center gap-2">
                <span className="grid size-8 place-items-center rounded-sm border-2 border-[#d8d8d8] text-[#bd9a78]">✓</span>
                {badge}
              </span>
            ))}
          </div> */}

          <div className="mt-8 grid grid-cols-2 border-t border-[#eee] pt-5 text-sm font-black uppercase tracking-[0.12em] text-[#555] sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(true)}
              className="text-left transition hover:text-[#bd9a78]"
            >
              Size Guide
            </button>
            <button
              type="button"
              onClick={() => setIsInstructionsOpen(true)}
              className="text-left"
            >
              Instructions
            </button>
            <AboutUsModal
              endpoint="/api/faq"
              fallbackTitle="Delivery & Return"
              className="text-left transition hover:text-[#bd9a78]"
            >
              Delivery & Return
            </AboutUsModal>
            <AboutUsModal
              endpoint="/api/faq"
              fallbackTitle="Ask a Question"
              className="text-left transition hover:text-[#bd9a78]"
            >
              Ask a Question
            </AboutUsModal>
          </div>
        </section>
      </div>

      {isSizeGuideOpen && (
        <SizeGuideModal
          product={{
            ...product,
            ...displayProduct,
            attribute_lines: product?.attribute_lines,
          }}
          onClose={() => setIsSizeGuideOpen(false)}
        />
      )}

      {isInstructionsOpen && (
        <div
          className="fixed inset-0 z-[10000] grid place-items-center bg-black/45 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="care-instruction-title"
          onMouseDown={() => setIsInstructionsOpen(false)}
        >
          <div
            className="w-full max-w-[520px] bg-white p-7 text-[#555] shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-5 border-b border-[#ededed] pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#bd9a78]">Product Care</p>
                <h2 id="care-instruction-title" className="mt-2 text-2xl font-bold text-[#222]">
                  {careInstruction.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsInstructionsOpen(false)}
                className="grid size-11 shrink-0 place-items-center border border-[#ddd] text-2xl leading-none text-[#222]"
                aria-label="Close instructions"
              >
                ×
              </button>
            </div>
            <div className="mt-6 whitespace-pre-line text-lg font-medium leading-8 text-[#696969]">
              {careInstruction.details || "Care instructions are not available for this product."}
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="fixed bottom-5 left-1/2 z-[10000] -translate-x-1/2 bg-[#222] px-6 py-3 text-sm font-semibold text-white shadow-2xl">
          {message}
        </div>
      )}
    </>
  );
}
