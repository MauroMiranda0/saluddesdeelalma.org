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
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </AdminGuard>
  );
}
