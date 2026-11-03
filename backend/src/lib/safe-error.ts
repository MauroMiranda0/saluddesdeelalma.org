export const safeErrorFields = (error: unknown) => ({
  errorType:
    error instanceof Error ? error.constructor.name : "UnknownError"
});
