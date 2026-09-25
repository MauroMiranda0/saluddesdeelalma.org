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
    className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#868564] font-semibold !text-white no-underline shadow-[0_10px_25px_rgba(134,133,100,0.25)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#727152] hover:!text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7e5d41] ${compact ? "px-4 py-2 text-xs" : "px-6 py-3.5 text-sm"} ${className}`}
  >
    {label ?? (compact ? "Agenda tu cita" : "Agenda tu cita por WhatsApp")}
    {!compact && <span aria-hidden="true">&rarr;</span>}
  </a>
);
