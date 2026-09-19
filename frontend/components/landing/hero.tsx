import { WhatsAppCta } from "./whatsapp-cta";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDgyM6rmphBJZZ9XodhLjR_L3Xx7mgCWR_-NNDdzUf1lI9qAd7eWgh6477lOKucFQMNu0K5Gd0muDuyggn-6MS1GwaBvc2xAhH6jDN_jcU_qIXqUVqFAqsm2y02SUQK6T19PrEvQCeBRJwTzGwD_rcubnONjsILQMV__wj-jHpPDekDO8UiesPxR5Ku6ZISIbRfssDoeMwh_Al2TVHFpWR7jUdv2PbK4Uofyp5CX2jPios2K6BG5LYNwyYFBua4ISKwHg";

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
          alt="León y cordero en reposo"
          className="relative w-full rounded-2xl drop-shadow-xl"
        />
      </div>
    </div>
  </section>
);
