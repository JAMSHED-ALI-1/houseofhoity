import Link from "next/link";
import { BASE_URL } from "@/types/API_URL";

const activationApiBaseUrl = BASE_URL.replace(/\/+$/g, "");

function getActivationMessage(data) {
  return data?.message || data?.result?.message || data?.error?.message || data?.error || "";
}

function isActivationSuccess(data) {
  const message = String(getActivationMessage(data)).toLowerCase();

  return message === "success" || message.includes("activated") || data?.result?.message === "success";
}

async function activateAccount(id) {
  const userId = Number(id);

  if (!Number.isFinite(userId) || userId <= 0) {
    return {
      ok: false,
      message: "Invalid activation link.",
    };
  }

  try {
    const response = await fetch(`${activationApiBaseUrl}/api/customer/activate`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        params: {
          user_id: userId,
        },
      }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !isActivationSuccess(data)) {
      return {
        ok: false,
        message: getActivationMessage(data) || `Activation failed with status ${response.status}`,
      };
    }

    return {
      ok: true,
      message: "Account activated successfully. You can login now.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error?.message || "Activation server is not reachable.",
    };
  }
}

export default async function ActivateAccountPage({ params }) {
  const { id } = await params;
  const result = await activateAccount(id);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 py-16 text-[#333]">
      <section className="w-full max-w-xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6c5caf]">
          Account Activation
        </p>
        <h1 className="mt-3 text-3xl font-black">
          {result.ok ? "Your account is active" : "Activation failed"}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base font-medium leading-7 text-[#666]">
          {result.message}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="flex min-h-13 items-center justify-center bg-[#6c5caf] px-7 text-base font-semibold text-white shadow-[0_14px_30px_rgba(80,65,145,0.22)] transition hover:bg-[#564796]"
          >
            Go to home page
          </Link>
          <Link
            href="/"
            className="flex min-h-13 items-center justify-center border border-[#6c5caf] px-7 text-base font-semibold text-[#6c5caf] transition hover:bg-[#f3f0ff]"
          >
            Go to login page
          </Link>
        </div>
      </section>
    </main>
  );
}
