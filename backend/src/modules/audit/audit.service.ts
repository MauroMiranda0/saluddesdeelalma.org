import { logger } from "../../lib/logger";
import { createAuditLog, type AuditCreateInput } from "./audit.repository";

export const audit = async (input: AuditCreateInput) => {
  try {
    await createAuditLog(input);
  } catch (error) {
    logger.error(
      { error, action: input.action },
      "Failed to persist audit log"
    );
  }
};
