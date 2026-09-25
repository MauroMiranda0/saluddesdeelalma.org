"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { logoutAdminSession } from "../../lib/auth/session";
import { BrandLogo } from "../ui/brand-logo";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "🏠" },
  { href: "/admin/agenda", label: "Agenda", icon: "🗓️" },
  { href: "/admin/directorio", label: "Directorio", icon: "📇" },
  { href: "/admin/patients", label: "Pacientes", icon: "🧑‍🤝‍🧑" },
  { href: "/admin/therapists", label: "Psicólogos/as", icon: "🧠" },
  { href: "/admin/appointments", label: "Citas", icon: "📅" },
  { href: "/admin/payments", label: "Pagos", icon: "💳" }
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
    <header className="fixed inset-x-0 bottom-0 z-30 border-t border-[#7e5d41]/15 bg-[#f3e7db]/95 backdrop-blur-xl md:sticky md:top-0 md:bottom-auto md:flex md:min-h-dvh md:w-72 md:shrink-0 md:flex-col md:border-t-0 md:border-r md:border-[#7e5d41]/15 md:bg-[#f3e7db]">
      <div className="hidden w-full border-b border-[#7e5d41]/15 px-5 py-8 md:block">
        <Link href="/admin" className="flex flex-col items-center text-center">
          <BrandLogo
            className="h-20 w-20 rounded-full border-2 border-white shadow-sm"
            priority
          />
          <span className="mt-4 text-xl font-semibold italic leading-tight text-[#7e5d41]">
            Salud desde el Alma
          </span>
          <span className="mt-2 text-xs font-semibold tracking-[0.12em] text-[#66594d]">
            PANEL ADMINISTRATIVO
          </span>
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-1 px-2 py-2 md:flex-1 md:flex-col md:items-stretch md:justify-start md:px-4 md:py-7">
        <nav className="flex flex-1 items-center justify-around gap-1 overflow-x-auto md:flex-none md:flex-col md:items-stretch md:justify-start md:gap-2">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-12 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition duration-300 md:flex-row md:gap-3 md:px-4 md:py-3 md:text-sm ${
                  active
                    ? "bg-[#e8c59a] text-[#7e5d41] shadow-[0_4px_12px_rgba(52,41,31,0.08)]"
                    : "text-[#66594d] hover:bg-[#cfc7ab]/55 hover:text-[#7e5d41]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm leading-none ${
                    active
                      ? "bg-[#7e5d41] text-white"
                      : "bg-[#cfc7ab]/55 text-[#7e5d41]"
                  }`}
                  aria-hidden="true"
                >
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
          className="hidden rounded-full border border-[#7e5d41]/25 px-4 py-2.5 text-left text-sm font-medium text-[#7e5d41] transition hover:bg-[#cfc7ab]/55 disabled:opacity-60 md:block"
        >
          {signingOut ? "Saliendo…" : "Salir"}
        </button>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          aria-label="Salir"
          className="flex min-w-12 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] text-[#7e5d41] disabled:opacity-60 md:hidden"
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
