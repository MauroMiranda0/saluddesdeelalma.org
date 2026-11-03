import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const main = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("db:seed is disabled in production");
  }

  console.warn(
    "[deprecated] db:seed no longer creates admin credentials. Create the admin identity in Supabase Auth and assign role/admin access via controlled action."
  );
  return;
};

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    throw error;
  });
