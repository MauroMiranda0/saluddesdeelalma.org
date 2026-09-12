import type { Metadata } from "next";

import { LoginForm } from "../../../components/admin/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión · Panel",
  description: "Acceso al panel administrativo de Salud desde el Alma"
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[--background] p-4">
      <LoginForm />
    </main>
  );
}
