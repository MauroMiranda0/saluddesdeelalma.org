"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  listAppointmentsRange,
  type AdminAppointmentEvent
} from "../../lib/admin/api";
import {
  appointmentKindOf,
  EVENT_COLOR_MAP,
  eventStyles
} from "../../lib/admin/event-colors";

const startOfDay = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

export default function AdminDashboardPage() {
  const [today, setToday] = useState<AdminAppointmentEvent[]>([]);
  const [upcoming, setUpcoming] = useState<AdminAppointmentEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const todayStart = startOfDay(new Date());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const weekEnd = new Date(todayStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const [{ appointments: todayList }, { appointments: weekList }] =
        await Promise.all([
          listAppointmentsRange(
            todayStart.toISOString(),
            todayEnd.toISOString()
          ),
          listAppointmentsRange(todayStart.toISOString(), weekEnd.toISOString())
        ]);

      if (!active) {
        return;
      }

      setToday(
        todayList.filter((appointment) => appointment.status !== "cancelada")
      );
      setUpcoming(
        weekList
          .filter(
            (appointment) =>
              appointment.status === "programada" ||
              appointment.status === "confirmada"
          )
          .slice(0, 8)
      );
    })().catch(() => {
      if (active) {
        setError("No se pudo cargar el panel.");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const statCards = [
    { label: "Citas hoy", value: today.length, href: "/admin/agenda" },
    {
      label: "Próximos 7 días",
      value: upcoming.length,
      href: "/admin/agenda"
    },
    {
      label: "Pago pendiente (hoy)",
      value: today.filter(
        (appointment) => appointment.paymentStatus !== "completado"
      ).length,
      href: "/admin/agenda"
    },
    {
      label: "Por confirmar (hoy)",
      value: today.filter((appointment) => appointment.status === "programada")
        .length,
      href: "/admin/agenda"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-gray-800">
          Resumen del día
        </h1>
        <div className="flex gap-2">
          <Link
            href="/admin/agenda"
            className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Ir a la agenda
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-lg border border-gray-200 bg-white p-4 hover:border-emerald-300"
          >
            <p className="text-3xl font-bold text-gray-800">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-800">
          Citas de hoy
        </h2>
        {today.length === 0 && (
          <p className="text-sm text-gray-400">No hay citas programadas hoy.</p>
        )}
        <ul className="space-y-2">
          {today.map((appointment) => {
            const kind = appointmentKindOf(appointment);
            const styles = eventStyles(kind);
            const token = EVENT_COLOR_MAP[kind];

            return (
              <li
                key={appointment.id}
                className="flex items-center gap-3 rounded border px-3 py-2"
                style={styles.card}
              >
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ background: token.solid }}
                >
                  {token.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {new Date(appointment.scheduledAt).toLocaleTimeString(
                      "es-MX",
                      {
                        hour: "2-digit",
                        minute: "2-digit"
                      }
                    )}{" "}
                    · {appointment.patientName}
                  </p>
                  <p className="truncate text-xs opacity-80">
                    {appointment.therapistName ?? "Sin terapeuta"} ·{" "}
                    {appointment.modality === "online"
                      ? "En línea"
                      : "Presencial"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-800">
          Próximos 7 días
        </h2>
        {upcoming.length === 0 && (
          <p className="text-sm text-gray-400">
            Sin citas en los próximos días.
          </p>
        )}
        <ul className="space-y-2">
          {upcoming.map((appointment) => {
            const kind = appointmentKindOf(appointment);
            const styles = eventStyles(kind);

            return (
              <li
                key={appointment.id}
                className="flex items-center justify-between gap-2 rounded border px-3 py-2"
                style={styles.card}
              >
                <div>
                  <p className="text-sm font-medium">
                    {new Date(appointment.scheduledAt).toLocaleDateString(
                      "es-MX",
                      {
                        weekday: "short",
                        day: "numeric",
                        month: "short"
                      }
                    )}{" "}
                    · {appointment.patientName}
                  </p>
                  <p className="text-xs opacity-80">
                    {appointment.therapistName ?? "Sin terapeuta"}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {new Date(appointment.scheduledAt).toLocaleTimeString(
                    "es-MX",
                    {
                      hour: "2-digit",
                      minute: "2-digit"
                    }
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
