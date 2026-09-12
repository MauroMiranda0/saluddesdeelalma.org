"use client";

import { useState } from "react";

import { ApiError } from "../../../lib/api/client";
import {
  createAdminAppointment,
  type DirectoryPatient
} from "../../../lib/admin/api";

type AppointmentFormProps = {
  patients: DirectoryPatient[];
  onCreated: () => void;
  onClose: () => void;
};

const toIsoFromLocalInput = (value: string) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export const AppointmentForm = ({
  patients,
  onCreated,
  onClose
}: AppointmentFormProps) => {
  const [patientId, setPatientId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [modality, setModality] = useState<"online" | "presencial">("online");
  const [therapyType, setTherapyType] = useState<
    "individual" | "pareja" | "familiar"
  >("individual");
  const [isManualException, setIsManualException] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const iso = toIsoFromLocalInput(scheduledAt);

    if (!patientId || !iso) {
      setError("Selecciona un paciente y una fecha y hora válidas.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createAdminAppointment({
        patientId,
        scheduledAt: iso,
        modality,
        therapyType,
        isManualException
      });
      onCreated();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo crear la cita."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Nueva cita</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-gray-500">
          Paciente
        </label>
        <select
          value={patientId}
          onChange={(event) => setPatientId(event.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">Seleccionar paciente…</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.fullName}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs font-medium text-gray-500">
          Fecha y hora
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(event) => setScheduledAt(event.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
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

        <label className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={isManualException}
            onChange={(event) => setIsManualException(event.target.checked)}
          />
          Excepción manual (fuera de horario regular)
        </label>

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
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Guardando…" : "Guardar cita"}
          </button>
        </div>
      </div>
    </div>
  );
};
