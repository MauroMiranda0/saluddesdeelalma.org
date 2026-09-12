"use client";

import Link from "next/link";

import { AdminGuard } from "../../lib/auth/use-admin-session";

export default function AdminPage() {
  return (
    <AdminGuard>
      <main className="mx-auto max-w-3xl p-4">
        <h1 className="mb-4 text-2xl font-semibold">Administración</h1>
        <nav className="flex flex-col gap-2">
          <Link
            href="/admin/therapists"
            className="rounded border p-3 hover:bg-gray-50"
          >
            Perfiles clínicos (terapeutas)
          </Link>
          <Link
            href="/admin/patients"
            className="rounded border p-3 hover:bg-gray-50"
          >
            Pacientes y asignación de terapeuta
          </Link>
          <Link
            href="/admin/appointments"
            className="rounded border p-3 hover:bg-gray-50"
          >
            Citas por completar
          </Link>
        </nav>
      </main>
    </AdminGuard>
  );
}
