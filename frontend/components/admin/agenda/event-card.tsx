"use client";

import {
  appointmentKindOf,
  eventStyles
} from "../../../lib/admin/event-colors";
import type { CalendarEvent } from "../../../lib/admin/calendar";

type EventCardProps = {
  event: CalendarEvent;
  variant?: "month" | "week" | "day";
  onSelect?: (event: CalendarEvent) => void;
  onCancel?: (event: CalendarEvent) => void;
  onReschedule?: (event: CalendarEvent) => void;
  onConfirm?: (event: CalendarEvent) => void;
  onComplete?: (event: CalendarEvent) => void;
};

export const EventCard = ({
  event,
  variant = "month",
  onSelect,
  onCancel,
  onReschedule,
  onConfirm,
  onComplete
}: EventCardProps) => {
  const kind = appointmentKindOf(event.appointment);
  const styles = eventStyles(kind);
  const status = event.appointment.status;
  const isCancellable = status === "programada" || status === "confirmada";
  const isConfirmable = status === "programada";
  const isCompletable = status === "programada" || status === "confirmada";

  const hasActions =
    isCancellable && (onCancel || onReschedule || onConfirm || onComplete);

  return (
    <button
      type="button"
      onClick={() => {
        if (onSelect) {
          onSelect(event);
        }
      }}
      className={
        onSelect
          ? "group flex w-full flex-col overflow-hidden rounded border border-gray-100 px-2 py-1.5 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2"
          : "group flex w-full flex-col overflow-hidden rounded border border-gray-100 px-2 py-1.5 text-left shadow-sm"
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
          {formatShort(event.startsAt)}
        </span>
        {hasActions && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            {onConfirm && isConfirmable && (
              <ActionButton
                label="Confirmar"
                onClick={() => onConfirm(event)}
              />
            )}
            {onReschedule && isCancellable && (
              <ActionButton label="Mover" onClick={() => onReschedule(event)} />
            )}
            {onComplete && isCompletable && (
              <ActionButton
                label="Completar"
                onClick={() => onComplete(event)}
              />
            )}
            {onCancel && isCancellable && (
              <ActionButton label="Cancelar" onClick={() => onCancel(event)} />
            )}
          </div>
        )}
      </div>
    </button>
  );
};

const ActionButton = ({
  label,
  onClick
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={(click) => {
      click.stopPropagation();
      onClick();
    }}
    className="rounded px-1 text-[10px] font-semibold hover:bg-white/60 focus:opacity-100"
  >
    {label}
  </button>
);

const formatShort = (iso: string) => {
  const date = new Date(iso);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
};
