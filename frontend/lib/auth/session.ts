import { apiRequest } from "../api/client";

export type AdminSession = {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: "admin";
  };
  expiresAt: string;
};

export const getCurrentAdminSession = () => {
  return apiRequest<AdminSession>("/auth/me", { method: "GET" });
};

export const logoutAdminSession = () => {
  return apiRequest<void>("/auth/logout", { method: "POST" });
};
