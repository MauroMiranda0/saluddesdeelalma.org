"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listAppointmentsRange,
  type AdminAppointmentEvent
} from "../../../lib/admin/api";

const rangeStart = () => {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  return start;
};

const rangeEnd = () => {
  const end = new Date();
  end.setFullYear(end.getFullYear() + 1);
  return end;
};

export default function AdminPaymentsPage() {
  const [appointments, setAppointments] = useState<AdminAppointmentEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { appointments: list } = await listAppointmentsRange(
      rangeStart().toISOString(),
      rangeEnd().toISOString()
    );
    setAppointments(
      list.filter(
        (appointment) =>
          appointment.status !== "cancelada" &&
          appointment.paymentStatus !== "completado"
      )
    );
  }, []);

  useEffect(() => {
    refresh().catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "No se pudo cargar")
    );
  }, [refresh]);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-1 text-2xl font-semibold">Pagos</h1>
      <p className="mb-4 text-sm text-gray-600">
        Citas con pago pendiente o anticipo registrado.
      </p>
      {error ? <p className="mb-2 text-red-700">{error}</p> : null}

      {appointments.length === 0 ? (
        <p className="rounded border border-gray-200 p-4 text-sm text-gray-500">
          No hay pagos pendientes.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {appointments.map((appointment) => (
            <li
              key={appointment.id}
              className="flex items-center justify-between gap-3 rounded border p-3"
            >
              <div>
                <p className="font-medium">{appointment.patientName}</p>
                <p className="text-sm text-gray-600">
                  {new Date(appointment.scheduledAt).toLocaleString("es-MX")} ·{" "}
                  {appointment.therapistName ?? "Sin terapeuta"}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  appointment.paymentStatus === "anticipo"
                    ? "bg-violet-100 text-violet-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {appointment.paymentStatus === "anticipo"
                  ? "Anticipo"
                  : "Pendiente"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
