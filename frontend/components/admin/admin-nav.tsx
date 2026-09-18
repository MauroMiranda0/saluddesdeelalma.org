"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { logoutAdminSession } from "../../lib/auth/session";

const NAV_ITEMS = [
  { href: "/admin", label: "Resumen", icon: "⌂" },
  { href: "/admin/agenda", label: "Agenda", icon: "◫" },
  { href: "/admin/directorio", label: "Directorio", icon: "◌" },
  { href: "/admin/patients", label: "Pacientes", icon: "♙" },
  { href: "/admin/therapists", label: "Psicólogos/as", icon: "✦" },
  { href: "/admin/appointments", label: "Citas", icon: "□" },
  { href: "/admin/payments", label: "Pagos", icon: "$" }
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
    <header className="fixed inset-x-0 bottom-0 z-30 border-t border-[--border] bg-[#fffdfa]/95 backdrop-blur md:sticky md:top-0 md:bottom-auto md:flex md:min-h-dvh md:w-56 md:shrink-0 md:flex-col md:border-t-0 md:border-r">
      <div className="hidden w-full border-b border-[--border] px-5 py-6 md:block">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-sepia/40 bg-[#f7ecdd] font-serif text-sm italic text-sepia">
            SdA
          </span>
          <span className="text-sm font-semibold leading-tight text-[--foreground]">
            Salud desde
            <br />
            el Alma
          </span>
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-1 px-2 py-2 md:flex-1 md:flex-col md:items-stretch md:justify-start md:px-4 md:py-6">
        <nav className="flex flex-1 items-center justify-around gap-1 overflow-x-auto md:flex-none md:flex-col md:items-stretch md:justify-start">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-12 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition md:flex-row md:gap-3 md:px-3 md:py-2 md:text-sm ${
                  active
                    ? "bg-[#e8dfcd] text-forest"
                    : "text-[--muted] hover:bg-[#f0e9dc] hover:text-forest"
                }`}
              >
                <span className="text-base leading-none" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="hidden rounded-lg px-3 py-2 text-left text-sm text-[--muted] hover:bg-[#f0e9dc] disabled:opacity-60 md:block"
        >
          {signingOut ? "Saliendo…" : "Salir"}
        </button>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          aria-label="Salir"
          className="flex min-w-12 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] text-[--muted] disabled:opacity-60 md:hidden"
        >
          <span className="text-base leading-none" aria-hidden="true">
            ↪
          </span>
          {signingOut ? "..." : "Salir"}
        </button>
      </div>
    </header>
  );
};
