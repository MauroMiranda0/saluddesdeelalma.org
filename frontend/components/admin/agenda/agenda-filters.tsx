"use client";

import {
  EVENT_COLOR_MAP,
  type AgendaEventKind
} from "../../../lib/admin/event-colors";

const LEGEND_ORDER: AgendaEventKind[] = [
  "por_confirmar",
  "pendiente_pago",
  "consulta_jocelyn",
  "consulta_jenny",
  "personal",
  "cancelada",
  "cumpleanios"
];

type AgendaFiltersProps = {
  active: Set<AgendaEventKind>;
  counts: Partial<Record<AgendaEventKind, number>>;
  onChange: (next: Set<AgendaEventKind>) => void;
};

export const AgendaFilters = ({
  active,
  counts,
  onChange
}: AgendaFiltersProps) => {
  const allActive = active.size === 0;

  const toggle = (kind: AgendaEventKind) => {
    const next = new Set(active);

    if (next.has(kind)) {
      next.delete(kind);
    } else {
      next.add(kind);
    }

    onChange(next);
  };

  const toggleAll = () => onChange(new Set());

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggleAll}
        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
          allActive
            ? "border-gray-800 bg-gray-900 text-white"
            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        Todas
      </button>
      {LEGEND_ORDER.map((kind) => {
        const token = EVENT_COLOR_MAP[kind];
        const selected = active.has(kind);
        const count = counts[kind] ?? 0;

        return (
          <button
            key={kind}
            type="button"
            onClick={() => toggle(kind)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-opacity ${
              allActive || selected
                ? "opacity-100"
                : "opacity-40 hover:opacity-80"
            }`}
            style={{
              background: token.bg,
              borderColor: token.border,
              color: token.text
            }}
            aria-pressed={allActive || selected}
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: token.solid }}
            />
            {token.label}
            <span className="rounded-full bg-white/50 px-1.5 text-[10px]">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
