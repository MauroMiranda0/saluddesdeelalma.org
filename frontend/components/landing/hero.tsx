import { WhatsAppCta } from "./whatsapp-cta";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1400&q=85";

export const Hero = () => (
  <section
    id="inicio"
    className="relative isolate overflow-hidden bg-[#f3e7db] px-5 py-16 md:px-8 md:py-20"
  >
    <div
      className="pointer-events-none absolute right-[-2rem] top-1/2 -z-10 -translate-y-1/2 select-none text-[20rem] font-bold leading-none text-[#7e5d41]/[0.035] md:right-4 md:text-[28rem]"
      aria-hidden="true"
    >
      &#936;
    </div>
    <div className="mx-auto grid min-h-[34rem] max-w-[1200px] items-center gap-12 lg:grid-cols-2">
      <div className="max-w-[500px]">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7e5d41] shadow-sm">
          <span
            className="h-2 w-2 rounded-full bg-[#868564]"
            aria-hidden="true"
          />
          Psicoterapia integral
        </div>
        <p className="mt-5 text-base font-semibold text-[#7e5d41]">
          Salud desde el Alma
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-[#7e5d41] sm:text-5xl md:text-[2.8rem]">
          Encuentra tu camino a traves del{" "}
          <span className="italic text-[#868564]">autoconocimiento.</span>
        </h1>
        <p className="mt-6 max-w-md text-base leading-7 text-[--muted] md:text-[1.05rem]">
          Psicología integral para cuerpo, mente y espíritu. Te acompañamos en
          las temporadas difíciles y te ayudamos a construir una vida plena.
        </p>
        <div className="mt-8">
          <WhatsAppCta label="Quiero iniciar mi proceso" />
        </div>
        <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-[#7e5d41]/15 pt-6 text-sm text-[--muted]">
          <p className="flex items-center gap-2">
            <span className="font-bold text-[#868564]" aria-hidden="true">
              +
            </span>
            Atención cálida y sin prisas
          </p>
          <p className="flex items-center gap-2">
            <span className="font-bold text-[#868564]" aria-hidden="true">
              +
            </span>
            Confidencialidad garantizada
          </p>
        </div>
      </div>
      <div className="relative mx-auto w-full max-w-[460px] lg:mx-0 lg:justify-self-end">
        <div className="absolute -inset-4 -z-10 rotate-1 rounded-[24px] bg-[#e8c59a]/70 blur-2xl" />
        <img
          src={HERO_IMAGE}
          alt="Profesional de salud mental en un espacio de atención cálido"
          className="aspect-[4/5] w-full rounded-[14px] object-cover object-center shadow-[0_20px_40px_rgba(52,41,31,0.12)] transition duration-700 hover:scale-[1.02]"
          fetchPriority="high"
        />
        <div className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border-2 border-white bg-[#7e5d41] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(52,41,31,0.25)]">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs"
            aria-hidden="true"
          >
            @
          </span>
          Salud desde el Alma
        </div>
      </div>
    </div>
  </section>
);
