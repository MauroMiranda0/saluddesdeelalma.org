export const safeErrorFields = (error: unknown) => ({
  errorType: error instanceof Error ? error.constructor.name : "UnknownError"
});

export const safeDatabaseErrorFields = (error: unknown) => {
  const fields = safeErrorFields(error);
  if (!(error instanceof Error)) {
    return fields;
  }

  const prismaError = error as Error & { code?: unknown; errorCode?: unknown };
  const code = [prismaError.code, prismaError.errorCode].find(
    (value): value is string =>
      typeof value === "string" && /^P[0-9]{4}$/.test(value)
  );
  return code ? { ...fields, errorCode: code } : fields;
};
