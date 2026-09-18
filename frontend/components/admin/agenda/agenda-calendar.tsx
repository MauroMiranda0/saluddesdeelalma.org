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
  onDaySelect?: (day: Date) => void;
  onEventSelect?: (event: CalendarEvent) => void;
  onEventCancel?: (event: CalendarEvent) => void;
  onEventReschedule?: (event: CalendarEvent) => void;
  onEventConfirm?: (event: CalendarEvent) => void;
  onEventComplete?: (event: CalendarEvent) => void;
};

const kindOfEvent = (event: CalendarEvent): AgendaEventKind => {
  return appointmentKindOf(event.appointment);
};

export const AgendaCalendar = ({
  view,
  visibleDate,
  events,
  active,
  onDaySelect,
  onEventSelect,
  onEventCancel,
  onEventReschedule,
  onEventConfirm,
  onEventComplete
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
        onDaySelect={onDaySelect}
        onEventSelect={onEventSelect}
        onEventCancel={onEventCancel}
        onEventReschedule={onEventReschedule}
        onEventConfirm={onEventConfirm}
        onEventComplete={onEventComplete}
      />
    );
  }
  if (view === "semana") {
    return (
      <WeekView
        weekStart={startOfWeek(visibleDate)}
        events={visible}
        onDaySelect={onDaySelect}
        onEventSelect={onEventSelect}
        onEventCancel={onEventCancel}
        onEventReschedule={onEventReschedule}
        onEventConfirm={onEventConfirm}
        onEventComplete={onEventComplete}
      />
    );
  }

  return (
    <DayView
      day={visibleDate}
      events={visible}
      onEventSelect={onEventSelect}
      onEventCancel={onEventCancel}
      onEventReschedule={onEventReschedule}
      onEventConfirm={onEventConfirm}
      onEventComplete={onEventComplete}
    />
  );
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const eventSort = (a: CalendarEvent, b: CalendarEvent) =>
  new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

const MonthView = ({
  dates,
  events,
  onDaySelect,
  onEventSelect,
  onEventCancel,
  onEventReschedule,
  onEventConfirm,
  onEventComplete
}: {
  dates: Date[];
  events: CalendarEvent[];
  onDaySelect?: (day: Date) => void;
  onEventSelect?: (event: CalendarEvent) => void;
  onEventCancel?: (event: CalendarEvent) => void;
  onEventReschedule?: (event: CalendarEvent) => void;
  onEventConfirm?: (event: CalendarEvent) => void;
  onEventComplete?: (event: CalendarEvent) => void;
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
    <div className="panel-card overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-[#eee5d9] border-b border-[--border] bg-[#f8f3eb] text-center text-[11px] font-semibold uppercase tracking-wide text-[--muted]">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-[#eee5d9]">
        {dates.map((day) => {
          const key = dayKeyOf(day);
          const dayEvents = (byDay.get(key) ?? []).sort(eventSort);
          const inMonth = day.getMonth() === dates[15]?.getMonth();

          return (
            <div
              key={key}
              className={`flex min-h-24 flex-col gap-1 p-1.5 ${
                inMonth ? "bg-[#fffdfa]" : "bg-[#f8f3eb]"
              }`}
            >
              <div className="flex justify-between px-0.5">
                <button
                  type="button"
                  onClick={() => onDaySelect?.(day)}
                  aria-label={`Ver ${new Intl.DateTimeFormat("es-MX", {
                    day: "numeric",
                    month: "long"
                  }).format(day)}`}
                  className={`rounded focus:outline-none focus:ring-2 focus:ring-forest/40 ${
                    onDaySelect ? "cursor-pointer hover:bg-forest/5" : ""
                  }`}
                >
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                      key === todayKey
                        ? "bg-forest text-white"
                        : inMonth
                          ? "text-gray-700"
                          : "text-gray-300"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </button>
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
                  onReschedule={onEventReschedule}
                  onConfirm={onEventConfirm}
                  onComplete={onEventComplete}
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
  onDaySelect,
  onEventSelect,
  onEventCancel,
  onEventReschedule,
  onEventConfirm,
  onEventComplete
}: {
  weekStart: Date;
  events: CalendarEvent[];
  onDaySelect?: (day: Date) => void;
  onEventSelect?: (event: CalendarEvent) => void;
  onEventCancel?: (event: CalendarEvent) => void;
  onEventReschedule?: (event: CalendarEvent) => void;
  onEventConfirm?: (event: CalendarEvent) => void;
  onEventComplete?: (event: CalendarEvent) => void;
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
    <div className="panel-card overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-[#eee5d9] border-b border-[--border] bg-[#f8f3eb]">
        {days.map((day) => {
          const isToday = dayKeyOf(day) === todayKey;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDaySelect?.(day)}
              aria-label={`Ver ${new Intl.DateTimeFormat("es-MX", {
                weekday: "long",
                day: "numeric",
                month: "long"
              }).format(day)}`}
              className={`px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-forest/40 ${
                onDaySelect ? "cursor-pointer hover:bg-forest/5" : ""
              }`}
            >
              <div
                className={`text-[11px] font-semibold uppercase ${
                  isToday ? "text-forest" : "text-gray-500"
                }`}
              >
                {new Intl.DateTimeFormat("es-MX", {
                  weekday: "short"
                }).format(day)}
              </div>
              <div
                className={`text-sm font-bold ${
                  isToday ? "text-forest" : "text-gray-700"
                }`}
              >
                {day.getDate()}
              </div>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-7 divide-x divide-[#eee5d9]">
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
                  onReschedule={onEventReschedule}
                  onConfirm={onEventConfirm}
                  onComplete={onEventComplete}
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
  onEventCancel,
  onEventReschedule,
  onEventConfirm,
  onEventComplete
}: {
  day: Date;
  events: CalendarEvent[];
  onEventSelect?: (event: CalendarEvent) => void;
  onEventCancel?: (event: CalendarEvent) => void;
  onEventReschedule?: (event: CalendarEvent) => void;
  onEventConfirm?: (event: CalendarEvent) => void;
  onEventComplete?: (event: CalendarEvent) => void;
}) => {
  const byHour = new Map<number, CalendarEvent[]>();

  for (const event of events) {
    const hour = new Date(event.startsAt).getHours();
    const bucket = byHour.get(hour) ?? [];

    bucket.push(event);
    byHour.set(hour, bucket);
  }

  const hours = new Set(Array.from({ length: 13 }, (_, index) => 9 + index));
  for (const hour of byHour.keys()) {
    hours.add(hour);
  }

  return (
    <div className="panel-card overflow-hidden">
      <div className="border-b border-[--border] bg-[#f8f3eb] px-4 py-2 text-sm font-semibold text-[--foreground]">
        {formatFullDayLabel(day)}
      </div>
      <div className="divide-y divide-[#eee5d9]">
        {Array.from(hours)
          .sort((a, b) => a - b)
          .map((hour) => {
            const hourEvents = (byHour.get(hour) ?? []).sort(eventSort);

            return (
              <div key={hour} className="flex min-h-14 items-stretch">
                <div className="w-16 shrink-0 border-r border-[#eee5d9] py-2 pr-2 text-right text-[11px] font-medium text-[--muted]">
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
                      onReschedule={onEventReschedule}
                      onConfirm={onEventConfirm}
                      onComplete={onEventComplete}
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
