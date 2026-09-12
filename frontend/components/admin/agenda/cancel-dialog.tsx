"use client";

import { useState } from "react";

import { ApiError } from "../../../lib/api/client";
import {
  cancelAdminAppointment,
  type AdminAppointmentEvent
} from "../../../lib/admin/api";

type CancelDialogProps = {
  appointment: AdminAppointmentEvent;
  onCancelled: () => void;
  onClose: () => void;
};

export const CancelDialog = ({
  appointment,
  onCancelled,
  onClose
}: CancelDialogProps) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) {
      setError("Escribe el motivo de la cancelación.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await cancelAdminAppointment(appointment.id, reason.trim());
      onCancelled();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo cancelar la cita."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold text-gray-800">
          Cancelar cita
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          {appointment.patientName} ·{" "}
          {appointment.therapistName ?? "Sin terapeuta"}
        </p>

        <label className="mb-1 block text-xs font-medium text-gray-500">
          Motivo de cancelación
        </label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          className="mb-3 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          placeholder="Ej. La paciente no puede asistir…"
        />

        {error && (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Regresar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded bg-gray-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60"
          >
            {submitting ? "Cancelando…" : "Confirmar cancelación"}
          </button>
        </div>
      </div>
    </div>
  );
};
