import type { User } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  getSupabaseAuthClient,
  type SupabaseAuthClient
} from "./supabase-auth.service";

type LoginUser = Pick<
  User,
  | "id"
  | "authUserId"
  | "username"
  | "email"
  | "fullName"
  | "role"
  | "isActive"
  | "panelLoginEnabled"
>;

export type AdminLoginDependencies = {
  authClient: SupabaseAuthClient;
  findPublicUserByAuthId: (authUserId: string) => Promise<LoginUser | null>;
};

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
  password: string,
  dependencies: Partial<AdminLoginDependencies> = {}
): Promise<AdminLoginResult> => {
  const authClient = dependencies.authClient ?? getSupabaseAuthClient();
  const authResult = await authClient.signInWithPassword({
    email,
    password
  });

  if (authResult.error || !authResult.user?.id) {
    return GENERIC_AUTH_FAILURE;
  }

  const user = await (
    dependencies.findPublicUserByAuthId ??
    ((authUserId) => prisma.user.findUnique({ where: { authUserId } }))
  )(authResult.user.id);

  if (
    !user ||
    !user.isActive ||
    !user.panelLoginEnabled ||
    user.role !== "admin"
  ) {
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
