import Loader from "@/components/common/Loader";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader size={96} label="Loading page" />
    </div>
  );
}
