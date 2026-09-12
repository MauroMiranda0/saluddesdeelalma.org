"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminGuard } from "../../../lib/auth/use-admin-session";
import {
  completeAppointment,
  listAdminAppointments,
  type AdminAppointment
} from "../../../lib/admin/api";

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { appointments: list } = await listAdminAppointments();
    setAppointments(list);
  }, []);

  useEffect(() => {
    refresh().catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "No se pudo cargar")
    );
  }, [refresh]);

  const handleComplete = async (appointment: AdminAppointment) => {
    setError(null);
    setNotice(null);
    try {
      await completeAppointment(appointment.id);
      setNotice(
        "Cita completada, aviso de pago programado y auditoría escrita."
      );
      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No se pudo completar"
      );
    }
  };

  return (
    <AdminGuard>
      <main className="mx-auto max-w-3xl p-4">
        <h1 className="mb-4 text-2xl font-semibold">Citas por completar</h1>
        {error ? <p className="mb-2 text-red-700">{error}</p> : null}
        {notice ? <p className="mb-2 text-green-700">{notice}</p> : null}

        <ul className="flex flex-col gap-2">
          {appointments.map((appointment) => (
            <li
              key={appointment.id}
              className="flex items-center justify-between rounded border p-3"
            >
              <div>
                <p className="font-medium">{appointment.patientName}</p>
                <p className="text-sm text-gray-600">
                  {new Date(appointment.scheduledAt).toLocaleString("es-MX")} ·{" "}
                  {appointment.therapistName} · {appointment.status}
                </p>
              </div>
              <button
                className="rounded bg-emerald-600 px-3 py-1 text-white"
                onClick={() => handleComplete(appointment)}
              >
                Completar cita
              </button>
            </li>
          ))}
        </ul>
      </main>
    </AdminGuard>
  );
}
