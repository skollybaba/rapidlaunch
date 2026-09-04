import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-100 lg:flex-row">
      <aside className="sticky top-0 z-30 flex w-full flex-col overflow-y-auto border-b border-ink-950 bg-ink-950 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:self-start lg:h-screen">
        <AdminNav />
      </aside>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col px-6 py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
