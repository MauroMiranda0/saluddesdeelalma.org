import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "@prisma/client";

test("patient and therapist domain users rely on the PostgreSQL UUID default", () => {
  const patientUser = {
    email: "patient@directory.local",
    fullName: "Paciente",
    role: "paciente"
  } satisfies Prisma.UserCreateInput;
  const therapistUser = {
    email: "therapist@directory.local",
    fullName: "Terapeuta",
    role: "psicologo",
    panelLoginEnabled: false
  } satisfies Prisma.UserCreateInput;

  assert.equal("id" in patientUser, false);
  assert.equal("id" in therapistUser, false);
  assert.equal("authUserId" in patientUser, false);
  assert.equal("authUserId" in therapistUser, false);
});
