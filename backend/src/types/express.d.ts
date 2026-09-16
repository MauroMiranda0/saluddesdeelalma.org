import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      adminSession?: {
        id: string;
        jwtId: string;
        expiresAt: Date;
        user: {
          id: string;
          username: string;
          email: string;
          fullName: string;
          role: UserRole;
        };
      };
    }
  }
}

export {};
