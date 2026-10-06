import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Automation & Sequences | Rapid Launch Back office",
};

export default async function AutomationPage() {
  await requireAdmin();

  return (
    <div className="admin-enter space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-950">
          Automation & Sequences
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Timed, multi-step email sequences triggered by customer actions.
        </p>
      </div>

      <div className="rounded-[20px] border border-neutral-300 bg-white p-6">
        <EmptyState
          title="Sequences are coming soon"
          description="Build this section after Email & Broadcasting is live. It will handle welcome flows, abandoned-checkout reminders, and course nurture sequences."
        />
      </div>
    </div>
  );
}