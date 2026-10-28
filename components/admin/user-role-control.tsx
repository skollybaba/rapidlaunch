"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { isApiFailure, readApiError } from "@/lib/feedback";
import { readApiJson } from "@/lib/http";
import { USER_ROLES, type UserRole } from "@/types/user";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  customer: "Customer",
};

interface UserRoleControlProps {
  userId: string;
  email: string;
  role: UserRole;
  /**
   * Set for the signed-in admin's own row. The server rejects self-demotion,
   * so the control is disabled rather than letting the admin hit an error.
   */
  isSelf?: boolean;
}

export function UserRoleControl({
  userId,
  email,
  role,
  isSelf = false,
}: UserRoleControlProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [current, setCurrent] = useState<UserRole>(role);
  const [pending, setPending] = useState(false);

  async function change(next: UserRole) {
    if (pending || next === current) return;

    const promoting = next === "admin";
    const confirmed = await confirm({
      title: promoting
        ? `Make ${email} an admin?`
        : `Remove admin access from ${email}?`,
      description: promoting
        ? "They will be able to open the admin portal and manage products, orders, customers and settings."
        : "They will lose access to the admin portal immediately. Their account and orders stay intact.",
      confirmLabel: promoting ? "Make admin" : "Remove admin",
      tone: promoting ? "primary" : "danger",
    });
    if (!confirmed) return;

    setPending(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      const json = await readApiJson(response);
      if (!json?.ok || isApiFailure(json)) {
        throw new Error(
          readApiError(json, "Could not update this user's role.")
        );
      }

      setCurrent(next);
      toast.success({
        title: promoting
          ? `${email} is now an admin.`
          : `${email} is now a customer.`,
      });
      router.refresh();
    } catch (error) {
      toast.error({
        title:
          error instanceof Error
            ? error.message
            : "Could not update this user's role.",
        description: isSelf ? "You cannot change your own role." : undefined,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={current}
        disabled={pending || isSelf}
        onChange={(event) => void change(event.target.value as UserRole)}
        aria-label={`Role for ${email}`}
        title={isSelf ? "You cannot change your own role" : undefined}
        className="rounded-[10px] border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 outline-none transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {USER_ROLES.map((option) => (
          <option key={option} value={option}>
            {ROLE_LABELS[option]}
          </option>
        ))}
      </select>
      {pending ? (
        <Loader2
          className="h-3.5 w-3.5 animate-spin text-neutral-400"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
