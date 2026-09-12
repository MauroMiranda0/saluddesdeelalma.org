"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchDirectory,
  listAppointmentsRange,
  type AdminAppointmentEvent,
  type Directory
} from "../../../lib/admin/api";
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
import { CancelDialog } from "../../../components/admin/agenda/cancel-dialog";

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

    return eventsForWindow(appointments, directory, days);
  }, [appointments, directory, view, visibleDate]);

  const counts = useMemo(() => {
    const summary: Partial<Record<AgendaEventKind, number>> = {};
    const days = windowBounds(view, visibleDate).days;

    for (const event of eventsForWindow(appointments, directory, days)) {
      const kind =
        event.kind === "appointment" && event.appointment
          ? appointmentKindOf(event.appointment)
          : "cumpleanios";

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

  const handleCreated = () => {
    setShowForm(false);
    void load(view, visibleDate);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-800">Agenda</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Nueva cita
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setVisibleDate(new Date())}
            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
            aria-label="Siguiente"
          >
            ›
          </button>
          <span className="ml-2 min-w-28 text-sm font-semibold text-gray-700">
            {formatMonthLabel(visibleDate)}
          </span>
        </div>
        <div className="flex rounded-lg border border-gray-300 p-0.5">
          {(["dia", "semana", "mes"] as AgendaView[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`rounded px-3 py-1 text-sm font-medium ${
                view === option
                  ? "bg-emerald-700 text-white"
                  : "text-gray-600 hover:bg-emerald-50"
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
        <p className="rounded border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          Cargando agenda…
        </p>
      ) : (
        <AgendaCalendar
          view={view}
          visibleDate={visibleDate}
          events={events}
          active={active}
          onEventCancel={(event) => {
            if (event.kind === "appointment" && event.appointment) {
              setCancelling(event.appointment);
            }
          }}
        />
      )}

      {showForm && (
        <AppointmentForm
          patients={directory.patients}
          onCreated={handleCreated}
          onClose={() => setShowForm(false)}
        />
      )}

      {cancelling && (
        <CancelDialog
          appointment={cancelling}
          onCancelled={handleCancelled}
          onClose={() => setCancelling(null)}
        />
      )}
    </div>
  );
}
