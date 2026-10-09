"use client";

import { useEffect, useRef, useState } from "react";

import { AdminNav } from "@/components/admin/admin-nav";

/**
 * Mobile-first shell for the back-office navigation. On screens below `lg` the
 * sidebar collapses to a compact top bar and the nav panel toggles open/closed;
 * on `lg` and above it is always expanded as a fixed column.
 */
export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <aside className="sticky top-0 z-30 flex w-full flex-col border-b border-ink-950 bg-ink-950 lg:h-screen lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:self-start lg:overflow-y-auto">
      <AdminNav
        open={open}
        onToggle={() => setOpen((value) => !value)}
        onNavigate={() => setOpen(false)}
        toggleRef={toggleRef}
      />
    </aside>
  );
}
