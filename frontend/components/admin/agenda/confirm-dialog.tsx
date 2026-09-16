"use client";

import { useState } from "react";

import { ApiError } from "../../../lib/api/client";
import {
  confirmAppointment,
  type AdminAppointmentEvent
} from "../../../lib/admin/api";

type ConfirmDialogProps = {
  appointment: AdminAppointmentEvent;
  onConfirmed: () => void;
  onClose: () => void;
};

export const ConfirmDialog = ({
  appointment,
  onConfirmed,
  onClose
}: ConfirmDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await confirmAppointment(appointment.id);
      onConfirmed();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo confirmar la cita."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold text-gray-800">
          Confirmar cita
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          {appointment.patientName} ·{" "}
          {appointment.therapistName ?? "Sin terapeuta"}
        </p>

        <p className="mb-4 text-sm text-gray-700">
          Se marcará como confirmada y se enviará la confirmación por WhatsApp
          si se puede.
        </p>

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
            className="rounded bg-forest px-4 py-1.5 text-sm font-semibold text-white hover:bg-forest/90 disabled:opacity-60"
          >
            {submitting ? "Confirmando…" : "Confirmar cita"}
          </button>
        </div>
      </div>
    </div>
  );
};
