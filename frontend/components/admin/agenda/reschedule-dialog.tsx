"use client";

import { useState } from "react";

import { ApiError } from "../../../lib/api/client";
import {
  rescheduleAdminAppointment,
  type AdminAppointmentEvent
} from "../../../lib/admin/api";
import { DateTimePicker } from "../schedule/date-time-picker";

type RescheduleDialogProps = {
  appointment: AdminAppointmentEvent;
  onRescheduled: () => void;
  onClose: () => void;
};

const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoFromLocalInput = (value: string) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const isOutsideRegularSchedule = (
  iso: string | undefined,
  therapyType: "individual" | "pareja" | "familiar"
) => {
  if (!iso) {
    return false;
  }

  const scheduledAt = new Date(iso);

  if (Number.isNaN(scheduledAt.getTime())) {
    return false;
  }

  const endsAt = new Date(
    scheduledAt.getTime() + (therapyType === "individual" ? 60 : 90) * 60_000
  );
  const weekday = scheduledAt.getDay();

  return (
    weekday === 0 ||
    weekday === 6 ||
    scheduledAt.getHours() < 9 ||
    endsAt.getDate() !== scheduledAt.getDate() ||
    endsAt.getHours() > 21 ||
    (endsAt.getHours() === 21 && endsAt.getMinutes() !== 0)
  );
};

export const RescheduleDialog = ({
  appointment,
  onRescheduled,
  onClose
}: RescheduleDialogProps) => {
  const [scheduledAt, setScheduledAt] = useState(
    toLocalInput(appointment.scheduledAt)
  );
  const [modality, setModality] = useState<"online" | "presencial">(
    appointment.modality
  );
  const [therapyType, setTherapyType] = useState<
    "individual" | "pareja" | "familiar"
  >(appointment.therapyType);
  const [manualExceptionConfirmed, setManualExceptionConfirmed] =
    useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const iso = toIsoFromLocalInput(scheduledAt);

    if (!iso) {
      setError("Selecciona una fecha y hora válidas.");
      return;
    }

    const outsideRegularSchedule = isOutsideRegularSchedule(iso, therapyType);

    if (outsideRegularSchedule && !manualExceptionConfirmed) {
      setError(
        "Confirma la excepción manual para reagendar fuera del horario regular."
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await rescheduleAdminAppointment(appointment.id, {
        scheduledAt: iso,
        modality,
        therapyType,
        manualExceptionConfirmed: outsideRegularSchedule
      });
      onRescheduled();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo mover la cita."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold text-gray-800">Mover cita</h2>
        <p className="mb-4 text-sm text-gray-500">
          {appointment.patientName} ·{" "}
          {appointment.therapistName ?? "Sin terapeuta"}
        </p>

        <label className="mb-1 block text-xs font-medium text-gray-500">
          Nueva fecha y hora
        </label>
        <DateTimePicker
          value={scheduledAt}
          onChange={setScheduledAt}
          therapistId={appointment.therapistId}
          durationMinutes={therapyType === "individual" ? 60 : 90}
          excludeAppointmentId={appointment.id}
        />

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Modalidad
            </label>
            <select
              value={modality}
              onChange={(event) =>
                setModality(event.target.value as "online" | "presencial")
              }
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="online">En línea</option>
              <option value="presencial">Presencial</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Tipo
            </label>
            <select
              value={therapyType}
              onChange={(event) =>
                setTherapyType(
                  event.target.value as "individual" | "pareja" | "familiar"
                )
              }
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="individual">Individual</option>
              <option value="pareja">Pareja</option>
              <option value="familiar">Familiar</option>
            </select>
          </div>
        </div>

        {isOutsideRegularSchedule(
          toIsoFromLocalInput(scheduledAt),
          therapyType
        ) && (
          <label className="mb-3 flex items-start gap-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <input
              type="checkbox"
              checked={manualExceptionConfirmed}
              onChange={(event) =>
                setManualExceptionConfirmed(event.target.checked)
              }
              className="mt-0.5"
            />
            Confirmo esta excepción manual fuera del horario regular (Lun–Vie,
            09:00–21:00).
          </label>
        )}

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
            disabled={
              submitting ||
              (isOutsideRegularSchedule(
                toIsoFromLocalInput(scheduledAt),
                therapyType
              ) &&
                !manualExceptionConfirmed)
            }
            className="rounded bg-forest px-4 py-1.5 text-sm font-semibold text-white hover:bg-forest-deep disabled:opacity-60"
          >
            {submitting ? "Moviendo…" : "Confirmar cambio"}
          </button>
        </div>
      </div>
    </div>
  );
};
