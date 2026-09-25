"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  listAppointmentsRange,
  type AdminAppointmentEvent
} from "../../lib/admin/api";
import { startOfDay } from "../../lib/admin/calendar";
import {
  appointmentKindOf,
  EVENT_COLOR_MAP,
  eventStyles
} from "../../lib/admin/event-colors";

type DashboardAppointmentCardProps = {
  appointment: AdminAppointmentEvent;
  showDate?: boolean;
};

const DashboardAppointmentCard = ({
  appointment,
  showDate = false
}: DashboardAppointmentCardProps) => {
  const kind = appointmentKindOf(appointment);
  const styles = eventStyles(kind);
  const token = EVENT_COLOR_MAP[kind];
  const isOnline = appointment.modality === "online";

  return (
    <li
      className="flex items-center gap-3 rounded-[15px] border border-white/65 p-3 shadow-[0_4px_12px_rgba(52,41,31,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(52,41,31,0.1)]"
      style={styles.card}
    >
      <time className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white/50 text-center text-sm font-semibold">
        {new Date(appointment.scheduledAt).toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit"
        })}
      </time>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {appointment.patientName}
        </p>
        <p className="mt-0.5 truncate text-xs opacity-80">
          {appointment.therapistName ?? "Sin terapeuta"}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
          <span className="rounded-full bg-white/50 px-2 py-1">
            {isOnline ? "💻 En línea" : "🛋️ Presencial"}
          </span>
          {showDate && (
            <span className="rounded-full bg-white/50 px-2 py-1">
              {new Date(appointment.scheduledAt).toLocaleDateString("es-MX", {
                weekday: "short",
                day: "numeric",
                month: "short"
              })}
            </span>
          )}
        </div>
      </div>
      <span
        className="hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white sm:inline-flex"
        style={{ background: token.solid }}
      >
        {token.label}
      </span>
    </li>
  );
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
      href: "/admin/payments"
    },
    {
      label: "Por confirmar (hoy)",
      value: today.filter((appointment) => appointment.status === "programada")
        .length,
      href: "/admin/agenda"
    }
  ];

  return (
    <div className="admin-page space-y-8">
      <section className="relative overflow-hidden rounded-[20px] bg-[#cfc7ab]/55 px-6 py-8 shadow-[0_8px_24px_rgba(52,41,31,0.05)] md:px-8 md:py-10">
        <div
          className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#e8c59a]/70 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="admin-eyebrow">Panel administrativo</p>
            <h1 className="page-title mt-2">Bienvenida, Admin</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[--muted]">
              Consulta la actividad del consultorio y organiza tu jornada desde
              un solo lugar.
            </p>
          </div>
          <Link
            href="/admin/agenda"
            className="primary-action px-5 py-3 text-sm"
          >
            Ir a la agenda
          </Link>
        </div>
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="panel-card p-6 transition duration-300 hover:-translate-y-1 hover:bg-[#e8c59a]/30"
          >
            <p className="text-4xl font-semibold tracking-tight text-[#7e5d41]">
              {card.value}
            </p>
            <p className="mt-2 text-sm text-[--muted]">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#7e5d41]/15 px-6 py-5">
            <h2 className="admin-section-title">Citas de hoy</h2>
            <span className="rounded-full bg-[#e8c59a] px-3 py-1 text-xs font-semibold text-[#7e5d41]">
              {today.length} activas
            </span>
          </div>
          <div className="p-4">
            {today.length === 0 && (
              <p className="p-3 text-sm text-[--muted]">
                No hay citas programadas hoy.
              </p>
            )}
            <ul className="space-y-3">
              {today.map((appointment) => (
                <DashboardAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </ul>
          </div>
        </section>

        <section className="panel-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#7e5d41]/15 px-6 py-5">
            <h2 className="admin-section-title">Próximos 7 días</h2>
            <span className="rounded-full bg-[#cfc7ab]/65 px-3 py-1 text-xs font-semibold text-[#7e5d41]">
              {upcoming.length} citas
            </span>
          </div>
          <div className="p-4">
            {upcoming.length === 0 && (
              <p className="p-3 text-sm text-[--muted]">
                Sin citas en los próximos días.
              </p>
            )}
            <ul className="space-y-3">
              {upcoming.map((appointment) => (
                <DashboardAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  showDate
                />
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
