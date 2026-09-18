import type { Metadata } from "next";

import { UserDirectory } from "../../../components/admin/directorio/user-directory";

export const metadata: Metadata = {
  title: "Directorio · Panel",
  description: "Directorio de psicólogas/os y pacientes del consultorio"
};

export default function AdminDirectorioPage() {
  return (
    <div className="admin-page space-y-5">
      <div>
        <p className="text-sm text-[--muted]">
          Psicólogas, psicólogos y pacientes
        </p>
        <h1 className="page-title">Directorio</h1>
      </div>
      <UserDirectory />
    </div>
  );
}
