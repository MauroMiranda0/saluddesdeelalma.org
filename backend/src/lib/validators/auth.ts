import { z } from "zod";

export const loginCredentialsSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(200)
});

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;
