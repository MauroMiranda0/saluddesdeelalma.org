"use client";

import { useEffect, useState } from "react";

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

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const state = useAdminSession();

  if (state.status === "loading") {
    return <p className="p-4 text-gray-500">Comprobando sesión…</p>;
  }

  if (state.status === "anonymous") {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <p className="rounded bg-yellow-50 p-4 text-yellow-900">
          Panel aún no disponible: el inicio de sesión de administración se
          habilita con US2.
        </p>
      </main>
    );
  }

  return <>{children}</>;
};
