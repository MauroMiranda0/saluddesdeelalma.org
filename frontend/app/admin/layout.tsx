"use client";

import { usePathname } from "next/navigation";

import { AdminNav } from "../../components/admin/admin-nav";
import { AdminGuard } from "../../lib/auth/use-admin-session";

export default function AdminLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <div className="admin-shell">
        <AdminNav />
        <main className="admin-content">{children}</main>
      </div>
    </AdminGuard>
  );
}
