import type { Metadata } from "next";

import { BroadcastComposer } from "@/components/admin/broadcast/broadcast-composer";
import { BroadcastHistory } from "@/components/admin/broadcast/broadcast-history";
import { requireAdmin } from "@/lib/auth/admin";
import {
  countPendingScheduledBroadcasts,
  getBroadcastOptions,
  listBroadcasts,
  listScheduledBroadcasts,
} from "@/lib/services/broadcast-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email & Broadcasting | Rapid Launch Back office",
};

interface BroadcastPageProps {
  searchParams: Promise<{ tab?: string | string[] } | null>;
}

export default async function EmailBroadcastPage({
  searchParams,
}: BroadcastPageProps) {
  await requireAdmin();

  const sp = await searchParams;
  const tabParam = Array.isArray(sp?.tab) ? sp?.tab[0] : sp?.tab;
  const activeTab = tabParam === "scheduled" ? "scheduled" : "sent";

  const [options, history, scheduled, pendingCount] = await Promise.all([
    getBroadcastOptions(),
    listBroadcasts(20),
    listScheduledBroadcasts(20),
    countPendingScheduledBroadcasts(),
  ]);

  return (
    <div className="admin-enter space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-950">
          Email & Broadcasting
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          One segmented, designed campaign to any audience on the platform.
        </p>
      </div>

      <BroadcastComposer options={options} />

      <BroadcastHistory
        rows={history}
        scheduledRows={scheduled}
        pendingCount={pendingCount}
        activeTab={activeTab}
      />
    </div>
  );
}
