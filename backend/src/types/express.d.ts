import type { AdminRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      adminSession?: {
        id: string;
        jwtId: string;
        expiresAt: Date;
        user: {
          id: string;
          email: string;
          fullName: string;
          role: AdminRole;
        };
      };
    }
  }
}

export {};
