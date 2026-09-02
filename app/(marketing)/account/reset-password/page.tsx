import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reset password | Rapid Launch",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string | string[] }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const raw = params.token;
  const token = Array.isArray(raw) ? raw[0] : raw ?? "";

  return (
    <div className="flex flex-1 flex-col bg-paper-50">
      <div className="mx-auto w-[95%] md:w-[min(80%,96rem)] flex-1 px-6 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto w-full max-w-md">
          <ResetPasswordForm token={token} />
        </div>
      </div>
    </div>
  );
}
