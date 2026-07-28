"use client";

export default function Error({ error, reset }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <h2 className="mb-4 text-2xl font-bold">Something went wrong!</h2>
      <p className="mb-6 text-gray-600">
        {error?.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={() => reset()}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Try Again
      </button>
    </div>
  );
}