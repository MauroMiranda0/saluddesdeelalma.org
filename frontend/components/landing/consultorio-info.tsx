type LandingIconName =
  | "heart"
  | "person"
  | "shield"
  | "sprout"
  | "sparkles"
  | "community"
  | "individual"
  | "couple"
  | "family";

const LandingIcon = ({ name }: { name: LandingIconName }) => {
  const iconProps = {
    "aria-hidden": true,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24"
  };

  switch (name) {
    case "heart":
      return (
        <svg {...iconProps}>
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z" />
        </svg>
      );
    case "person":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="7" r="3" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      );
    case "shield":
      return (
        <svg {...iconProps}>
          <path d="M12 3 5 6v5c0 4.7 3 8.4 7 10 4-1.6 7-5.3 7-10V6l-7-3Z" />
          <rect width="5" height="4" x="9.5" y="11" rx="1" />
          <path d="M11 11V9.5a1 1 0 0 1 2 0V11" />
        </svg>
      );
    case "sprout":
      return (
        <svg {...iconProps}>
          <path d="M12 21v-8" />
          <path d="M12 13c-5 0-7-3-7-7 5 0 7 3 7 7Z" />
          <path d="M12 17c0-5 3-8 7-8 0 5-3 8-7 8Z" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...iconProps}>
          <path d="m12 3 1.3 4.7L18 9l-4.7 1.3L12 15l-1.3-4.7L6 9l4.7-1.3L12 3Z" />
          <path d="m19 15 .6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15Z" />
          <path d="m5 15 .5 1.5L7 17l-1.5.5L5 19l-.5-1.5L3 17l1.5-.5L5 15Z" />
        </svg>
      );
    case "community":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="7" r="3" />
          <circle cx="5" cy="10" r="2" />
          <circle cx="19" cy="10" r="2" />
          <path d="M6 21a6 6 0 0 1 12 0M1.5 20a4 4 0 0 1 5-3.8M17.5 16.2a4 4 0 0 1 5 3.8" />
        </svg>
      );
    case "individual":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="7" r="3.5" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      );
    case "couple":
      return (
        <svg {...iconProps}>
          <circle cx="8" cy="8" r="3" />
          <circle cx="16" cy="8" r="3" />
          <path d="M2.5 21a5.5 5.5 0 0 1 11 0M10.5 21a5.5 5.5 0 0 1 11 0" />
        </svg>
      );
    case "family":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="6" r="2.5" />
          <circle cx="6" cy="10" r="2.5" />
          <circle cx="18" cy="10" r="2.5" />
          <path d="M8.5 21a3.5 3.5 0 0 1 7 0M1.5 21a4.5 4.5 0 0 1 7-3.7M15.5 17.3a4.5 4.5 0 0 1 7 3.7" />
        </svg>
      );
  }
};

const services: {
  icon: LandingIconName;
  title: string;
  description: string;
  duration: string;
}[] = [
  {
    icon: "individual",
    title: "Terapia Individual",
    description: "Un espacio íntimo para conocerte, sanar y crecer.",
    duration: "60 minutos"
  },
  {
    icon: "couple",
    title: "Terapia de Pareja",
    description:
      "Fortalezcan su vínculo, mejoren su comunicación y construyan juntos desde el respeto.",
    duration: "90 minutos"
  },
  {
    icon: "family",
    title: "Terapia Familiar",
    description:
      "Sanen heridas, mejoren sus relaciones y crezcan como familia.",
    duration: "90 minutos"
  }
];

type Value = {
  icon: LandingIconName;
  title: string;
  description: string;
};

const values: Value[] = [
  {
    icon: "heart",
    title: "Amor al prójimo",
    description: "Cada persona es recibida con calidez y respeto."
  },
  {
    icon: "person",
    title: "Respeto a la dignidad humana",
    description: "Tu historia y tu proceso son sagrados."
  },
  {
    icon: "shield",
    title: "Protección a la confianza",
    description: "Confidencialidad absoluta en cada sesión."
  },
  {
    icon: "sprout",
    title: "Compromiso con la vida",
    description: "Cuidamos de ti y de lo que te importa."
  },
  {
    icon: "sparkles",
    title: "Fe que sostiene",
    description: "Un enfoque que integra cuerpo, mente y espíritu."
  },
  {
    icon: "community",
    title: "Comunidad y compañerismo",
    description: "No caminas solo; caminamos contigo."
  }
];

const MEDITATION_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDqpgx05bEEbItyzJLxIg6gxCYa4Xmn53nsHzx5JD3X1ZPJhnQ3poQ5SXbrB0CLQNHsjgT-frid9QGMA-CE04n6Wev6QeTNd5OvZIG3x5tDOJNDbzPPZJqLe15sMBwxU9YH-wtZRdAjqQ4ZO5Oei4Wun2wrypngyuKcGHkU2ejJDRl5XkD3-RxXPfZPOeh_evHhCRn_7ZKfU9eRQyZyGoJ_BpVINSpETNqkN9v92iGUMkzpYT922PNQ";

const ValueCard = ({ icon, title, description }: Value) => (
  <article className="h-full rounded-[15px] bg-white/90 p-5 shadow-[0_4px_16px_rgba(52,41,31,0.04)] backdrop-blur-sm">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8c59a]/65 p-2.5 text-[#7e5d41]">
      <LandingIcon name={icon} />
    </span>
    <h3 className="mt-2 font-semibold text-[#7e5d41]">{title}</h3>
    <p className="mt-1 text-sm leading-6 text-[--muted]">{description}</p>
  </article>
);

export const ConsultorioInfo = () => (
  <>
    <section
      id="nosotros"
      className="relative bg-[#cfc7ab]/55 bg-cover bg-center px-5 py-20 md:px-8"
      style={{
        backgroundImage: `linear-gradient(90deg, rgb(243 231 219 / 96%), rgb(243 231 219 / 66%)), url(${MEDITATION_IMAGE})`
      }}
    >
      <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(24rem,.9fr)]">
        <article className="rounded-[15px] bg-white p-8 shadow-[0_10px_30px_rgba(52,41,31,0.08)] md:p-10">
          <p className="text-xs font-semibold tracking-[0.12em] text-sepia">
            SOBRE NOSOTROS
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#7e5d41] md:text-4xl">
            Más que terapia, un acompañamiento integral
          </h2>
          <div className="mt-6 space-y-5 text-[--muted] md:text-lg md:leading-8">
            <p>
              En <strong>Salud desde el Alma</strong> creemos que cada persona
              está aquí con un propósito extraordinario, y el nuestro es
              ayudarte a encontrarlo.
            </p>
            <p>
              Somos un espacio de expresión y validación emocional donde lo más
              importante eres tú: tu crecimiento integral, tu encuentro contigo
              mismo, con Dios y con tu propósito de vida. Nuestra misión es
              acompañarte en las temporadas de dificultad y encaminarte hacia
              una vida plena, brindándote las herramientas necesarias para
              mantener tu propio bienestar y el de quienes amas.
            </p>
            <p>
              Trabajamos desde el amor al prójimo, el respeto a la dignidad
              humana, la protección a la confianza y la fe que sostiene cuando
              lo tangible falla.
            </p>
          </div>
        </article>
        <div className="grid gap-3 sm:grid-cols-2 lg:h-full lg:grid-cols-1 lg:grid-rows-4">
          {values.slice(0, 4).map((value) => (
            <ValueCard key={value.title} {...value} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
          {values.slice(4).map((value) => (
            <ValueCard key={value.title} {...value} />
          ))}
        </div>
      </div>
    </section>
    <section
      id="servicios"
      className="scroll-mt-24 bg-[#868564] px-5 py-20 text-white md:px-8"
    >
      <div className="mx-auto max-w-[1200px] text-center">
        <p className="text-xs font-semibold tracking-[0.14em] text-[#f3e7db]">
          | SERVICIOS
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Terapia para cada etapa de tu vida
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/85">
          Sesiones diseñadas para acompañarte en lo individual, en pareja o en
          familia.
        </p>
      </div>
      <div className="mx-auto mt-12 grid max-w-[1200px] gap-6 md:grid-cols-3">
        {services.map(({ icon, title, description, duration }) => (
          <article
            key={title}
            className="flex h-full flex-col rounded-[15px] bg-white p-7 text-left text-[#34291f] shadow-[0_10px_30px_rgba(52,41,31,0.12)] transition duration-300 hover:-translate-y-1"
          >
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#7e5d41] p-3 text-white">
              <LandingIcon name={icon} />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7e5d41]">
              En linea o presencial
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[#7e5d41]">
              {title}
            </h3>
            <p className="mt-4 leading-7 text-[#34291f]">{description}</p>
            <dl className="-mx-7 -mb-7 mt-auto space-y-2 rounded-b-[15px] bg-[#cfc7ab]/60 p-7 text-sm text-[#34291f]">
              <div className="flex justify-between gap-3">
                <dt className="font-semibold text-[#7e5d41]">Duración</dt>
                <dd>{duration}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-semibold text-[#7e5d41]">Modalidad</dt>
                <dd>En línea o presencial</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-7 text-white/85">
        ¿No sabes cuál elegir? Escríbenos por WhatsApp y con gusto te
        orientamos.
      </p>
    </section>
  </>
);
