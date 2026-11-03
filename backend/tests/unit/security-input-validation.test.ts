import assert from "node:assert/strict";
import test from "node:test";

import { createAdminAppointmentSchema, rescheduleAppointmentSchema } from "../../src/lib/validators/appointment.js";
import { loginCredentialsSchema } from "../../src/lib/validators/auth.js";
import { createPaymentSchema, sessionRateSchema, associatePaymentProofSchema } from "../../src/lib/validators/payment.js";
import { createPatientSchema, updatePatientStatusSchema } from "../../src/lib/validators/patient.js";
import { assignPatientTherapistSchema, createTherapistProfileSchema, updateTherapistProfileSchema } from "../../src/lib/validators/therapist.js";

test("admin login payload cannot carry an extra role or access flag", () => {
  assert.equal(
    loginCredentialsSchema.safeParse({
      email: "admin@example.test",
      password: "local-password",
      role: "admin",
      panelLoginEnabled: true
    }).success,
    false
  );
});

test("patient, therapist, appointment, and payment payloads reject authorization fields", () => {
  const validPatient = {
    fullName: "Local Test",
    whatsappPhone: "5215550000000",
    birthdate: "1990-01-01"
  };
  assert.equal(
    createPatientSchema.safeParse({ ...validPatient, role: "admin" }).success,
    false
  );
  assert.equal(
    updatePatientStatusSchema.safeParse({
      isActive: false,
      authUserId: "00000000-0000-4000-8000-000000000001"
    }).success,
    false
  );
  assert.equal(
    createTherapistProfileSchema.safeParse({
      fullName: "Local Therapist",
      phone: "+5215550000000",
      role: "admin"
    }).success,
    false
  );
  assert.equal(
    updateTherapistProfileSchema.safeParse({
      isActive: true,
      panelLoginEnabled: true
    }).success,
    false
  );
  assert.equal(
    assignPatientTherapistSchema.safeParse({
      therapistId: null,
      role: "admin"
    }).success,
    false
  );
});

test("appointment and financial payloads reject protected state and public proof URLs", () => {
  const appointment = {
    patientId: "00000000-0000-4000-8000-000000000001",
    scheduledAt: "2026-11-03T18:00:00.000Z",
    modality: "online",
    therapyType: "individual"
  };
  assert.equal(
    createAdminAppointmentSchema.safeParse({
      ...appointment,
      status: "completada",
      createdVia: "system"
    }).success,
    false
  );
  assert.equal(
    rescheduleAppointmentSchema.safeParse({
      scheduledAt: "2026-11-03T18:00:00.000Z",
      status: "cancelada"
    }).success,
    false
  );

  const payment = {
    appointmentId: "00000000-0000-4000-8000-000000000001",
    patientId: "00000000-0000-4000-8000-000000000002",
    paymentType: "anticipo",
    amount: 250,
    method: "transferencia"
  };
  for (const restricted of [
    { status: "validado" },
    { recordedByUserId: "00000000-0000-4000-8000-000000000003" },
    { paymentId: "00000000-0000-4000-8000-000000000004" }
  ]) {
    assert.equal(
      createPaymentSchema.safeParse({ ...payment, ...restricted }).success,
      false
    );
  }
  assert.equal(
    createPaymentSchema.safeParse({
      ...payment,
      proofReference: "https://public.example/proof"
    }).success,
    false
  );
  assert.equal(
    sessionRateSchema.safeParse({ amount: 500, role: "admin" }).success,
    false
  );
  assert.equal(
    associatePaymentProofSchema.safeParse({
      appointmentId: payment.appointmentId,
      paymentId: payment.patientId,
      status: "asociado"
    }).success,
    false
  );
});
