"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ApiError } from "../../lib/api/client";
import { loginAdminSession } from "../../lib/auth/session";
import { BrandLogo } from "../ui/brand-logo";

export const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await loginAdminSession({ email: trimmed, password });
      const next = searchParams.get("next");
      if (next?.startsWith("/") && !next.startsWith("//")) {
        router.replace(next);
      } else {
        router.replace("/admin/agenda");
      }
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo iniciar sesión."
      );
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-md rounded-[20px] bg-white p-8 shadow-[0_12px_30px_rgba(52,41,31,0.1)] md:p-12"
    >
      <div className="mb-5 text-center">
        <BrandLogo className="mx-auto mb-6 h-24 w-24 shadow-sm" priority />
        <h1 className="text-3xl font-semibold text-[#7e5d41]">
          Panel del consultorio
        </h1>
        <p className="mt-2 text-sm text-[--muted]">Panel administrativo</p>
      </div>

      <label className="mb-1 block text-xs font-semibold text-[--foreground]">
        Correo
      </label>
      <input
        autoComplete="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="admin-input mb-4 text-sm"
        placeholder="admin@saluddesdeelalma.org"
      />

      <label className="mb-1 block text-xs font-semibold text-[--foreground]">
        Contraseña
      </label>
      <div className="relative mb-4">
        <input
          autoComplete="current-password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="admin-input pr-12 text-sm"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShowPassword((visible) => !visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[--muted] hover:text-forest"
          aria-label={
            showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
          }
        >
          {showPassword ? "Ocultar" : "Ver"}
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-[#7e5d41] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#65482f] disabled:opacity-60"
      >
        {submitting ? "Entrando…" : "Iniciar sesión"}
      </button>
    </form>
  );
};
