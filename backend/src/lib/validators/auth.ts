import { z } from "zod";

export const loginCredentialsSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200)
}).strict();

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;
