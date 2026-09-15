"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../../../lib/api/client";
import {
  confirmPayment,
  listAppointmentsRange,
  registerPayment,
  sendPaymentReminder,
  type AdminAppointmentEvent
} from "../../../lib/admin/api";

const rangeStart = () => {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  return start;
};

const rangeEnd = () => {
  const end = new Date();
  end.setFullYear(end.getFullYear() + 1);
  return end;
};

const errorMessage = (reason: unknown, fallback: string) =>
  reason instanceof ApiError ? reason.message : fallback;

export default function AdminPaymentsPage() {
  const [appointments, setAppointments] = useState<AdminAppointmentEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [registeringFor, setRegisteringFor] =
    useState<AdminAppointmentEvent | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<"anticipo" | "completo">(
    "completo"
  );
  const [method, setMethod] = useState<"transferencia" | "efectivo">(
    "transferencia"
  );
  const [proofReference, setProofReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { appointments: list } = await listAppointmentsRange(
      rangeStart().toISOString(),
      rangeEnd().toISOString()
    );
    setAppointments(
      list.filter(
        (appointment) =>
          appointment.status !== "cancelada" &&
          appointment.paymentStatus !== "completado"
      )
    );
  }, []);

  useEffect(() => {
    refresh().catch((reason: unknown) =>
      setError(errorMessage(reason, "No se pudo cargar"))
    );
  }, [refresh]);

  const openRegister = (appointment: AdminAppointmentEvent) => {
    setRegisteringFor(appointment);
    setPaymentType("completo");
    setMethod("transferencia");
    setAmount("");
    setProofReference("");
    setError(null);
  };

  const submitPayment = async () => {
    if (!registeringFor || !Number(amount) || Number(amount) <= 0) {
      setError("Capture un monto válido.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await registerPayment({
        appointmentId: registeringFor.id,
        patientId: registeringFor.patientId,
        paymentType,
        amount: Number(amount),
        method,
        proofReference: proofReference.trim() || undefined
      });
      setRegisteringFor(null);
      setNotice("Pago registrado. Confírmelo después de revisar el comprobante.");
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason, "No se pudo registrar el pago."));
    } finally {
      setSubmitting(false);
    }
  };

  const remind = async (appointment: AdminAppointmentEvent) => {
    setSubmitting(true);
    setError(null);
    try {
      await sendPaymentReminder(appointment.id);
      setNotice(`Recordatorio enviado a ${appointment.patientName}.`);
    } catch (reason) {
      setError(errorMessage(reason, "No se pudo enviar el recordatorio."));
    } finally {
      setSubmitting(false);
    }
  };

  const confirm = async (paymentId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await confirmPayment(paymentId);
      setNotice("Pago confirmado.");
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason, "No se pudo confirmar el pago."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-1 text-2xl font-semibold">Pagos</h1>
      <p className="mb-4 text-sm text-gray-600">
        Registre, recuerde y confirme pagos sin depender del chatbot.
      </p>
      {error ? <p className="mb-2 text-red-700">{error}</p> : null}
      {notice ? <p className="mb-2 text-emerald-800">{notice}</p> : null}

      {appointments.length === 0 ? (
        <p className="rounded border border-gray-200 p-4 text-sm text-gray-500">
          No hay pagos pendientes.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {appointments.map((appointment) => (
            <li key={appointment.id} className="rounded border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{appointment.patientName}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(appointment.scheduledAt).toLocaleString("es-MX")} ·{" "}
                    {appointment.therapistName ?? "Sin terapeuta"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    appointment.paymentStatus === "anticipo"
                      ? "bg-violet-100 text-violet-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {appointment.paymentStatus === "anticipo" ? "Anticipo" : "Pendiente"}
                </span>
              </div>

              {appointment.payments.length > 0 ? (
                <div className="mt-3 space-y-2 border-t pt-2 text-sm">
                  {appointment.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between gap-2">
                      <span>
                        {payment.paymentType === "anticipo" ? "Anticipo" : "Pago completo"} · ${" "}
                        {payment.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })} ·{" "}
                        {payment.status === "pendiente_validacion"
                          ? "Por confirmar"
                          : payment.status === "validado"
                            ? "Confirmado"
                            : "Rechazado"}
                      </span>
                      {payment.status === "pendiente_validacion" ? (
                        <button
                          type="button"
                          onClick={() => confirm(payment.id)}
                          disabled={submitting}
                          className="rounded bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          Confirmar pago
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openRegister(appointment)}
                  disabled={submitting}
                  className="rounded bg-forest px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Registrar pago
                </button>
                <button
                  type="button"
                  onClick={() => remind(appointment)}
                  disabled={submitting}
                  className="rounded border border-forest px-3 py-2 text-sm font-semibold text-forest disabled:opacity-60"
                >
                  Enviar recordatorio
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {registeringFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold">Registrar pago</h2>
            <p className="mb-4 text-sm text-gray-600">{registeringFor.patientName}</p>
            <label className="mb-3 block text-sm font-medium">
              Tipo de pago
              <select
                value={paymentType}
                onChange={(event) => setPaymentType(event.target.value as "anticipo" | "completo")}
                className="mt-1 w-full rounded border p-2"
              >
                <option value="anticipo">Anticipo</option>
                <option value="completo">Pago completo</option>
              </select>
            </label>
            <label className="mb-3 block text-sm font-medium">
              Monto
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                type="number"
                min="0.01"
                step="0.01"
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="mb-3 block text-sm font-medium">
              Método
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value as "transferencia" | "efectivo")}
                className="mt-1 w-full rounded border p-2"
              >
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </label>
            <label className="mb-4 block text-sm font-medium">
              Referencia del comprobante (opcional)
              <input
                value={proofReference}
                onChange={(event) => setProofReference(event.target.value)}
                maxLength={500}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <p className="mb-4 text-xs text-gray-500">
              El pago quedará pendiente de confirmación hasta que revise el comprobante.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRegisteringFor(null)}
                disabled={submitting}
                className="rounded border px-3 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitPayment}
                disabled={submitting}
                className="rounded bg-forest px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? "Registrando..." : "Registrar pago"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
