const services = [
  [
    "◯",
    "Terapia Individual",
    "Un espacio confidencial para explorar sus emociones y encontrar bienestar emocional."
  ],
  [
    "❦",
    "Terapias de Relajación",
    "Técnicas para reducir el estrés y reconectar con su paz interior."
  ],
  [
    "✦",
    "Talleres y Cursos",
    "Sesiones grupales para crecimiento personal y desarrollo de habilidades emocionales."
  ]
];

const MEDITATION_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDqpgx05bEEbItyzJLxIg6gxCYa4Xmn53nsHzx5JD3X1ZPJhnQ3poQ5SXbrB0CLQNHsjgT-frid9QGMA-CE04n6Wev6QeTNd5OvZIG3x5tDOJNDbzPPZJqLe15sMBwxU9YH-wtZRdAjqQ4ZO5Oei4Wun2wrypngyuKcGHkU2ejJDRl5XkD3-RxXPfZPOeh_evHhCRn_7ZKfU9eRQyZyGoJ_BpVINSpETNqkN9v92iGUMkzpYT922PNQ";

export const ConsultorioInfo = () => (
  <>
    <section id="servicios" className="bg-[--background] px-5 py-20 md:px-16">
      <div className="text-center">
        <p className="text-2xl text-[#715735]">❦</p>
        <h2 className="landing-serif mt-2 text-4xl text-[#78583c]">
          Nuestros Servicios
        </h2>
      </div>
      <div className="mx-auto mt-12 grid max-w-7xl gap-6 md:grid-cols-3">
        {services.map(([icon, title, description]) => (
          <article
            key={title}
            className="panel-card flex min-h-72 flex-col items-center p-8 text-center transition hover:-translate-y-1"
          >
            <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fef2e5] text-3xl text-[#715735]">
              {icon}
            </span>
            <h3 className="text-lg font-semibold text-[--foreground]">
              {title}
            </h3>
            <p className="mt-4 leading-7 text-[--muted]">{description}</p>
            <span className="mt-auto pt-5 text-sm font-semibold text-forest">
              Saber más →
            </span>
          </article>
        ))}
      </div>
    </section>
    <section
      id="nosotros"
      className="relative min-h-130 bg-[#ece1d5] bg-cover bg-center px-5 py-16 md:px-16"
      style={{
        backgroundImage: `linear-gradient(90deg, rgb(255 248 243 / 94%), rgb(255 248 243 / 25%)), url(${MEDITATION_IMAGE})`
      }}
    >
      <article className="panel-card mx-auto max-w-xl p-8 md:ml-[10%] md:p-10">
        <h2 className="landing-serif text-4xl text-[#78583c]">
          Un espacio para su bienestar integral
        </h2>
        <p className="mt-5 text-lg leading-8 text-[--muted]">
          Le acompañamos a alcanzar su paz interior con un enfoque holístico,
          seguro y confidencial.
        </p>
        <p className="mt-5 text-sm text-[--muted]">
          Atención en línea y presencial, con previa cita.
        </p>
      </article>
    </section>
  </>
);
