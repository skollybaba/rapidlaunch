import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, TriangleAlert, X } from "lucide-react";

import { BroadcastModal } from "@/components/admin/broadcast-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminUsers } from "@/lib/services/admin-service";
import { USER_ROLES } from "@/types/user";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users | Rapid Launch Back office",
};

function roleTone(role: string) {
  return role === "admin" ? "info" : "neutral";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    page?: string;
    broadcast?: string;
    sent?: string;
    total?: string;
    failed?: string;
  }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const q = sp.q ?? "";
  const role = sp.role ?? "";
  const page = Number(sp.page) || 1;

  const broadcast = sp.broadcast === "sent"
    ? {
        sent: Number(sp.sent) || 0,
        total: Number(sp.total) || 0,
        failed: Number(sp.failed) || 0,
      }
    : null;

  const data = await getAdminUsers({ q, role, page, pageSize: 25 });

  return (
    <div className="admin-enter space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Users</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Every account on the platform.
          </p>
        </div>
        <BroadcastModal />
      </div>

      {broadcast ? (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-[16px] border p-5 ${
            broadcast.failed > 0
              ? "border-amber-200 bg-amber-50"
              : "border-success-100 bg-success-100/50"
          }`}
        >
          {broadcast.failed > 0 ? (
            <TriangleAlert
              className="mt-0.5 size-5 shrink-0 text-amber-600"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0 text-success-600"
              aria-hidden="true"
            />
          )}
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {broadcast.failed > 0
                ? "Broadcast sent with some failures"
                : "Broadcast sent"}
            </p>
            <p className="mt-0.5 text-sm text-neutral-600">
              Your email was sent to {broadcast.sent} of {broadcast.total}{" "}
              recipients
              {broadcast.failed > 0 ? ` (${broadcast.failed} failed)` : ""}.
            </p>
          </div>
          <Link
            href="/admin/users"
            aria-label="Dismiss notification"
            className="ml-auto rounded-full p-2 text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-1 flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label htmlFor="user-q" className="block text-xs font-semibold text-neutral-500">
              Search
            </label>
            <input
              id="user-q"
              name="q"
              defaultValue={q}
              placeholder="Email or name"
              className="mt-1 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-950 focus:border-terracotta-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="user-role" className="block text-xs font-semibold text-neutral-500">
              Role
            </label>
            <select
              id="user-role"
              name="role"
              defaultValue={role}
              className="mt-1 rounded-[12px] border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-950 focus:border-terracotta-600 focus:outline-none"
            >
              <option value="">All roles</option>
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-[42px] rounded-pill bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Apply
          </button>
        </form>
      </div>

      {data.rows.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Adjust your search or filters."
        />
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Provider</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 font-semibold">Orders</th>
                  <th className="px-5 py-3 font-semibold">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.rows.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-neutral-950">
                        {user.name || "—"}
                      </p>
                      <p className="text-xs text-neutral-500">{user.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={roleTone(user.role)}>{user.role}</Badge>
                    </td>
                    <td className="px-5 py-4 text-neutral-700">{user.provider || "password"}</td>
                    <td className="px-5 py-4 text-neutral-700">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-4 text-neutral-700">{user.orderCount}</td>
                    <td className="px-5 py-4 text-neutral-700">{user.paidCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
