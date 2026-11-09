export const safeErrorFields = (error: unknown) => ({
  errorType: error instanceof Error ? error.constructor.name : "UnknownError"
});

export const safeDatabaseErrorFields = (error: unknown) => {
  if (!(error instanceof Error)) {
    return { errorType: "UnknownError" };
  }

  const allowedTypes = new Set([
    "Error",
    "PrismaClientInitializationError",
    "PrismaClientKnownRequestError",
    "PrismaClientUnknownRequestError",
    "PrismaClientRustPanicError",
    "PrismaClientValidationError"
  ]);
  const name = error.constructor.name;
  const fields = { errorType: allowedTypes.has(name) ? name : "UnknownError" };
  const prismaError = error as Error & { code?: unknown; errorCode?: unknown };
  const code = [prismaError.code, prismaError.errorCode].find(
    (value): value is string =>
      typeof value === "string" && /^P[0-9]{4}$/.test(value)
  );
  return code ? { ...fields, errorCode: code } : fields;
};

export const classifyDatabaseError = (error: unknown) => {
  if (!(error instanceof Error)) return "unknown";
  const message = error.message;
  if (/GLIBC|incompatible version of the `glibc`/i.test(message))
    return "glibc";
  if (/libssl|libcrypto|openssl/i.test(message)) return "openssl";
  if (/Prisma Client could not locate the Query Engine/i.test(message))
    return "engine_missing";
  if (
    /Unable to require|Unable to load.*(?:query.engine|shared library)/i.test(
      message
    )
  )
    return "engine_load";
  if (/authentication failed|password authentication failed/i.test(message))
    return "authentication";
  if (
    /can.t reach database server|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH/i.test(
      message
    )
  )
    return "unreachable";
  if (/timeout|timed out|ETIMEDOUT/i.test(message)) return "timeout";
  if (/certificate|TLS|SSL error/i.test(message)) return "tls";
  if (/tenant or user not found/i.test(message)) return "pooler_identity";
  return "unknown";
};
