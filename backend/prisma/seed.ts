import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

import { PrismaClient } from "@prisma/client";

const scrypt = promisify(scryptCallback);
const prisma = new PrismaClient();

const createPasswordHash = async (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);

  return `scrypt$${salt}$${Buffer.from(hash).toString("hex")}`;
};

const main = async () => {
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!password || password.length < 16) {
    throw new Error("ADMIN_SEED_PASSWORD must contain at least 16 characters");
  }

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      email: "admin@saluddesdeelalma.org",
      fullName: "Jocelyn Gutiérrez",
      passwordHash: await createPasswordHash(password),
      role: "admin",
      panelLoginEnabled: true,
      isActive: true
    },
    create: {
      username: "admin",
      email: "admin@saluddesdeelalma.org",
      fullName: "Jocelyn Gutiérrez",
      passwordHash: await createPasswordHash(password),
      role: "admin",
      panelLoginEnabled: true,
      isActive: true
    }
  });
};

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    throw error;
  });
