import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountSignIn } from "@/components/account/account-sign-in";
import { getCurrentPublicUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in | Rapid Launch",
};

interface AccountPageProps {
  searchParams: Promise<{ next?: string }>;
}

function resolveNext(raw: string | undefined): string | null {
  if (!raw) return null;
  if (typeof window !== "undefined") {
    try {
      if (new URL(raw, window.location.origin).origin !== window.location.origin) {
        return null;
      }
    } catch {
      return null;
    }
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const { next } = await searchParams;
  const user = await getCurrentPublicUser();
  if (user) {
    const resolved = resolveNext(next);
    if (user.role === "admin" && !resolved) redirect("/admin");
    redirect(resolved ?? "/account/overview");
  }

  return (
    <div className="flex flex-1 flex-col bg-paper-50">
      <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto w-full max-w-md">
          <AccountSignIn next={next} />
        </div>
      </div>
    </div>
  );
}
