import { prisma } from "../../lib/prisma";
import { getSupabaseAuthClient } from "./supabase-auth.service";

export type AdminLoginResult =
  | { status: "invalid_credentials" }
  | { status: "forbidden_identity"; userId: string }
  | {
      status: "success";
      user: {
        id: string;
        username: string;
        email: string;
        fullName: string;
      };
    };

const GENERIC_AUTH_FAILURE = { status: "invalid_credentials" as const };

export const identifyAdminForLogin = async (
  email: string,
  password: string
): Promise<AdminLoginResult> => {
  const authClient = getSupabaseAuthClient();
  const authResult = await authClient.signInWithPassword({
    email,
    password
  });

  if (authResult.error || !authResult.user?.id) {
    return GENERIC_AUTH_FAILURE;
  }

  const user = await prisma.user.findUnique({
    where: { id: authResult.user.id }
  });

  if (!user || !user.isActive || !user.panelLoginEnabled || user.role !== "admin") {
    return GENERIC_AUTH_FAILURE;
  }

  return {
    status: "success",
    user: {
      id: user.id,
      username: user.username ?? "admin",
      email: user.email,
      fullName: user.fullName
    }
  };
};

export const adminUserDto = (user: {
  id: string;
  username: string | null;
  email: string;
  fullName: string;
  role: string;
}) => ({
  id: user.id,
  username: user.username ?? "",
  email: user.email,
  fullName: user.fullName,
  role: user.role
});
