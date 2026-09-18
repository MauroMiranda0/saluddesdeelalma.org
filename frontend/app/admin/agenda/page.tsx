"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  completeAppointment,
  fetchDirectory,
  listAppointmentsRange,
  type AdminAppointmentEvent,
  type Directory
} from "../../../lib/admin/api";
import { ApiError } from "../../../lib/api/client";
import type { AgendaEventKind } from "../../../lib/admin/event-colors";
import { appointmentKindOf } from "../../../lib/admin/event-colors";
import {
  buildMonthGrid,
  buildWeekDays,
  eventsForWindow,
  formatMonthLabel,
  startOfWeek
} from "../../../lib/admin/calendar";
import type { CalendarEvent } from "../../../lib/admin/calendar";
import {
  AgendaCalendar,
  type AgendaView
} from "../../../components/admin/agenda/agenda-calendar";
import { AgendaFilters } from "../../../components/admin/agenda/agenda-filters";
import { AppointmentForm } from "../../../components/admin/agenda/appointment-form";
import { AppointmentActions } from "../../../components/admin/agenda/appointment-actions";
import { CancelDialog } from "../../../components/admin/agenda/cancel-dialog";
import { ConfirmDialog } from "../../../components/admin/agenda/confirm-dialog";
import { RescheduleDialog } from "../../../components/admin/agenda/reschedule-dialog";

const monthsAhead = (date: Date, offset: number) => {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
};

const windowBounds = (view: AgendaView, visibleDate: Date) => {
  if (view === "mes") {
    const days = buildMonthGrid(visibleDate);
    return { days, start: days[0], end: days[days.length - 1] };
  }
  if (view === "semana") {
    const days = buildWeekDays(startOfWeek(visibleDate));
    return { days, start: days[0], end: days[days.length - 1] };
  }
  return { days: [visibleDate], start: visibleDate, end: visibleDate };
};

export default function AdminAgendaPage() {
  const [view, setView] = useState<AgendaView>("semana");
  const [visibleDate, setVisibleDate] = useState<Date>(() => new Date());
  const [appointments, setAppointments] = useState<AdminAppointmentEvent[]>([]);
  const [directory, setDirectory] = useState<Directory>({
    patients: [],
    therapists: []
  });
  const [active, setActive] = useState<Set<AgendaEventKind>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [cancelling, setCancelling] = useState<AdminAppointmentEvent | null>(
    null
  );
  const [rescheduling, setRescheduling] =
    useState<AdminAppointmentEvent | null>(null);
  const [confirming, setConfirming] = useState<AdminAppointmentEvent | null>(
    null
  );
  const [actingOn, setActingOn] = useState<CalendarEvent | null>(null);

  const load = useCallback(
    async (requestedView: AgendaView, requestedDate: Date) => {
      const { days, end } = windowBounds(requestedView, requestedDate);
      const from = new Date(days[0]);
      from.setDate(from.getDate() - 1);

      setLoading(true);
      setError(null);

      try {
        const [{ appointments: list }, directoryData] = await Promise.all([
          listAppointmentsRange(from.toISOString(), end.toISOString()),
          fetchDirectory()
        ]);
        setAppointments(list);
        setDirectory(directoryData);
      } catch {
        setError("No se pudo cargar la agenda.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(view, visibleDate);
  }, [load, view, visibleDate]);

  const events = useMemo<CalendarEvent[]>(() => {
    const { days } = windowBounds(view, visibleDate);

    return eventsForWindow(appointments, days);
  }, [appointments, view, visibleDate]);

  const counts = useMemo(() => {
    const summary: Partial<Record<AgendaEventKind, number>> = {};
    const days = windowBounds(view, visibleDate).days;

    for (const event of eventsForWindow(appointments, days)) {
      const kind = appointmentKindOf(event.appointment);

      summary[kind] = (summary[kind] ?? 0) + 1;
    }

    return summary;
  }, [appointments, directory, view, visibleDate]);

  const navigate = (offset: number) => {
    if (view === "mes") {
      setVisibleDate(monthsAhead(visibleDate, offset));
    } else if (view === "semana") {
      const next = new Date(visibleDate);
      next.setDate(visibleDate.getDate() + offset * 7);
      setVisibleDate(next);
    } else {
      const next = new Date(visibleDate);
      next.setDate(visibleDate.getDate() + offset);
      setVisibleDate(next);
    }
  };

  const handleCancelled = () => {
    setCancelling(null);
    void load(view, visibleDate);
  };

  const handleRescheduled = () => {
    setRescheduling(null);
    void load(view, visibleDate);
  };

  const handleCreated = () => {
    setShowForm(false);
    void load(view, visibleDate);
  };

  const handleConfirmed = () => {
    setConfirming(null);
    void load(view, visibleDate);
  };

  const handleCompleted = async (event: CalendarEvent) => {
    if (event.kind !== "appointment" || !event.appointment) {
      return;
    }

    setError(null);

    try {
      await completeAppointment(event.appointment.id);
      void load(view, visibleDate);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo completar la cita."
      );
    }
  };

  const openDay = (day: Date) => {
    setVisibleDate(day);
    setView("dia");
  };

  return (
    <div className="admin-page space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[--muted]">
            Gestione sus citas y disponibilidad
          </p>
          <h1 className="page-title">Agenda</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="primary-action px-4 py-2 text-sm"
        >
          + Nueva cita
        </button>
      </div>

      <div className="panel-card flex flex-wrap items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-[--border] px-2 py-1 text-sm text-[--muted] hover:bg-[#f0e9dc]"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setVisibleDate(new Date())}
            className="rounded-md border border-[--border] bg-white px-2.5 py-1 text-sm text-[--muted] hover:bg-[#f0e9dc]"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="rounded-md border border-[--border] px-2 py-1 text-sm text-[--muted] hover:bg-[#f0e9dc]"
            aria-label="Siguiente"
          >
            ›
          </button>
          <span className="ml-2 min-w-28 text-sm font-semibold text-[--foreground]">
            {formatMonthLabel(visibleDate)}
          </span>
        </div>
        <div className="flex rounded-lg bg-[#f0e9dc] p-1">
          {(["dia", "semana", "mes"] as AgendaView[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`rounded px-3 py-1 text-sm font-medium ${
                view === option
                  ? "bg-[#fffdfa] text-forest shadow-sm"
                  : "text-[--muted] hover:text-forest"
              }`}
            >
              {option === "dia"
                ? "Día"
                : option === "semana"
                  ? "Semana"
                  : "Mes"}
            </button>
          ))}
        </div>
      </div>

      <AgendaFilters active={active} counts={counts} onChange={setActive} />

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="panel-card p-6 text-center text-sm text-[--muted]">
          Cargando agenda…
        </p>
      ) : (
        <AgendaCalendar
          view={view}
          visibleDate={visibleDate}
          events={events}
          active={active}
          onDaySelect={openDay}
          onEventSelect={setActingOn}
          onEventCancel={(event) => {
            if (event.kind === "appointment" && event.appointment) {
              setCancelling(event.appointment);
            }
          }}
          onEventReschedule={(event) => {
            if (event.kind === "appointment" && event.appointment) {
              setRescheduling(event.appointment);
            }
          }}
          onEventConfirm={(event) => {
            if (event.kind === "appointment" && event.appointment) {
              setConfirming(event.appointment);
            }
          }}
          onEventComplete={handleCompleted}
        />
      )}

      {showForm && (
        <AppointmentForm
          patients={directory.patients}
          onCreated={handleCreated}
          onClose={() => setShowForm(false)}
        />
      )}

      {actingOn && (
        <AppointmentActions
          event={actingOn}
          onClose={() => setActingOn(null)}
          onReschedule={(event) => {
            if (event.kind === "appointment" && event.appointment) {
              setRescheduling(event.appointment);
            }
          }}
          onConfirm={(event) => {
            if (event.kind === "appointment" && event.appointment) {
              setConfirming(event.appointment);
            }
          }}
          onComplete={handleCompleted}
          onCancel={(event) => {
            if (event.kind === "appointment" && event.appointment) {
              setCancelling(event.appointment);
            }
          }}
        />
      )}

      {cancelling && (
        <CancelDialog
          appointment={cancelling}
          onCancelled={handleCancelled}
          onClose={() => setCancelling(null)}
        />
      )}

      {confirming && (
        <ConfirmDialog
          appointment={confirming}
          onConfirmed={handleConfirmed}
          onClose={() => setConfirming(null)}
        />
      )}

      {rescheduling && (
        <RescheduleDialog
          appointment={rescheduling}
          onRescheduled={handleRescheduled}
          onClose={() => setRescheduling(null)}
        />
      )}
    </div>
  );
}
