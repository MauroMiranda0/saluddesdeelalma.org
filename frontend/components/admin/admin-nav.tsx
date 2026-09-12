"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { logoutAdminSession } from "../../lib/auth/session";

const NAV_ITEMS = [
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/directorio", label: "Directorio" },
  { href: "/admin/patients", label: "Pacientes" },
  { href: "/admin/therapists", label: "Psicólogos/as" },
  { href: "/admin/appointments", label: "Citas" }
];

export const AdminNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);

    try {
      await logoutAdminSession();
    } finally {
      router.replace("/admin/login");
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
            SdA
          </span>
          <span className="text-sm font-semibold text-gray-800">
            Salud desde el Alma · Panel
          </span>
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname !== "/admin" && pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1 text-sm ${
                  active
                    ? "bg-emerald-700 text-white"
                    : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        >
          {signingOut ? "Saliendo…" : "Salir"}
        </button>
      </div>
    </header>
  );
};
