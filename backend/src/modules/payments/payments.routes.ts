import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";

import { createPaymentSchema } from "../../lib/validators/payment";
import { authenticate } from "../../middleware/authenticate";
import { authorizeAdminIdentity } from "../../middleware/authorize-admin-identity";
import { AppError, asyncHandler } from "../../middleware/error-handler";
import {
  confirmPaymentWithAudit,
  createPaymentWithAudit,
  PaymentNotFoundError,
  PaymentNotMutableError,
  PaymentValidationConflictError,
  paymentDto,
  sendPaymentReminderWithAudit
} from "./payments.service";

const uuidPathParam = z.uuid();

const requestParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const assertUuidParam = (value: string | undefined) => {
  if (!uuidPathParam.safeParse(value).success) {
    throw new AppError(400, "validation_error", "Invalid identifier");
  }
};

const paymentError = (error: unknown) => {
  if (error instanceof PaymentNotFoundError) {
    return new AppError(404, "not_found", "El pago o la cita no existen");
  }
  if (error instanceof PaymentNotMutableError) {
    return new AppError(409, "conflict", "El pago no puede modificarse");
  }
  if (error instanceof PaymentValidationConflictError) {
    return new AppError(409, "conflict", "La cita ya tiene un pago completo validado");
  }
  return error;
};

type PaymentRouteDependencies = {
  authenticate: RequestHandler;
  authorizeAdmin: RequestHandler;
  createPaymentWithAudit: typeof createPaymentWithAudit;
  confirmPaymentWithAudit: typeof confirmPaymentWithAudit;
  sendPaymentReminderWithAudit: typeof sendPaymentReminderWithAudit;
};

export const createPaymentRoutes = (
  dependencies: Partial<PaymentRouteDependencies> = {}
) => {
  const router = Router();
  const authenticateRequest = dependencies.authenticate ?? authenticate;
  const authorizeRequest = dependencies.authorizeAdmin ?? authorizeAdminIdentity;
  const createPayment = dependencies.createPaymentWithAudit ?? createPaymentWithAudit;
  const confirmPayment = dependencies.confirmPaymentWithAudit ?? confirmPaymentWithAudit;
  const sendReminder =
    dependencies.sendPaymentReminderWithAudit ?? sendPaymentReminderWithAudit;
  const audit = (request: Parameters<RequestHandler>[0], requestId: string) => ({
    actorUserId: request.adminSession?.user.id,
    actorChannel: "admin_panel" as const,
    action: "payment_action",
    entityType: "payment",
    result: "success" as const,
    metadata: { requestId },
    ipAddress: request.ip,
    userAgent: request.header("user-agent")
  });

  router.post(
    "/payments",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      const parsed = createPaymentSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(400, "validation_error", "Payment payload is invalid");
      }
      try {
        const payment = await createPayment({
          payment: parsed.data,
          audit: audit(request, response.locals.requestId)
        });
        response.status(201).json({ payment: paymentDto(payment) });
      } catch (error) {
        throw paymentError(error);
      }
    })
  );

  router.post(
    "/payments/:paymentId/confirm",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      const paymentId = requestParam(request.params.paymentId)!;
      assertUuidParam(paymentId);
      try {
        const payment = await confirmPayment({
          paymentId,
          audit: audit(request, response.locals.requestId)
        });
        response.json({ payment: paymentDto(payment) });
      } catch (error) {
        throw paymentError(error);
      }
    })
  );

  router.post(
    "/appointments/:appointmentId/payment-reminder",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      const appointmentId = requestParam(request.params.appointmentId)!;
      assertUuidParam(appointmentId);
      try {
        await sendReminder({
          appointmentId,
          audit: audit(request, response.locals.requestId)
        });
        response.status(204).send();
      } catch (error) {
        throw paymentError(error);
      }
    })
  );

  return router;
};

export const paymentRoutes = createPaymentRoutes();
