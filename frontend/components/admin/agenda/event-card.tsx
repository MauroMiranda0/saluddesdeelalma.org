"use client";

import {
  appointmentKindOf,
  eventStyles
} from "../../../lib/admin/event-colors";
import type { CalendarEvent } from "../../../lib/admin/calendar";

type EventCardProps = {
  event: CalendarEvent;
  variant?: "month" | "week" | "day";
  onCancel?: (event: CalendarEvent) => void;
  onSelect?: (event: CalendarEvent) => void;
};

export const EventCard = ({
  event,
  variant = "month",
  onCancel,
  onSelect
}: EventCardProps) => {
  const kind =
    event.kind === "appointment" && event.appointment
      ? appointmentKindOf(event.appointment)
      : "cumpleanios";
  const styles = eventStyles(kind);
  const isCancellable =
    event.kind === "appointment" &&
    event.appointment &&
    (event.appointment.status === "programada" ||
      event.appointment.status === "confirmada");

  const content = (
    <div
      className={
        variant === "day"
          ? "group flex flex-1 flex-col justify-center overflow-hidden rounded border border-gray-100 px-2 py-1 shadow-sm"
          : "group flex flex-col overflow-hidden rounded border border-gray-100 px-2 py-1.5 shadow-sm"
      }
      style={styles.card}
      title={
        event.appointment?.cancelReason
          ? `Cancelada: ${event.appointment.cancelReason}`
          : event.title
      }
    >
      <div className="flex items-center gap-1">
        <span className="truncate text-xs font-semibold">
          {event.meta ? `${event.meta} ` : ""}
          {event.title}
        </span>
      </div>
      {variant !== "month" && (
        <span className="truncate text-[11px] opacity-80">
          {event.appointment
            ? `${event.appointment.patientPhone ?? ""}${
                event.subtitle ? ` · ${event.subtitle}` : ""
              }`
            : event.subtitle}
        </span>
      )}
      <div className="mt-0.5 flex items-center justify-between gap-1">
        <span className="text-[11px] font-medium opacity-90">
          {event.appointment?.scheduledAt ? formatShort(event.startsAt) : ""}
        </span>
        {isCancellable && onCancel && (
          <button
            type="button"
            onClick={(click) => {
              click.stopPropagation();
              onCancel(event);
            }}
            className="rounded px-1 text-[10px] font-semibold opacity-0 transition-opacity hover:bg-white/60 focus:opacity-100 group-hover:opacity-100"
            style={{ color: styles.card.color }}
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );

  if (!onSelect) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className="block w-full text-left"
    >
      {content}
    </button>
  );
};

const formatShort = (iso: string) => {
  const date = new Date(iso);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
};
