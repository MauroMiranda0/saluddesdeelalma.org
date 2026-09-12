"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "../../lib/api/client";
import { loginAdminSession } from "../../lib/auth/session";

export const LoginForm = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError("Ingresa tu usuario y contraseña.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await loginAdminSession({
        username: username.trim(),
        password
      });
      router.replace("/admin/agenda");
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
      className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-5 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-700 text-lg font-bold text-white">
          SdA
        </span>
        <h1 className="text-lg font-semibold text-gray-800">
          Panel del consultorio
        </h1>
        <p className="text-sm text-gray-500">Salud desde el Alma</p>
      </div>

      <label className="mb-1 block text-xs font-medium text-gray-500">
        Usuario
      </label>
      <input
        autoComplete="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        className="mb-3 w-full rounded border border-gray-300 px-2 py-2 text-sm focus:border-emerald-600 focus:outline-none"
        placeholder="admin"
      />

      <label className="mb-1 block text-xs font-medium text-gray-500">
        Contraseña
      </label>
      <div className="relative mb-4">
        <input
          autoComplete="current-password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-2 pr-10 text-sm focus:border-emerald-600 focus:outline-none"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShowPassword((visible) => !visible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
          aria-label={
            showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
          }
        >
          {showPassword ? "Ocultar" : "Ver"}
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-emerald-700 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {submitting ? "Entrando…" : "Iniciar sesión"}
      </button>
    </form>
  );
};
