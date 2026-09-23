type WhatsAppCtaProps = {
  compact?: boolean;
  className?: string;
  label?: string;
};

const WHATSAPP_URL =
  "https://wa.me/525660950665?text=Hola%2C%20me%20gustar%C3%ADa%20agendar%20una%20cita";

export const WhatsAppCta = ({
  compact = false,
  className = "",
  label
}: WhatsAppCtaProps) => (
  <a
    href={WHATSAPP_URL}
    target="_blank"
    rel="noreferrer"
    className={`inline-flex items-center justify-center rounded-md bg-[#59633d] font-semibold !text-white no-underline shadow-sm transition hover:bg-[#424b2b] hover:!text-white ${compact ? "px-3 py-2 text-xs" : "px-5 py-3 text-sm"} ${className}`}
  >
    {label ?? (compact ? "Agenda tu cita" : "Agenda tu cita por WhatsApp")}
  </a>
);
