import { prisma } from "../../lib/prisma";
import { verifyPassword } from "./password.service";

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

export const identifyAdminForLogin = async (
  username: string,
  password: string
): Promise<AdminLoginResult> => {
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !user.passwordHash) {
    return { status: "invalid_credentials" };
  }

  if (
    user.username !== "admin" ||
    user.role !== "admin" ||
    !user.panelLoginEnabled ||
    !user.isActive
  ) {
    return {
      status: "forbidden_identity",
      userId: user.id
    };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    return { status: "invalid_credentials" };
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
