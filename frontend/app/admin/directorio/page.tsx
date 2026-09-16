import type { Metadata } from "next";

import { UserDirectory } from "../../../components/admin/directorio/user-directory";

export const metadata: Metadata = {
  title: "Directorio · Panel",
  description: "Directorio de psicólogas/os y pacientes del consultorio"
};

export default function AdminDirectorioPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800">Directorio</h1>
      <UserDirectory />
    </div>
  );
}
