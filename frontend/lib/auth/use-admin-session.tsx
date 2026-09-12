"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError } from "../api/client";
import { getCurrentAdminSession, type AdminSession } from "./session";

export type AdminSessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; session: AdminSession };

export const useAdminSession = (): AdminSessionState => {
  const [state, setState] = useState<AdminSessionState>({
    status: "loading"
  });

  useEffect(() => {
    let active = true;

    getCurrentAdminSession()
      .then((session) => {
        if (active) {
          setState({ status: "authenticated", session });
        }
      })
      .catch(() => {
        if (active) {
          setState({ status: "anonymous" });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
};

export const isSessionExpired = (error: unknown) =>
  error instanceof ApiError && error.status === 401;

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const state = useAdminSession();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "anonymous") {
      router.replace("/admin/login");
    }
  }, [router, state.status]);

  if (state.status === "loading") {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <p className="flex items-center justify-center gap-2 rounded border border-gray-200 bg-white p-4 text-sm text-gray-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600" />
          Comprobando sesión…
        </p>
      </main>
    );
  }

  if (state.status === "anonymous") {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <p className="rounded bg-yellow-50 p-4 text-sm text-yellow-900">
          Tu sesión expiró o no has iniciado sesión. Redirigiendo…
        </p>
      </main>
    );
  }

  return <>{children}</>;
};
