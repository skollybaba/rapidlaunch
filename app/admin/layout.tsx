import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminThemeProvider } from "@/components/admin/admin-theme";

export const dynamic = "force-dynamic";

/* Applied before first paint so a persisted dark choice does not flash light.
   The attribute lives on <html> only while an admin route is mounted. */
const ADMIN_THEME_SCRIPT = `(function(){try{if(localStorage.getItem('admin-theme')==='dark'){document.documentElement.setAttribute('data-admin-theme','dark');}}catch(e){}})();`;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: ADMIN_THEME_SCRIPT }} />
      <AdminThemeProvider>
        <div className="admin-portal flex min-h-screen flex-col bg-neutral-100 lg:flex-row">
          <AdminSidebar />
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col px-6 py-8 lg:px-10 lg:py-10">
              {children}
            </div>
          </div>
        </div>
      </AdminThemeProvider>
    </>
  );
}
