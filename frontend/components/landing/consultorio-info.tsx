const services = [
  {
    icon: "🌿",
    title: "Terapia Individual",
    description: "Un espacio íntimo para conocerte, sanar y crecer.",
    duration: "60 minutos"
  },
  {
    icon: "💞",
    title: "Terapia de Pareja",
    description:
      "Fortalezcan su vínculo, mejoren su comunicación y construyan juntos desde el respeto.",
    duration: "90 minutos"
  },
  {
    icon: "👨‍👩‍👧",
    title: "Terapia Familiar",
    description: "Sanen heridas, mejoren sus relaciones y crezcan como familia.",
    duration: "90 minutos"
  }
];

const values = [
  ["❤️", "Amor al prójimo", "Cada persona es recibida con calidez y respeto."],
  [
    "🕊️",
    "Respeto a la dignidad humana",
    "Tu historia y tu proceso son sagrados."
  ],
  [
    "🤝",
    "Protección a la confianza",
    "Confidencialidad absoluta en cada sesión."
  ],
  ["🌱", "Compromiso con la vida", "Cuidamos de ti y de lo que te importa."],
  [
    "✨",
    "Fe que sostiene",
    "Un enfoque que integra cuerpo, mente y espíritu."
  ],
  [
    "🌍",
    "Comunidad y compañerismo",
    "No caminas solo; caminamos contigo."
  ]
];

const MEDITATION_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDqpgx05bEEbItyzJLxIg6gxCYa4Xmn53nsHzx5JD3X1ZPJhnQ3poQ5SXbrB0CLQNHsjgT-frid9QGMA-CE04n6Wev6QeTNd5OvZIG3x5tDOJNDbzPPZJqLe15sMBwxU9YH-wtZRdAjqQ4ZO5Oei4Wun2wrypngyuKcGHkU2ejJDRl5XkD3-RxXPfZPOeh_evHhCRn_7ZKfU9eRQyZyGoJ_BpVINSpETNqkN9v92iGUMkzpYT922PNQ";

export const ConsultorioInfo = () => (
  <>
    <section
      id="nosotros"
      className="relative bg-[#ece1d5] bg-cover bg-center px-5 py-16 md:px-16"
      style={{
        backgroundImage: `linear-gradient(90deg, rgb(255 248 243 / 96%), rgb(255 248 243 / 58%)), url(${MEDITATION_IMAGE})`
      }}
    >
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(24rem,.9fr)] lg:items-start">
        <article className="panel-card p-8 md:p-10">
          <p className="text-sm font-semibold tracking-[0.18em] text-sepia">
            SOBRE NOSOTROS
          </p>
          <h2 className="landing-serif mt-3 text-4xl text-[#78583c]">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {values.map(([icon, title, description]) => (
            <article
              key={title}
              className="rounded-xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm"
            >
              <span className="text-2xl" aria-hidden="true">
                {icon}
              </span>
              <h3 className="mt-2 font-semibold text-forest">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-[--muted]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
    <section
      id="servicios"
      className="scroll-mt-24 bg-[--background] px-5 py-20 md:px-16"
    >
      <div className="text-center">
        <p className="text-2xl text-[#715735]">❦</p>
        <h2 className="landing-serif mt-2 text-4xl text-[#78583c]">
          Terapia para cada etapa de tu vida
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[--muted]">
          Sesiones diseñadas para acompañarte en lo individual, en pareja o en
          familia.
        </p>
      </div>
      <div className="mx-auto mt-12 grid max-w-7xl gap-6 md:grid-cols-3">
        {services.map(({ icon, title, description, duration }) => (
          <article
            key={title}
            className="panel-card flex min-h-80 flex-col items-center p-8 text-center transition hover:-translate-y-1"
          >
            <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fef2e5] text-3xl text-[#715735]">
              {icon}
            </span>
            <h3 className="text-lg font-semibold text-[--foreground]">
              {title}
            </h3>
            <p className="mt-4 leading-7 text-[--muted]">{description}</p>
            <dl className="mt-auto w-full space-y-2 border-t border-[--border]/60 pt-5 text-left text-sm text-[--muted]">
              <div className="flex justify-between gap-3">
                <dt className="font-semibold text-forest">Duración</dt>
                <dd>{duration}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-semibold text-forest">Modalidad</dt>
                <dd>En línea o presencial</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-7 text-[--muted]">
        ¿No sabes cuál elegir? Escríbenos por WhatsApp y con gusto te
        orientamos.
      </p>
    </section>
  </>
);
