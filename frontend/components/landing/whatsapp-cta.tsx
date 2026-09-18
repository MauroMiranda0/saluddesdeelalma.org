type WhatsAppCtaProps = { compact?: boolean };

export const WhatsAppCta = ({ compact = false }: WhatsAppCtaProps) => (
  <a
    href="https://wa.me/525660950665"
    target="_blank"
    rel="noreferrer"
    className={`inline-flex items-center justify-center rounded-md bg-[#59633d] font-semibold text-white no-underline shadow-sm transition hover:bg-[#424b2b] ${compact ? "px-3 py-2 text-xs" : "px-5 py-3 text-sm"}`}
  >
    {compact ? "Agenda tu consulta" : "Agenda tu consulta por WhatsApp"}
  </a>
);
