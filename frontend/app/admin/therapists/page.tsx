"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createTherapistProfile,
  listTherapistProfiles,
  updateTherapistProfile,
  type TherapistProfile
} from "../../../lib/admin/api";

export default function AdminTherapistsPage() {
  const [therapists, setTherapists] = useState<TherapistProfile[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { therapists: profiles } = await listTherapistProfiles();
    setTherapists(profiles);
  }, []);

  useEffect(() => {
    refresh().catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "No se pudo cargar")
    );
  }, [refresh]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await createTherapistProfile({ fullName, email: email || undefined });
      setFullName("");
      setEmail("");
      setNotice("Perfil clínico creado y auditado.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo crear");
    }
  };

  const handleToggle = async (therapist: TherapistProfile) => {
    setError(null);
    setNotice(null);
    try {
      await updateTherapistProfile(therapist.id, {
        isActive: !therapist.isActive
      });
      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No se pudo actualizar"
      );
    }
  };

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">Perfiles clínicos</h1>
      {error ? <p className="mb-2 text-red-700">{error}</p> : null}
      {notice ? <p className="mb-2 text-green-700">{notice}</p> : null}

      <form
        className="mb-6 flex flex-col gap-2 rounded border p-3"
        onSubmit={handleCreate}
      >
        <h2 className="font-medium">Crear perfil clínico</h2>
        <label className="flex flex-col gap-1">
          Nombre completo
          <input
            className="rounded border px-2 py-1"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            minLength={2}
            maxLength={120}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          Correo (opcional)
          <input
            className="rounded border px-2 py-1"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button
          type="submit"
          className="self-start rounded bg-emerald-600 px-3 py-1 text-white"
        >
          Crear perfil
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {therapists.map((therapist) => (
          <li
            key={therapist.id}
            className="flex items-center justify-between rounded border p-3"
          >
            <div>
              <p className="font-medium">{therapist.fullName}</p>
              <p className="text-sm text-gray-600">{therapist.email}</p>
              <p className="text-sm text-gray-600">
                {therapist.isActive ? "Activo" : "Inactivo"}
              </p>
            </div>
            <button
              className="rounded border px-3 py-1"
              onClick={() => handleToggle(therapist)}
            >
              {therapist.isActive ? "Desactivar" : "Activar"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
