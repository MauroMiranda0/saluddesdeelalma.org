import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";

import {
  associatePaymentProofSchema,
  createPaymentSchema,
  sessionRateSchema
} from "../../lib/validators/payment";
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
  sendPaymentReminderWithAudit,
  SessionRateNotConfiguredError,
  listSessionRates,
  sessionRateDto,
  upsertSessionRateWithAudit
} from "./payments.service";
import {
  associatePaymentProofWithAudit,
  listPaymentProofs,
  PaymentProofAssociationError,
  PaymentProofNotFoundError,
  PaymentProofNotMutableError,
  paymentProofDto
} from "./payment-proofs.service";

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
    return new AppError(
      409,
      "conflict",
      "La cita ya tiene un pago validado de este tipo"
    );
  }
  if (error instanceof SessionRateNotConfiguredError) {
    return new AppError(
      409,
      "conflict",
      "Configure la tarifa de este tipo de sesión"
    );
  }
  if (error instanceof PaymentProofNotFoundError) {
    return new AppError(404, "not_found", "El comprobante no existe");
  }
  if (
    error instanceof PaymentProofNotMutableError ||
    error instanceof PaymentProofAssociationError
  ) {
    return new AppError(409, "conflict", "El comprobante no puede asociarse");
  }
  return error;
};

type PaymentRouteDependencies = {
  authenticate: RequestHandler;
  authorizeAdmin: RequestHandler;
  createPaymentWithAudit: typeof createPaymentWithAudit;
  confirmPaymentWithAudit: typeof confirmPaymentWithAudit;
  sendPaymentReminderWithAudit: typeof sendPaymentReminderWithAudit;
  listSessionRates: typeof listSessionRates;
  upsertSessionRateWithAudit: typeof upsertSessionRateWithAudit;
  listPaymentProofs: typeof listPaymentProofs;
  associatePaymentProofWithAudit: typeof associatePaymentProofWithAudit;
};

export const createPaymentRoutes = (
  dependencies: Partial<PaymentRouteDependencies> = {}
) => {
  const router = Router();
  const authenticateRequest = dependencies.authenticate ?? authenticate;
  const authorizeRequest =
    dependencies.authorizeAdmin ?? authorizeAdminIdentity;
  const createPayment =
    dependencies.createPaymentWithAudit ?? createPaymentWithAudit;
  const confirmPayment =
    dependencies.confirmPaymentWithAudit ?? confirmPaymentWithAudit;
  const sendReminder =
    dependencies.sendPaymentReminderWithAudit ?? sendPaymentReminderWithAudit;
  const getSessionRates = dependencies.listSessionRates ?? listSessionRates;
  const upsertSessionRate =
    dependencies.upsertSessionRateWithAudit ?? upsertSessionRateWithAudit;
  const getPaymentProofs = dependencies.listPaymentProofs ?? listPaymentProofs;
  const associatePaymentProof =
    dependencies.associatePaymentProofWithAudit ??
    associatePaymentProofWithAudit;
  const audit = (
    request: Parameters<RequestHandler>[0],
    requestId: string
  ) => ({
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
        throw new AppError(
          400,
          "validation_error",
          "Payment payload is invalid"
        );
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

  router.get(
    "/session-rates",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (_request, response) => {
      const sessionRates = await getSessionRates();
      response.json({ sessionRates: sessionRates.map(sessionRateDto) });
    })
  );

  router.put(
    "/session-rates/:therapyType",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      const therapyType = requestParam(request.params.therapyType);
      if (
        !z.enum(["individual", "pareja", "familiar"]).safeParse(therapyType)
          .success
      ) {
        throw new AppError(400, "validation_error", "Invalid therapy type");
      }
      const parsed = sessionRateSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(
          400,
          "validation_error",
          "Session rate payload is invalid"
        );
      }
      const rate = await upsertSessionRate({
        therapyType: therapyType as "individual" | "pareja" | "familiar",
        amount: parsed.data.amount,
        audit: audit(request, response.locals.requestId)
      });
      response.json({ sessionRate: sessionRateDto(rate) });
    })
  );

  router.get(
    "/payment-proofs",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (_request, response) => {
      const paymentProofs = await getPaymentProofs();
      response.json({ paymentProofs: paymentProofs.map(paymentProofDto) });
    })
  );

  router.post(
    "/payment-proofs/:proofId/associate",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      const proofId = requestParam(request.params.proofId)!;
      assertUuidParam(proofId);
      const parsed = associatePaymentProofSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(
          400,
          "validation_error",
          "Payment proof payload is invalid"
        );
      }
      try {
        const proof = await associatePaymentProof({
          proofId,
          ...parsed.data,
          audit: audit(request, response.locals.requestId)
        });
        response.json({ paymentProof: paymentProofDto(proof) });
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
