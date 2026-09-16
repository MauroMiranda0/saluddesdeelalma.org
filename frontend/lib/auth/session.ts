import { apiRequest } from "../api/client";

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: "admin";
};

export type AdminSession = {
  user: AdminUser;
  expiresAt: string;
};

export const loginAdminSession = (input: {
  username: string;
  password: string;
}) => {
  return apiRequest<AdminSession>("/auth/login", {
    method: "POST",
    body: input
  });
};

export const getCurrentAdminSession = () => {
  return apiRequest<AdminSession>("/auth/me", { method: "GET" });
};

export const logoutAdminSession = () => {
  return apiRequest<void>("/auth/logout", { method: "POST" });
};
