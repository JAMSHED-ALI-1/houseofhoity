import Header from "@/components/common/Header";
import CollectionProductsClient from "@/components/collection/CollectionProductsClient";

export async function generateMetadata({ params }) {
  const { id } = await params;

  return {
    title: `Collection ${id} - Hoity Moppet`,
  };
}

export default async function CollectionPage({ params }) {
  const { id } = await params;

  return (
    <main className="bg-white text-[#222]">
      <Header />
      <CollectionProductsClient initialCategoryId={id} />
    </main>
  );
}
