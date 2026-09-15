"use client";

import { useState } from "react";

import { buildMonthGrid } from "../../../lib/admin/calendar";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

const TIME_SLOTS = (() => {
  const slots: string[] = [];

  for (let minutes = 9 * 60; minutes < 21 * 60; minutes += 15) {
    slots.push(
      `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
        minutes % 60
      ).padStart(2, "0")}`
    );
  }

  return slots;
})();

const pad = (value: number) => String(value).padStart(2, "0");

const toDateInput = (date: Date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
};

const parseValue = (value: string) => {
  const [date, time] = value.split("T");

  return { date: date ?? "", time: time ?? "" };
};

const formatMonthLabel = (date: Date) => {
  return new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric"
  }).format(date);
};

const formatTriggerLabel = (value: string) => {
  const { date, time } = parseValue(value);

  if (!date || !time) {
    return "";
  }

  const parsed = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const day = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "short"
  }).format(parsed);

  return `${day}, ${time}`;
};

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  confirmLabel?: string;
};

export const DateTimePicker = ({
  value,
  onChange,
  disabled,
  confirmLabel = "Continuar"
}: DateTimePickerProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseValue(value));
  const [monthCursor, setMonthCursor] = useState(() => {
    const base = value ? new Date(value) : new Date();

    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const openPicker = () => {
    if (disabled) {
      return;
    }

    setDraft(parseValue(value));

    const base = value ? new Date(value) : new Date();
    setMonthCursor(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen(true);
  };

  const selectDay = (day: Date) => {
    const time = draft.time || "09:00";

    setDraft({ date: toDateInput(day), time });
  };

  const selectTime = (time: string) => {
    setDraft((current) => ({ ...current, time }));
  };

  const navigateMonth = (offset: number) => {
    setMonthCursor(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  };

  const continueSelection = () => {
    if (draft.date && draft.time) {
      onChange(`${draft.date}T${draft.time}`);
    }
    setOpen(false);
  };

  const grid = buildMonthGrid(monthCursor);
  const todayDate = toDateInput(new Date());
  const label = formatTriggerLabel(value);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded border border-gray-300 px-2 py-1.5 text-left text-sm disabled:bg-gray-50 ${
          open ? "border-forest" : ""
        }`}
      >
        <span className={label ? "text-gray-800" : "text-gray-400"}>
          {label || "Seleccionar fecha y hora…"}
        </span>
        <span aria-hidden className="text-gray-400">
          ▾
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-3"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Selector de fecha y hora"
        >
          <div
            className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white p-4 shadow-lg"
            onClick={(click) => click.stopPropagation()}
          >
            <h2 className="mb-3 text-base font-semibold text-gray-800">
              Fecha y hora de la cita
            </h2>

            <div className="flex flex-col gap-3 overflow-y-auto">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => navigateMonth(-1)}
                    className="rounded border border-gray-300 px-2 py-0.5 text-sm text-gray-600 hover:bg-gray-50"
                    aria-label="Mes anterior"
                  >
                    ‹
                  </button>
                  <span className="text-sm font-semibold text-gray-700">
                    {formatMonthLabel(monthCursor)}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateMonth(1)}
                    className="rounded border border-gray-300 px-2 py-0.5 text-sm text-gray-600 hover:bg-gray-50"
                    aria-label="Mes siguiente"
                  >
                    ›
                  </button>
                </div>

                <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase text-gray-400">
                  {WEEKDAY_LABELS.map((labelDay) => (
                    <span key={labelDay} className="py-0.5">
                      {labelDay}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-0.5">
                  {grid.map((day) => {
                    const key = toDateInput(day);
                    const inMonth = day.getMonth() === monthCursor.getMonth();
                    const selected = key === draft.date;
                    const isToday = key === todayDate;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectDay(day)}
                        className={`rounded py-1 text-center text-xs focus:outline-none focus:ring-2 focus:ring-forest/40 ${
                          selected
                            ? "bg-forest font-semibold text-white"
                            : isToday
                              ? "bg-forest/10 font-semibold text-forest"
                              : inMonth
                                ? "text-gray-700 hover:bg-gray-100"
                                : "text-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">
                  Hora (Lun–Vie 09:00 a 20:45)
                </p>
                <div className="grid grid-cols-6 gap-1">
                  {TIME_SLOTS.map((slot) => {
                    const selected = slot === draft.time;

                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => selectTime(slot)}
                        className={`rounded px-1 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-forest/40 ${
                          selected
                            ? "bg-forest font-semibold text-white"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-1.5 text-xs text-gray-500">
                Hora libre
                <input
                  type="time"
                  value={draft.time}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      time: event.target.value
                    }))
                  }
                  className="rounded border border-gray-300 px-1.5 py-0.5 text-sm text-gray-700"
                />
              </label>
            </div>

            <div className="mt-3 flex justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={continueSelection}
                disabled={!draft.date || !draft.time}
                className="rounded bg-forest px-4 py-1.5 text-sm font-semibold text-white hover:bg-forest-deep disabled:opacity-50"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
