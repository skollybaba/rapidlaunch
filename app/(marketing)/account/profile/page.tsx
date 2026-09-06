import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccountNav } from "@/components/account/account-nav";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile | Rapid Launch",
};

export default async function AccountProfilePage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  return (
    <div className="flex flex-1 flex-col bg-paper-50">
      <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 py-16 lg:px-8 lg:py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          My account
        </p>
        <h1 className="mt-2 text-[38px] leading-[1.286] md:text-[1.75rem]">
          Profile &amp; security
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Manage your personal details and password.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <AccountNav />

          <div className="space-y-8">
            <ProfileForm initialName={user.name || ""} email={user.email} />
            <PasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
