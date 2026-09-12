import { createAuditLog, type AuditCreateInput } from "./audit.repository";

export const audit = async (
  input: AuditCreateInput,
  persist = createAuditLog
) => persist(input);
