import { env } from "../../config/env";

export interface SupabaseAuthCredentials {
  email: string;
  password: string;
}

export interface SupabaseAuthUser {
  id: string;
  email?: string;
}

export interface SupabaseAuthResult {
  user: SupabaseAuthUser | null;
  error: Error | null;
}

export interface SupabaseAuthClient {
  signInWithPassword(credentials: SupabaseAuthCredentials): Promise<SupabaseAuthResult>;
}

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  return new Error("supabase_auth_error");
};

const createDefaultSupabaseAuthClient = (): SupabaseAuthClient => {
  return {
    signInWithPassword: async (credentials: SupabaseAuthCredentials): Promise<SupabaseAuthResult> => {
      const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "apikey": env.SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        })
      });

      if (!response.ok) {
        let errorMessage = "invalid_credentials";
        try {
          const body = (await response.json()) as { error_description?: string; msg?: string; message?: string };
          errorMessage = body.error_description ?? body.msg ?? body.message ?? errorMessage;
        } catch {
          // Ignore parse errors
        }
        return { user: null, error: new Error(errorMessage) };
      }

      try {
        const body = (await response.json()) as { user?: { id?: string; email?: string } };
        if (!body.user?.id) {
          return { user: null, error: new Error("invalid_credentials") };
        }

        return {
          user: {
            id: body.user.id,
            email: body.user.email
          },
          error: null
        };
      } catch (error) {
        return { user: null, error: normalizeError(error) };
      }
    }
  };
};

let authClient: SupabaseAuthClient = createDefaultSupabaseAuthClient();

export const setSupabaseAuthClient = (client: SupabaseAuthClient) => {
  authClient = client;
};

export const getSupabaseAuthClient = (): SupabaseAuthClient => authClient;
