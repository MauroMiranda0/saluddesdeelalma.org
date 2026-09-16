"use client";

import type { CalendarEvent } from "../../../lib/admin/calendar";

type AppointmentActionsProps = {
  event: CalendarEvent;
  onReschedule?: (event: CalendarEvent) => void;
  onConfirm?: (event: CalendarEvent) => void;
  onComplete?: (event: CalendarEvent) => void;
  onCancel?: (event: CalendarEvent) => void;
  onClose: () => void;
};

export const AppointmentActions = ({
  event,
  onReschedule,
  onConfirm,
  onComplete,
  onCancel,
  onClose
}: AppointmentActionsProps) => {
  const status = event.appointment?.status;
  const isCancellable = status === "programada" || status === "confirmada";
  const isConfirmable = status === "programada";
  const isCompletable = status === "programada" || status === "confirmada";

  const run = (action?: (event: CalendarEvent) => void) => {
    onClose();
    action?.(event);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-lg border border-gray-200 bg-white p-4 shadow-lg sm:max-w-md sm:rounded-lg"
        onClick={(click) => click.stopPropagation()}
        role="dialog"
        aria-label="Acciones de la cita"
      >
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Cita ·{" "}
          {event.appointment?.status === "programada"
            ? "Programada"
            : event.appointment?.status === "confirmada"
              ? "Confirmada"
              : event.appointment?.status === "completada"
                ? "Completada"
                : "Cancelada"}
        </p>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          {event.meta ? `${event.meta} ` : ""}
          {event.title}
        </h2>

        <div className="flex flex-col gap-2">
          {onReschedule && isCancellable && (
            <button
              type="button"
              onClick={() => run(onReschedule)}
              className="rounded border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Mover cita
              <span className="block text-xs font-normal text-gray-400">
                Cambiar fecha u hora
              </span>
            </button>
          )}
          {onConfirm && isConfirmable && (
            <button
              type="button"
              onClick={() => run(onConfirm)}
              className="rounded bg-forest px-4 py-2 text-left text-sm font-semibold text-white hover:bg-forest/90"
            >
              Confirmar cita
              <span className="block text-xs font-normal text-forest-foreground/80">
                Marcar como confirmada y avisar por WhatsApp
              </span>
            </button>
          )}
          {onComplete && isCompletable && (
            <button
              type="button"
              onClick={() => run(onComplete)}
              className="rounded border border-forest px-4 py-2 text-left text-sm font-semibold text-forest hover:bg-forest/10"
            >
              Completar cita
              <span className="block text-xs font-normal text-gray-400">
                Marcar como realizada
              </span>
            </button>
          )}
          {onCancel && isCancellable && (
            <button
              type="button"
              onClick={() => run(onCancel)}
              className="rounded border border-red-200 px-4 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Cancelar cita
              <span className="block text-xs font-normal text-gray-400">
                Requiere un motivo
              </span>
            </button>
          )}
          {!isCancellable && !isConfirmable && (
            <p className="text-sm text-gray-500">
              Esta cita no tiene acciones disponibles.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
