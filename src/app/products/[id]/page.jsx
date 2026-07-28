import Link from "next/link";
import Header from "@/components/common/Header";
import ProductDetailClient from "@/components/product/ProductDetailClient";
import { getProductById as getFallbackProductById, products } from "@/lib/products";

export function generateStaticParams() {
  return products
    .map((product) => product?.id)
    .filter((id) => typeof id === "string" && id)
    .map((id) => ({ id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = getFallbackProductById(id);

  if (!product) {
    return {
      title: "Product not found",
    };
  }

  return {
    title: `${product.title} - Hoity Moppet`,
    description: product.description,
  };
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = getFallbackProductById(id);

  return (
    <main className="bg-white text-[#222]">
      <Header />
      <div className="mx-auto max-w-[1420px] px-4 py-8 md:py-12">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-[#666]">
          <Link href="/" className="transition hover:text-[#b59677]">
            Home
          </Link>
          <span className="px-2">/</span>
          <Link href="/#products" className="transition hover:text-[#b59677]">
            Products
          </Link>
          <span className="px-2">/</span>
          <span className="text-[#222]">{product?.title || "Product Preview"}</span>
        </nav>
        <ProductDetailClient  productId={id} />
      </div>
    </main>
  );
}
