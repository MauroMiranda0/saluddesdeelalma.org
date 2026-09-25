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
    description:
      "Sanen heridas, mejoren sus relaciones y crezcan como familia.",
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
  ["✨", "Fe que sostiene", "Un enfoque que integra cuerpo, mente y espíritu."],
  ["🌍", "Comunidad y compañerismo", "No caminas solo; caminamos contigo."]
];

const MEDITATION_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDqpgx05bEEbItyzJLxIg6gxCYa4Xmn53nsHzx5JD3X1ZPJhnQ3poQ5SXbrB0CLQNHsjgT-frid9QGMA-CE04n6Wev6QeTNd5OvZIG3x5tDOJNDbzPPZJqLe15sMBwxU9YH-wtZRdAjqQ4ZO5Oei4Wun2wrypngyuKcGHkU2ejJDRl5XkD3-RxXPfZPOeh_evHhCRn_7ZKfU9eRQyZyGoJ_BpVINSpETNqkN9v92iGUMkzpYT922PNQ";

export const ConsultorioInfo = () => (
  <>
    <section
      id="nosotros"
      className="relative bg-[#cfc7ab]/55 bg-cover bg-center px-5 py-20 md:px-8"
      style={{
        backgroundImage: `linear-gradient(90deg, rgb(243 231 219 / 96%), rgb(243 231 219 / 66%)), url(${MEDITATION_IMAGE})`
      }}
    >
      <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(24rem,.9fr)] lg:items-start">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {values.map(([icon, title, description]) => (
            <article
              key={title}
              className="rounded-[15px] bg-white/90 p-5 shadow-[0_4px_16px_rgba(52,41,31,0.04)] backdrop-blur-sm"
            >
              <span className="text-2xl" aria-hidden="true">
                {icon}
              </span>
              <h3 className="mt-2 font-semibold text-[#7e5d41]">{title}</h3>
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
            className="flex min-h-80 flex-col rounded-[15px] bg-white p-7 text-left text-[--foreground] shadow-[0_10px_30px_rgba(52,41,31,0.12)] transition duration-300 hover:-translate-y-1"
          >
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#7e5d41] text-2xl text-white">
              {icon}
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#868564]">
              En linea o presencial
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[#7e5d41]">
              {title}
            </h3>
            <p className="mt-4 leading-7 text-[--muted]">{description}</p>
            <dl className="-mx-7 -mb-7 mt-auto space-y-2 rounded-b-[15px] bg-[#cfc7ab]/45 p-7 text-sm text-[--muted]">
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
