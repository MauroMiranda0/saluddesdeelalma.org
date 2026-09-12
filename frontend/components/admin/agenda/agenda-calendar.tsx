"use client";

import {
  appointmentKindOf,
  type AgendaEventKind
} from "../../../lib/admin/event-colors";
import {
  buildMonthGrid,
  buildWeekDays,
  dayKeyOf,
  formatFullDayLabel,
  formatMonthLabel,
  formatTime,
  startOfWeek
} from "../../../lib/admin/calendar";
import type { CalendarEvent } from "../../../lib/admin/calendar";
import { EventCard } from "./event-card";

export type AgendaView = "mes" | "semana" | "dia";

type AgendaCalendarProps = {
  view: AgendaView;
  visibleDate: Date;
  events: CalendarEvent[];
  active: Set<AgendaEventKind>;
  onEventSelect?: (event: CalendarEvent) => void;
  onEventCancel?: (event: CalendarEvent) => void;
};

const kindOfEvent = (event: CalendarEvent): AgendaEventKind => {
  return event.kind === "appointment" && event.appointment
    ? appointmentKindOf(event.appointment)
    : "cumpleanios";
};

export const AgendaCalendar = ({
  view,
  visibleDate,
  events,
  active,
  onEventSelect,
  onEventCancel
}: AgendaCalendarProps) => {
  const visible =
    active.size === 0
      ? events
      : events.filter((event) => active.has(kindOfEvent(event)));

  if (view === "mes") {
    return (
      <MonthView
        dates={buildMonthGrid(visibleDate)}
        events={visible}
        onEventSelect={onEventSelect}
        onEventCancel={onEventCancel}
      />
    );
  }
  if (view === "semana") {
    return (
      <WeekView
        weekStart={startOfWeek(visibleDate)}
        events={visible}
        onEventSelect={onEventSelect}
        onEventCancel={onEventCancel}
      />
    );
  }

  return (
    <DayView
      day={visibleDate}
      events={visible}
      onEventSelect={onEventSelect}
      onEventCancel={onEventCancel}
    />
  );
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const eventSort = (a: CalendarEvent, b: CalendarEvent) =>
  new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

const MonthView = ({
  dates,
  events,
  onEventSelect,
  onEventCancel
}: {
  dates: Date[];
  events: CalendarEvent[];
  onEventSelect?: (event: CalendarEvent) => void;
  onEventCancel?: (event: CalendarEvent) => void;
}) => {
  const byDay = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const key = dayKeyOf(new Date(event.startsAt));
    const bucket = byDay.get(key) ?? [];

    bucket.push(event);
    byDay.set(key, bucket);
  }

  const todayKey = dayKeyOf(new Date());

  return (
    <div className="overflow-hidden rounded border border-gray-200 bg-white">
      <div className="grid grid-cols-7 divide-x divide-gray-100 border-b border-gray-200 bg-gray-50 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
        {dates.map((day) => {
          const key = dayKeyOf(day);
          const dayEvents = (byDay.get(key) ?? []).sort(eventSort);
          const inMonth = day.getMonth() === dates[15]?.getMonth();

          return (
            <div
              key={key}
              className={`flex min-h-24 flex-col gap-1 p-1.5 ${
                inMonth ? "bg-white" : "bg-gray-50/60"
              }`}
            >
              <div className="flex justify-between px-0.5">
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    key === todayKey
                      ? "bg-emerald-600 text-white"
                      : inMonth
                        ? "text-gray-700"
                        : "text-gray-300"
                  }`}
                >
                  {day.getDate()}
                </span>
                {dayEvents.length > 4 && (
                  <span className="text-[10px] text-gray-400">
                    +{dayEvents.length - 4}
                  </span>
                )}
              </div>
              {dayEvents.slice(0, 4).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  variant="month"
                  onSelect={onEventSelect}
                  onCancel={onEventCancel}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const WeekView = ({
  weekStart,
  events,
  onEventSelect,
  onEventCancel
}: {
  weekStart: Date;
  events: CalendarEvent[];
  onEventSelect?: (event: CalendarEvent) => void;
  onEventCancel?: (event: CalendarEvent) => void;
}) => {
  const days = buildWeekDays(weekStart);
  const byDay = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    for (const day of days) {
      const key = dayKeyOf(day);
      const start = new Date(event.startsAt).getTime();
      const end = new Date(event.endsAt).getTime();
      const dayStart = new Date(day).setHours(0, 0, 0, 0);
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      if (start < dayEnd && end > dayStart) {
        const bucket = byDay.get(key) ?? [];
        bucket.push(event);
        byDay.set(key, bucket);
      }
    }
  }

  const todayKey = dayKeyOf(new Date());

  return (
    <div className="overflow-hidden rounded border border-gray-200 bg-white">
      <div className="grid grid-cols-7 divide-x divide-gray-100 border-b border-gray-200 bg-gray-50">
        {days.map((day) => {
          const isToday = dayKeyOf(day) === todayKey;

          return (
            <div key={day.toISOString()} className="px-2 py-2 text-center">
              <div
                className={`text-[11px] font-semibold uppercase ${
                  isToday ? "text-emerald-700" : "text-gray-500"
                }`}
              >
                {new Intl.DateTimeFormat("es-MX", { weekday: "short" }).format(
                  day
                )}
              </div>
              <div
                className={`text-sm font-bold ${
                  isToday ? "text-emerald-700" : "text-gray-700"
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {days.map((day) => {
          const key = dayKeyOf(day);
          const dayEvents = (byDay.get(key) ?? []).sort(eventSort);

          return (
            <div key={key} className="flex min-h-72 flex-col gap-1 p-1.5">
              {dayEvents.length === 0 && (
                <p className="pt-6 text-center text-[11px] text-gray-300">
                  Sin citas
                </p>
              )}
              {dayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  variant="week"
                  onSelect={onEventSelect}
                  onCancel={onEventCancel}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DayView = ({
  day,
  events,
  onEventSelect,
  onEventCancel
}: {
  day: Date;
  events: CalendarEvent[];
  onEventSelect?: (event: CalendarEvent) => void;
  onEventCancel?: (event: CalendarEvent) => void;
}) => {
  const byHour = new Map<number, CalendarEvent[]>();

  for (const event of events) {
    const hour = new Date(event.startsAt).getHours();
    const bucket = byHour.get(hour) ?? [];

    bucket.push(event);
    byHour.set(hour, bucket);
  }

  return (
    <div className="overflow-hidden rounded border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
        {formatFullDayLabel(day)}
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 13 }, (_, index) => 9 + index).map((hour) => {
          const hourEvents = (byHour.get(hour) ?? []).sort(eventSort);

          return (
            <div key={hour} className="flex min-h-14 items-stretch">
              <div className="w-16 shrink-0 border-r border-gray-100 py-2 pr-2 text-right text-[11px] font-medium text-gray-400">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="flex flex-1 flex-col gap-1 p-1.5">
                {hourEvents.length === 0 && (
                  <span className="pl-2 pt-2 text-[11px] text-gray-300">
                    Libre
                  </span>
                )}
                {hourEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    variant="day"
                    onSelect={onEventSelect}
                    onCancel={onEventCancel}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { formatMonthLabel, formatTime };
