"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchDirectory,
  listAppointmentsRange,
  type AdminAppointmentEvent,
  type Directory
} from "../../../lib/admin/api";

export const UserDirectory = () => {
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [appointments, setAppointments] = useState<AdminAppointmentEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() - 1);
    const horizon = new Date(tomorrow);
    horizon.setDate(horizon.getDate() + 30);

    Promise.all([
      fetchDirectory(),
      listAppointmentsRange(tomorrow.toISOString(), horizon.toISOString())
    ])
      .then(([directoryData, appointmentData]) => {
        if (active) {
          setDirectory(directoryData);
          setAppointments(appointmentData.appointments);
        }
      })
      .catch(() => {
        if (active) {
          setError("No se pudo cargar el directorio.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const therapistNameById = useMemo(() => {
    const names = new Map<string, string>();

    for (const therapist of directory?.therapists ?? []) {
      names.set(therapist.id, therapist.fullName);
    }

    return names;
  }, [directory]);

  const patientUpcoming = useMemo(() => {
    const upcoming = new Map<string, AdminAppointmentEvent>();
    const sorted = [...appointments].sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

    for (const appointment of sorted) {
      if (
        !upcoming.has(appointment.patientId) &&
        (appointment.status === "programada" ||
          appointment.status === "confirmada")
      ) {
        upcoming.set(appointment.patientId, appointment);
      }
    }

    return upcoming;
  }, [appointments]);

  if (error) {
    return (
      <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (!directory) {
    return (
      <p className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-500">
        Cargando directorio…
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-800">
          Psicólogas y psicólogos
        </h2>
        <div className="space-y-2">
          {directory.therapists.length === 0 && (
            <p className="text-sm text-gray-400">Sin perfiles registrados.</p>
          )}
          {directory.therapists.map((therapist) => (
            <article
              key={therapist.id}
              className="flex items-center gap-3 rounded border border-gray-200 bg-white p-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lavender-100 text-sm font-semibold text-lavender-800">
                {therapist.fullName
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-800">
                  {therapist.fullName}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {therapist.email}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  therapist.isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {therapist.isActive ? "Activa" : "Inactiva"}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-800">
          Pacientes
        </h2>
        <div className="space-y-2">
          {directory.patients.length === 0 && (
            <p className="text-sm text-gray-400">Sin pacientes registrados.</p>
          )}
          {directory.patients.map((patient) => {
            const upcoming = patientUpcoming.get(patient.id);

            return (
              <article
                key={patient.id}
                className="space-y-1 rounded border border-gray-200 bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {patient.fullName}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      patient.status === "activo"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {patient.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {patient.whatsappPhone}
                  {patient.birthdate && ` · 🎂 ${patient.birthdate}`}
                </p>
                <p className="text-xs text-gray-500">
                  Terapeuta:{" "}
                  {patient.assignedTherapistId
                    ? (therapistNameById.get(patient.assignedTherapistId) ??
                      "—")
                    : "Sin asignar"}
                </p>
                <p className="text-xs text-gray-500">
                  Próxima cita:{" "}
                  {upcoming
                    ? `${new Date(upcoming.scheduledAt).toLocaleDateString(
                        "es-MX",
                        {
                          day: "numeric",
                          month: "short"
                        }
                      )} · ${new Date(upcoming.scheduledAt).toLocaleTimeString(
                        "es-MX",
                        {
                          hour: "2-digit",
                          minute: "2-digit"
                        }
                      )} · ${
                        upcoming.paymentStatus === "completado"
                          ? "pagada"
                          : upcoming.paymentStatus === "anticipo"
                            ? "anticipo registrado"
                            : "pago pendiente"
                      }`
                    : "Sin citas próximas"}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
