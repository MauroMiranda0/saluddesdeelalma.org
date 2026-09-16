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
  const details = (
    <>
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
      {variant === "day" && event.appointment.isManualException && (
        <span className="mt-1 w-fit rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
          Excepción manual
        </span>
      )}
    </>
  );

  return (
    <div
      className="group relative overflow-hidden rounded border border-gray-100 px-2 py-1.5 shadow-sm transition-shadow hover:shadow-md"
      style={styles.card}
      title={
        event.appointment?.cancelReason
          ? `Cancelada: ${event.appointment.cancelReason}`
          : event.title
      }
    >
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(event)}
          className="flex w-full flex-col text-left focus:outline-none focus:ring-2"
        >
          {details}
          <span className="mt-0.5 pr-24 text-[11px] font-medium opacity-90">
            {formatShort(event.startsAt)}
          </span>
        </button>
      ) : (
        <div className="flex flex-col">
          {details}
          <span className="mt-0.5 pr-24 text-[11px] font-medium opacity-90">
            {formatShort(event.startsAt)}
          </span>
        </div>
      )}
      {hasActions && (
        <div className="absolute bottom-1 right-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {onConfirm && isConfirmable && (
            <ActionButton label="Confirmar" onClick={() => onConfirm(event)} />
          )}
          {onReschedule && isCancellable && (
            <ActionButton label="Mover" onClick={() => onReschedule(event)} />
          )}
          {onComplete && isCompletable && (
            <ActionButton label="Completar" onClick={() => onComplete(event)} />
          )}
          {onCancel && isCancellable && (
            <ActionButton label="Cancelar" onClick={() => onCancel(event)} />
          )}
        </div>
      )}
    </div>
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
    onClick={onClick}
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
