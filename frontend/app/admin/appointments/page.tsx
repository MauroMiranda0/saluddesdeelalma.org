"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  completeAppointment,
  listAppointmentsRange,
  type AdminAppointmentEvent
} from "../../../lib/admin/api";
import { CancelDialog } from "../../../components/admin/agenda/cancel-dialog";
import { ConfirmDialog } from "../../../components/admin/agenda/confirm-dialog";
import { RescheduleDialog } from "../../../components/admin/agenda/reschedule-dialog";

const VISIBLE_STATUSES = new Set(["programada", "confirmada", "cancelada"]);

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

const STATUS_LABEL: Record<AdminAppointmentEvent["status"], string> = {
  programada: "Programada",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada"
};

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AdminAppointmentEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<AdminAppointmentEvent | null>(
    null
  );
  const [rescheduling, setRescheduling] =
    useState<AdminAppointmentEvent | null>(null);
  const [confirming, setConfirming] = useState<AdminAppointmentEvent | null>(
    null
  );

  const refresh = useCallback(async () => {
    const { appointments: list } = await listAppointmentsRange(
      rangeStart().toISOString(),
      rangeEnd().toISOString()
    );
    setAppointments(list.filter((item) => VISIBLE_STATUSES.has(item.status)));
  }, []);

  useEffect(() => {
    refresh().catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "No se pudo cargar")
    );
  }, [refresh]);

  const handleComplete = async (appointment: AdminAppointmentEvent) => {
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

  const handleConfirmed = async () => {
    setConfirming(null);
    setNotice("Cita confirmada y aviso de WhatsApp programado.");
    await refresh();
  };

  const handleCancelled = () => {
    setCancelling(null);
    void refresh();
  };

  const handleRescheduled = () => {
    setRescheduling(null);
    void refresh();
  };

  const sorted = useMemo(
    () =>
      [...appointments].sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      ),
    [appointments]
  );

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">Citas</h1>
      {error ? <p className="mb-2 text-red-700">{error}</p> : null}
      {notice ? <p className="mb-2 text-green-700">{notice}</p> : null}

      <ul className="flex flex-col gap-2">
        {sorted.map((appointment) => (
          <li
            key={appointment.id}
            className="flex items-center justify-between gap-2 rounded border p-3"
          >
            <div>
              <p className="font-medium">{appointment.patientName}</p>
              <p className="text-sm text-gray-600">
                {new Date(appointment.scheduledAt).toLocaleString("es-MX")} ·{" "}
                {appointment.therapistName} ·{" "}
                <span
                  className={`font-semibold ${
                    appointment.status === "programada"
                      ? "text-amber-700"
                      : appointment.status === "confirmada"
                        ? "text-green-700"
                        : "text-gray-600"
                  }`}
                >
                  {STATUS_LABEL[appointment.status]}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {appointment.status === "programada" && (
                <button
                  className="rounded bg-forest px-3 py-1 text-sm text-white hover:bg-forest-deep"
                  onClick={() => setConfirming(appointment)}
                >
                  Confirmar
                </button>
              )}
              {(appointment.status === "programada" ||
                appointment.status === "confirmada") && (
                <>
                  <button
                    className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                    onClick={() => setRescheduling(appointment)}
                  >
                    Mover
                  </button>
                  <button
                    className="rounded border border-forest px-3 py-1 text-sm text-forest hover:bg-forest/10"
                    onClick={() => handleComplete(appointment)}
                  >
                    Completar
                  </button>
                  <button
                    className="rounded border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                    onClick={() => setCancelling(appointment)}
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {cancelling && (
        <CancelDialog
          appointment={cancelling}
          onCancelled={handleCancelled}
          onClose={() => setCancelling(null)}
        />
      )}

      {rescheduling && (
        <RescheduleDialog
          appointment={rescheduling}
          onRescheduled={handleRescheduled}
          onClose={() => setRescheduling(null)}
        />
      )}

      {confirming && (
        <ConfirmDialog
          appointment={confirming}
          onConfirmed={handleConfirmed}
          onClose={() => setConfirming(null)}
        />
      )}
    </main>
  );
}
