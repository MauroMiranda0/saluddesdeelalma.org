import { z } from "zod";

export const loginCredentialsSchema = z
  .object({
    username: z.string().trim().min(1).max(50).optional(),
    email: z.string().trim().email().max(255).optional(),
    password: z.string().min(1).max(200)
  })
  .refine(
    (data) => Boolean((data.username && data.username.length > 0) || (data.email && data.email.length > 0)),
    {
      message: "Email or username is required"
    }
  );

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;
