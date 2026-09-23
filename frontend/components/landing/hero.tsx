import { WhatsAppCta } from "./whatsapp-cta";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1400&q=85";

export const Hero = () => (
  <section
    id="inicio"
    className="overflow-hidden bg-[#fef2e5] px-5 py-16 md:px-16 md:py-28"
  >
    <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
      <div>
        <h1 className="landing-serif max-w-xl text-5xl leading-[1.03] text-[#78583c] sm:text-6xl md:text-7xl">
          Salud desde el Alma
        </h1>
        <p className="mt-5 text-sm font-semibold tracking-[0.22em] text-[#715735]">
          CUERPO · MENTE · ESPÍRITU
        </p>
        <p className="mt-7 max-w-md text-lg leading-8 text-[--muted]">
          Acompañamiento psicológico integral para una vida plena, tranquila y
          armoniosa.
        </p>
        <div className="mt-9">
          <WhatsAppCta />
        </div>
      </div>
      <div className="relative mx-auto w-full max-w-xl">
        <div className="absolute inset-4 rounded-full bg-[#fed2af]/45 blur-3xl" />
        <img
          src={HERO_IMAGE}
          alt="Profesional de salud mental en un espacio de atención cálido"
          className="relative aspect-[4/3] w-full rounded-2xl object-cover object-center drop-shadow-xl"
          fetchPriority="high"
        />
      </div>
    </div>
  </section>
);
