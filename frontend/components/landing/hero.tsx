import { WhatsAppCta } from "./whatsapp-cta";

export const Hero = () => {
  return (
    <section
      id="inicio"
      className="grid overflow-hidden bg-[#f8ecdd] md:grid-cols-[1.1fr_0.9fr]"
    >
      <div className="flex min-h-96 flex-col justify-center px-7 py-14 sm:px-12">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-sepia">
          Psicología integral
        </p>
        <h1 className="landing-serif max-w-xl text-5xl leading-[1.03] text-[#4c4a28] sm:text-6xl">
          Salud desde el Alma
        </h1>
        <p className="mt-4 text-sm font-medium tracking-wide text-sepia">
          CUERPO · MENTE · ESPÍRITU
        </p>
        <p className="mt-6 max-w-md text-base leading-7 text-[#5f5144]">
          Acompañamiento psicológico integral para una vida en paz, con
          propósito y cuidado.
        </p>
        <div className="mt-8">
          <WhatsAppCta />
        </div>
      </div>
      <div
        className="relative min-h-80 overflow-hidden bg-[radial-gradient(circle_at_45%_38%,#eed7ba_0,transparent_28%),linear-gradient(145deg,#d8b98f,#9e7046)]"
        aria-label="Un espacio cálido para su bienestar"
        role="img"
      >
        <div className="absolute inset-x-[16%] top-[12%] aspect-square rounded-full border border-[#fff7e9]/80 bg-[#d4a66f]/30" />
        <div className="absolute bottom-0 left-[22%] h-[65%] w-[42%] rounded-t-[48%] bg-[#7a4b2b] shadow-[-42px_28px_0_5px_#ba8452]" />
        <div className="absolute bottom-8 right-8 rounded-full border border-[#fff7e9]/70 px-4 py-2 text-xs text-[#fff7e9]">
          Un lugar para respirar
        </div>
      </div>
    </section>
  );
};
