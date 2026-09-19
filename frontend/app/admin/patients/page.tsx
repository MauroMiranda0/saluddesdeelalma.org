"use client";

import { useCallback, useEffect, useState } from "react";

import {
  assignPatientTherapist,
  createAdminPatient,
  listTherapistProfiles,
  listAdminPatients,
  updatePatientStatus,
  type AdminPatient,
  type TherapistProfile
} from "../../../lib/admin/api";

const INITIAL_FORM = {
  fullName: "",
  whatsappPhone: "",
  birthdate: "",
  preferredModality: "" as "" | "online" | "presencial",
  email: "",
  therapistId: ""
};

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [therapists, setTherapists] = useState<TherapistProfile[]>([]);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    const [{ patients: patientList }, { therapists: therapistList }] =
      await Promise.all([listAdminPatients(), listTherapistProfiles()]);
    setPatients(patientList);
    setTherapists(therapistList);
    setPending((current) => {
      const draft: Record<string, string> = {};
      for (const patient of patientList) {
        draft[patient.id] =
          current[patient.id] ?? patient.assignedTherapistId ?? "";
      }
      return draft;
    });
  }, []);

  useEffect(() => {
    refresh().catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "No se pudo cargar")
    );
  }, [refresh]);

  const setField = (field: keyof typeof INITIAL_FORM, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await createAdminPatient({
        fullName: form.fullName,
        whatsappPhone: form.whatsappPhone,
        birthdate: form.birthdate,
        preferredModality: form.preferredModality || undefined,
        email: form.email || undefined,
        therapistId: form.therapistId || undefined
      });
      setForm(INITIAL_FORM);
      setNotice("Paciente creado y auditado.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo crear");
    }
  };

  const handleAssign = async (patient: AdminPatient) => {
    setError(null);
    setNotice(null);
    try {
      const therapistId = pending[patient.id] || null;
      await assignPatientTherapist(patient.id, therapistId);
      setNotice("Asignación guardada y auditada.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo asignar");
    }
  };

  const handleToggleStatus = async (patient: AdminPatient) => {
    setError(null);
    setNotice(null);
    try {
      await updatePatientStatus(patient.id, patient.status !== "activo");
      setNotice("Estado del paciente actualizado y auditado.");
      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No se pudo actualizar"
      );
    }
  };

  const visiblePatients = patients.filter((patient) =>
    `${patient.fullName} ${patient.whatsappPhone} ${patient.email ?? ""}`
      .toLocaleLowerCase("es-MX")
      .includes(query.trim().toLocaleLowerCase("es-MX"))
  );

  return (
    <main className="admin-page">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-[--muted]">
            Gestione asignaciones y datos de contacto
          </p>
          <h1 className="page-title">Pacientes</h1>
        </div>
        <label className="relative block w-full md:w-72">
          <span className="sr-only">Buscar paciente</span>
          <input
            className="admin-input rounded-full pl-10 text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar paciente..."
          />
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[--muted]"
            aria-hidden="true"
          >
            ⌕
          </span>
        </label>
      </div>
      {error ? <p className="mb-2 text-red-700">{error}</p> : null}
      {notice ? <p className="mb-2 text-green-700">{notice}</p> : null}

      <form
        className="panel-card mb-6 flex flex-col gap-3 p-5"
        onSubmit={handleCreate}
      >
        <h2 className="font-serif text-2xl font-medium">Crear paciente</h2>
        <label className="flex flex-col gap-1">
          Nombre completo
          <input
            className="rounded border px-2 py-1"
            value={form.fullName}
            onChange={(event) => setField("fullName", event.target.value)}
            minLength={2}
            maxLength={150}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          WhatsApp
          <input
            className="rounded border px-2 py-1"
            value={form.whatsappPhone}
            onChange={(event) => setField("whatsappPhone", event.target.value)}
            placeholder="5215500000000"
            minLength={8}
            maxLength={30}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          Fecha de nacimiento
          <input
            className="rounded border px-2 py-1"
            type="date"
            value={form.birthdate}
            onChange={(event) => setField("birthdate", event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          Modalidad preferida
          <select
            className="rounded border px-2 py-1"
            value={form.preferredModality}
            onChange={(event) =>
              setField("preferredModality", event.target.value)
            }
          >
            <option value="">Sin especificar</option>
            <option value="online">En línea</option>
            <option value="presencial">Presencial</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Correo (opcional)
          <input
            className="rounded border px-2 py-1"
            type="email"
            value={form.email}
            onChange={(event) => setField("email", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          Terapeuta asignado (opcional)
          <select
            className="rounded border px-2 py-1"
            value={form.therapistId}
            onChange={(event) => setField("therapistId", event.target.value)}
          >
            <option value="">Sin asignar</option>
            {therapists
              .filter((therapist) => therapist.isActive)
              .map((therapist) => (
                <option key={therapist.id} value={therapist.id}>
                  {therapist.fullName}
                </option>
              ))}
          </select>
        </label>
        <button
          type="submit"
          className="primary-action self-start px-5 py-2 text-sm"
        >
          Crear paciente
        </button>
      </form>

      <section className="panel-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[--border]/40 px-5 py-4">
          <h2 className="font-serif text-2xl">Directorio operativo</h2>
          <span className="status-chip">
            {visiblePatients.length} pacientes
          </span>
        </div>
        <ul className="flex flex-col gap-2 p-3">
          {visiblePatients.map((patient) => (
            <li key={patient.id} className="panel-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fed2af] text-xs font-bold text-[#79583d]">
                    {patient.fullName
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <div>
                    <p className="font-medium">{patient.fullName}</p>
                    <p className="text-sm text-gray-600">
                      {patient.whatsappPhone}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    patient.status === "activo"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {patient.status === "activo" ? "Activo" : "Inactivo"}
                </span>
              </div>
              {patient.birthdate ? (
                <p className="text-sm text-gray-600">
                  Nacimiento: {patient.birthdate.slice(0, 10)}
                </p>
              ) : null}
              {patient.preferredModality ? (
                <p className="text-sm text-gray-600">
                  Modalidad:{" "}
                  {patient.preferredModality === "online"
                    ? "En línea"
                    : "Presencial"}
                </p>
              ) : null}
              {patient.email ? (
                <p className="text-sm text-gray-600">{patient.email}</p>
              ) : null}
              <div className="mt-2 flex items-center gap-2">
                <select
                  className="rounded border px-2 py-1"
                  value={pending[patient.id] ?? ""}
                  onChange={(event) =>
                    setPending((current) => ({
                      ...current,
                      [patient.id]: event.target.value
                    }))
                  }
                >
                  <option value="">Sin asignar</option>
                  {therapists
                    .filter((therapist) => therapist.isActive)
                    .map((therapist) => (
                      <option key={therapist.id} value={therapist.id}>
                        {therapist.fullName}
                      </option>
                    ))}
                </select>
                <button
                  className="rounded border px-3 py-1"
                  onClick={() => handleAssign(patient)}
                >
                  Guardar asignación
                </button>
                <button
                  className="ml-auto rounded border px-3 py-1"
                  onClick={() => handleToggleStatus(patient)}
                >
                  {patient.status === "activo" ? "Desactivar" : "Activar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
