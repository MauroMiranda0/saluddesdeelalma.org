"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminGuard } from "../../../lib/auth/use-admin-session";
import {
  assignPatientTherapist,
  listTherapistProfiles,
  listAdminPatients,
  type AdminPatient,
  type TherapistProfile
} from "../../../lib/admin/api";

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [therapists, setTherapists] = useState<TherapistProfile[]>([]);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  return (
    <AdminGuard>
      <main className="mx-auto max-w-3xl p-4">
        <h1 className="mb-4 text-2xl font-semibold">Pacientes y terapeutas</h1>
        {error ? <p className="mb-2 text-red-700">{error}</p> : null}
        {notice ? <p className="mb-2 text-green-700">{notice}</p> : null}

        <ul className="flex flex-col gap-2">
          {patients.map((patient) => (
            <li key={patient.id} className="rounded border p-3">
              <p className="font-medium">{patient.fullName}</p>
              <p className="text-sm text-gray-600">{patient.whatsappPhone}</p>
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
              </div>
            </li>
          ))}
        </ul>
      </main>
    </AdminGuard>
  );
}
