import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountSignIn } from "@/components/account/account-sign-in";
import { getCurrentPublicUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in | Rapid Launch",
};

export default async function AccountPage() {
  const user = await getCurrentPublicUser();
  if (user) redirect("/account");

  return (
    <div className="flex flex-1 flex-col bg-paper-50">
      <div className="mx-auto w-[95%] md:w-[min(80%,96rem)] flex-1 px-6 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto w-full max-w-md">
          <AccountSignIn />
        </div>
      </div>
    </div>
  );
}
