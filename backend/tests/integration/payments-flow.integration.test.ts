import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import test from "node:test";

import express, { type RequestHandler } from "express";

import { errorHandler } from "../../src/middleware/error-handler.js";
import { createAuthorizeAdminIdentity } from "../../src/middleware/authorize-admin-identity.js";
import { prisma } from "../../src/lib/prisma.js";
import { paymentStatusOf } from "../../src/modules/appointments/appointments.service.js";
import { recordIncomingPaymentProof } from "../../src/modules/payments/payment-proofs.service.js";
import { createPaymentRoutes } from "../../src/modules/payments/payments.routes.js";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "true";

test(
  "an authorized admin completes the payment flow with audit and manual proof association",
  { skip: !enabled },
  async (t) => {
    const created = {
      users: [] as string[],
      patients: [] as string[],
      appointments: [] as string[],
      payments: [] as string[],
      proofs: [] as string[],
      auditEntityIds: [] as string[]
    };
    const originalRate = await prisma.sessionRate.findUnique({
      where: { therapyType: "individual" }
    });

    t.after(async () => {
      await prisma.paymentProof.deleteMany({
        where: { id: { in: created.proofs } }
      });
      await prisma.appointmentReminder.deleteMany({
        where: { appointmentId: { in: created.appointments } }
      });
      await prisma.payment.deleteMany({
        where: { id: { in: created.payments } }
      });
      await prisma.appointment.deleteMany({
        where: { id: { in: created.appointments } }
      });
      await prisma.patient.deleteMany({
        where: { id: { in: created.patients } }
      });
      await prisma.therapistProfile.deleteMany({
        where: { userId: { in: created.users } }
      });
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { actorUserId: { in: created.users } },
            { entityId: { in: created.auditEntityIds } }
          ]
        }
      });
      if (originalRate) {
        await prisma.sessionRate.update({
          where: { id: originalRate.id },
          data: { amount: originalRate.amount }
        });
      } else {
        await prisma.sessionRate.deleteMany({
          where: { therapyType: "individual" }
        });
      }
      await prisma.user.deleteMany({ where: { id: { in: created.users } } });
      await prisma.$disconnect();
    });

    let admin = await prisma.user.findUnique({ where: { username: "admin" } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          username: "admin",
          email: `admin-payments-${randomUUID()}@integration.local`,
          fullName: "Administradora de pagos",
          role: "admin",
          panelLoginEnabled: true
        }
      });
      created.users.push(admin.id);
    }

    const nonAdmin = await prisma.user.create({
      data: {
        username: `psico-${randomUUID()}`,
        email: `psico-payments-${randomUUID()}@integration.local`,
        fullName: "Psicologa sin acceso",
        role: "psicologo",
        panelLoginEnabled: false
      }
    });
    created.users.push(nonAdmin.id);

    const therapist = await prisma.therapistProfile.create({
      data: {
        userId: nonAdmin.id,
        phone: `52155${randomInt(10000000, 99999999)}`
      }
    });
    const patientUser = await prisma.user.create({
      data: {
        email: `patient-payments-${randomUUID()}@integration.local`,
        fullName: "Paciente de pagos",
        role: "paciente",
        panelLoginEnabled: false
      }
    });
    created.users.push(patientUser.id);
    const patient = await prisma.patient.create({
      data: {
        userId: patientUser.id,
        fullName: "Paciente de pagos",
        whatsappPhone: `52155${randomInt(10000000, 99999999)}`,
        birthdate: new Date("1990-01-01T00:00:00.000Z"),
        status: "activo",
        assignedTherapistId: therapist.id
      }
    });
    created.patients.push(patient.id);
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        therapistId: therapist.id,
        scheduledAt: new Date("2027-10-05T15:00:00.000Z"),
        endsAt: new Date("2027-10-05T16:00:00.000Z"),
        durationMinutes: 60,
        therapyType: "individual",
        modality: "online",
        isManualException: false,
        createdVia: "panel",
        status: "programada"
      }
    });
    created.appointments.push(appointment.id);

    let sessionUser = {
      id: nonAdmin.id,
      username: nonAdmin.username ?? "psicologa",
      email: nonAdmin.email,
      fullName: nonAdmin.fullName,
      role: "psicologo" as const
    };
    const authenticate: RequestHandler = (request, response, next) => {
      request.adminSession = {
        id: randomUUID(),
        jwtId: randomUUID(),
        expiresAt: new Date("2027-12-31T00:00:00.000Z"),
        user: sessionUser
      };
      response.locals.requestId = "payments-flow-integration";
      next();
    };
    const app = express();
    app.use(express.json());
    app.use(
      createPaymentRoutes({
        authenticate,
        authorizeAdmin: createAuthorizeAdminIdentity()
      })
    );
    app.use(errorHandler);
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const request = fetch;

    try {
      const denied = await request(`${baseUrl}/session-rates`);
      assert.equal(denied.status, 403);

      sessionUser = {
        id: admin.id,
        username: "admin",
        email: admin.email,
        fullName: admin.fullName,
        role: "admin"
      };

      const rateResponse = await request(
        `${baseUrl}/session-rates/individual`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ amount: 1000 })
        }
      );
      assert.equal(rateResponse.status, 200);
      const rate = (await rateResponse.json()) as {
        sessionRate: { amount: number };
      };
      assert.equal(rate.sessionRate.amount, 1000);
      const persistedRate = await prisma.sessionRate.findUniqueOrThrow({
        where: { therapyType: "individual" }
      });
      created.auditEntityIds.push(persistedRate.id);

      const registered = await request(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          patientId: patient.id,
          paymentType: "anticipo",
          amount: 500,
          method: "transferencia",
          proofReference: "transferencia-anticipo"
        })
      });
      assert.equal(registered.status, 201);
      const registeredBody = (await registered.json()) as {
        payment: { id: string; status: string; amount: number };
      };
      assert.equal(registeredBody.payment.status, "pendiente_validacion");
      assert.equal(registeredBody.payment.amount, 500);
      created.payments.push(registeredBody.payment.id);
      created.auditEntityIds.push(registeredBody.payment.id);

      const confirmed = await request(
        `${baseUrl}/payments/${registeredBody.payment.id}/confirm`,
        { method: "POST" }
      );
      assert.equal(confirmed.status, 200);
      assert.equal(
        ((await confirmed.json()) as { payment: { status: string } }).payment
          .status,
        "validado"
      );

      const duplicateAdvance = await request(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          patientId: patient.id,
          paymentType: "anticipo",
          amount: 500,
          method: "transferencia"
        })
      });
      assert.equal(duplicateAdvance.status, 409);
      assert.equal(
        await prisma.payment.count({ where: { appointmentId: appointment.id } }),
        1
      );

      for (const amount of [499.99, 500.01]) {
        const rejectedFullPayment = await request(`${baseUrl}/payments`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            appointmentId: appointment.id,
            patientId: patient.id,
            paymentType: "completo",
            amount,
            method: "transferencia"
          })
        });
        assert.equal(rejectedFullPayment.status, 409);
      }
      assert.equal(
        await prisma.payment.count({
          where: { appointmentId: appointment.id }
        }),
        1
      );

      // Simulates a legacy or rate-changed pending payment to ensure it cannot
      // transition to validated and mark the appointment payment as completed.
      const mismatchedFullPayment = await prisma.payment.create({
        data: {
          appointmentId: appointment.id,
          patientId: patient.id,
          paymentType: "completo",
          amount: 499.99,
          method: "transferencia",
          status: "pendiente_validacion",
          recordedByUserId: admin.id,
          paidAt: new Date()
        }
      });
      created.payments.push(mismatchedFullPayment.id);
      created.auditEntityIds.push(mismatchedFullPayment.id);

      const rejectedConfirmation = await request(
        `${baseUrl}/payments/${mismatchedFullPayment.id}/confirm`,
        { method: "POST" }
      );
      assert.equal(rejectedConfirmation.status, 409);
      assert.equal(
        (
          await prisma.payment.findUniqueOrThrow({
            where: { id: mismatchedFullPayment.id }
          })
        ).status,
        "pendiente_validacion"
      );
      assert.equal(
        await prisma.auditLog.count({
          where: {
            entityId: mismatchedFullPayment.id,
            action: "payment_confirmed"
          }
        }),
        0
      );
      assert.equal(
        paymentStatusOf(
          await prisma.payment.findMany({
            where: { appointmentId: appointment.id },
            select: { paymentType: true, status: true }
          })
        ),
        "anticipo"
      );

      const registeredFullPayment = await request(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          patientId: patient.id,
          paymentType: "completo",
          amount: 500,
          method: "transferencia"
        })
      });
      assert.equal(registeredFullPayment.status, 201);
      const registeredFullPaymentBody =
        (await registeredFullPayment.json()) as {
          payment: { id: string; status: string };
        };
      assert.equal(
        registeredFullPaymentBody.payment.status,
        "pendiente_validacion"
      );
      created.payments.push(registeredFullPaymentBody.payment.id);
      created.auditEntityIds.push(registeredFullPaymentBody.payment.id);

      const confirmedFullPayment = await request(
        `${baseUrl}/payments/${registeredFullPaymentBody.payment.id}/confirm`,
        { method: "POST" }
      );
      assert.equal(confirmedFullPayment.status, 200);
      assert.equal(
        ((await confirmedFullPayment.json()) as { payment: { status: string } })
          .payment.status,
        "validado"
      );

      const originalFetch = globalThis.fetch;
      const reminders: Array<{ to: string; text: string }> = [];
      globalThis.fetch = async (...args) => {
        if (String(args[0]).startsWith("https://graph.facebook.com/")) {
          const body = JSON.parse(String(args[1]?.body)) as {
            to: string;
            text: { body: string };
          };
          reminders.push({ to: body.to, text: body.text.body });
          return new Response(
            JSON.stringify({ messages: [{ id: "wamid.payment" }] }),
            {
              status: 200,
              headers: { "content-type": "application/json" }
            }
          );
        }
        return originalFetch(...args);
      };
      try {
        const reminded = await request(
          `${baseUrl}/appointments/${appointment.id}/payment-reminder`,
          { method: "POST" }
        );
        assert.equal(reminded.status, 204);
      } finally {
        globalThis.fetch = originalFetch;
      }
      assert.equal(reminders.length, 1);
      assert.equal(reminders[0].to, patient.whatsappPhone);
      assert.match(reminders[0].text, /saldo de sesión continúa pendiente/);

      const proof = await recordIncomingPaymentProof({
        whatsappMessageId: `wamid.proof.${randomUUID()}`,
        mediaId: `media-${randomUUID()}`,
        mediaType: "image",
        receivedAt: new Date("2027-09-15T16:00:00.000Z"),
        audit: {
          actorChannel: "whatsapp",
          action: "payment_proof_received",
          entityType: "payment_proof",
          result: "success"
        }
      });
      assert.ok(proof);
      created.proofs.push(proof.id);
      created.auditEntityIds.push(proof.id, appointment.id);

      const associated = await request(
        `${baseUrl}/payment-proofs/${proof.id}/associate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          // The current panel associates a WhatsApp proof to the appointment,
          // not automatically to a payment.
          body: JSON.stringify({ appointmentId: appointment.id })
        }
      );
      assert.equal(associated.status, 200);
      const associatedBody = (await associated.json()) as {
        paymentProof: {
          status: string;
          appointmentId: string;
          paymentId: string | null;
        };
      };
      assert.equal(associatedBody.paymentProof.status, "asociado");
      assert.equal(associatedBody.paymentProof.appointmentId, appointment.id);
      assert.equal(associatedBody.paymentProof.paymentId, null);

      const audits = await prisma.auditLog.findMany({
        where: {
          OR: [
            { actorUserId: admin.id },
            { actorUserId: nonAdmin.id },
            { entityId: { in: created.auditEntityIds } }
          ]
        }
      });
      const actions = new Set(audits.map((audit) => audit.action));
      for (const action of [
        "auth_forbidden_identity",
        "session_rate_updated",
        "payment_registered",
        "payment_confirmed",
        "payment_reminder_requested",
        "payment_proof_received",
        "payment_proof_associated"
      ]) {
        assert.equal(
          actions.has(action),
          true,
          `Missing audit action: ${action}`
        );
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  }
);
