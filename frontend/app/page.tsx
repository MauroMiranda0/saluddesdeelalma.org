import { AdminAccessLink } from "../components/landing/admin-access-link";
import { ConsultorioInfo } from "../components/landing/consultorio-info";
import { Hero } from "../components/landing/hero";
import { TestimonialsCarousel } from "../components/landing/testimonials-carousel";
import { WhatsAppCta } from "../components/landing/whatsapp-cta";
import { BrandLogo } from "../components/ui/brand-logo";

const challenges = [
  [
    "Siento que siempre atiendo las expectativas de los demás y me olvido de mí.",
    "La sobrecarga de querer agradar puede alejarte de tus deseos y de tu propia paz."
  ],
  [
    "Me cuesta poner límites y decir no sin sentir culpa.",
    "Establecer límites es una forma de cuidar tu salud mental y tus relaciones."
  ],
  [
    "La ansiedad y la autoexigencia no me dejan disfrutar el presente.",
    "Aprender a respirar, desacelerar y escucharte puede abrir un camino más amable."
  ],
  [
    "Busco claridad sobre quién soy y qué camino tiene sentido para mí.",
    "Comprender tus valores y tu historia permite tomar decisiones con mayor seguridad."
  ]
];

const bookingSteps = [
  [
    "01",
    "Escríbenos por WhatsApp",
    "Envíanos un mensaje al 56 6095 0665 y cuéntanos qué necesitas."
  ],
  [
    "02",
    "Te ofrecemos horarios disponibles",
    "Consultamos la agenda en tiempo real y te proponemos opciones concretas."
  ],
  [
    "03",
    "Confirma tu cita",
    "Elige día, hora y modalidad, en línea o presencial. Nosotros nos encargamos del resto."
  ],
  [
    "04",
    "Recibe tu recordatorio",
    "Te enviaremos un recordatorio el día previo para que no olvides tu sesión."
  ]
];

const testimonials: [string, string][] = [
  [
    "Alicia",
    "La terapia me ha ayudado a conocer a la persona que en realidad soy, con fortalezas y debilidades. Me ha ayudado a ser feliz, empática, a valorarme, cuidarme y quererme."
  ],
  [
    "Antoine",
    "Me ha ayudado con mis enojos y a soltar las cosas para no explotar."
  ],
  [
    "Lázaro",
    "Me ayudó a salir adelante y ver mi vida desde un ángulo diferente al que yo venía viviendo."
  ],
  [
    "Calixto",
    "Ahora manejo mejor mis situaciones de crisis, he estructurado mejores hábitos y mejorado mi forma de relacionarme con las personas."
  ],
  [
    "Alberto",
    "Me ayudó a trabajar integralmente con mis emociones, poner límites desde el respeto y mejorar mi relación familiar, laboral e individual."
  ]
];

const faqs = [
  [
    "¿Cómo agendo una cita?",
    "Escríbenos por WhatsApp al 56 6095 0665. Revisaremos la disponibilidad y te ofreceremos horarios concretos para tu sesión."
  ],
  [
    "¿Cuánto dura una sesión?",
    "Las sesiones individuales duran 60 minutos; las de pareja y familiares, 90 minutos."
  ],
  [
    "¿Puedo elegir entre sesión en línea o presencial?",
    "Sí. Ofrecemos ambas modalidades y tú eliges la que mejor se adapte a ti."
  ],
  [
    "¿Cómo puedo pagar?",
    "Aceptamos transferencia bancaria y efectivo el día de la sesión. Puedes optar por un anticipo del 50% para apartar tu cita."
  ],
  [
    "¿Qué pasa si necesito cancelar?",
    "Puedes cancelar o reagendar avisándonos con al menos 24 horas de anticipación."
  ],
  [
    "¿Mis datos están seguros?",
    "Tratamos tus datos con confidencialidad absoluta, cumpliendo con la normativa mexicana aplicable."
  ]
];

export default function HomePage() {
  return (
    <main className="landing-shell pt-20">
      <header className="fixed inset-x-0 top-0 z-30 bg-[#f3e7db]/90 shadow-[0_1px_8px_rgba(52,41,31,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between gap-4 px-5 md:px-8">
          <a href="#inicio" className="flex items-center gap-2.5 no-underline">
            <BrandLogo className="h-[70px] w-[70px] shadow-sm" priority />
            <span className="hidden text-xl font-semibold italic text-[#7e5d41] sm:block">
              Salud desde el Alma
            </span>
          </a>
          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-9 text-base font-medium text-[#66594d] md:flex"
          >
            <a className="transition hover:text-[#7e5d41]" href="#nosotros">
              Nosotros
            </a>
            <a className="transition hover:text-[#7e5d41]" href="#servicios">
              Servicios
            </a>
            <a className="transition hover:text-[#7e5d41]" href="#testimonios">
              Testimonios
            </a>
          </nav>
          <WhatsAppCta compact />
        </div>
      </header>

      <Hero />

      <section
        className="overflow-hidden bg-[#868564] py-4 text-white"
        aria-label="Valores de atención"
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-center gap-5 px-5 text-center text-xs font-semibold uppercase tracking-[0.14em] sm:gap-8 md:px-8">
          <span>Autoconocimiento</span>
          <span
            className="h-1.5 w-1.5 rounded-full bg-white/70"
            aria-hidden="true"
          />
          <span>Atención ética</span>
          <span
            className="h-1.5 w-1.5 rounded-full bg-white/70"
            aria-hidden="true"
          />
          <span className="hidden sm:inline">Equilibrio emocional</span>
          <span
            className="hidden h-1.5 w-1.5 rounded-full bg-white/70 sm:inline"
            aria-hidden="true"
          />
          <span className="hidden md:inline">Confidencialidad</span>
        </div>
      </section>

      <section
        id="desafios"
        className="scroll-mt-20 bg-[#f3e7db] px-5 py-20 md:px-8"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.12em] text-[#7e5d41]">
              | DESAFÍOS
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#7e5d41] md:text-4xl">
              ¿Te has sentido así?
            </h2>
            <p className="mt-4 leading-7 text-[--muted]">
              Los momentos de transición, sobrecarga e incertidumbre forman
              parte de la vida, pero no tienes que atravesarlos a solas.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-[900px] gap-6 md:grid-cols-2">
            {challenges.map(([quote, description]) => (
              <article
                key={quote}
                className="group relative rounded-[15px] bg-[#cfc7ab]/55 py-7 pl-12 pr-7 shadow-[0_4px_20px_rgba(52,41,31,0.03)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(52,41,31,0.06)]"
              >
                <span
                  className="absolute left-6 top-8 h-8 w-2 rounded-full bg-[#7e5d41] transition-colors group-hover:bg-[#868564]"
                  aria-hidden="true"
                />
                <p className="text-base font-semibold italic leading-snug text-[#7e5d41]">
                  &ldquo;{quote}&rdquo;
                </p>
                <p className="mt-3 text-sm leading-6 text-[--muted]">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ConsultorioInfo />

      <section
        id="proceso"
        className="relative isolate scroll-mt-20 overflow-hidden bg-[#f3e7db] px-5 py-20 md:px-8"
      >
        <div
          className="absolute -left-24 bottom-0 -z-10 h-64 w-64 rounded-full bg-[#e8c59a]/45 blur-3xl"
          aria-hidden="true"
        />
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[minmax(0,.65fr)_minmax(0,1.35fr)] lg:items-center">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.12em] text-[#7e5d41]">
              | PROCESO DE AGENDAMIENTO
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#7e5d41] md:text-4xl">
              Agendar tu cita es muy sencillo
            </h2>
            <p className="mt-4 leading-7 text-[--muted]">
              Un proceso claro para que tu primer contacto se sienta seguro y
              sin presiones.
            </p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2">
            {bookingSteps.map(([number, title, text]) => (
              <li
                key={number}
                className="relative overflow-hidden rounded-[20px] border border-[#7e5d41]/20 bg-[#f3e7db]/90 p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#868564] text-sm font-semibold tracking-[0.08em] text-white shadow-sm">
                  {number}
                </span>
                <h3 className="mt-4 text-base font-semibold text-[#7e5d41]">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#34291f]">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="testimonios"
        className="scroll-mt-20 bg-[#f3e7db] px-5 py-20 md:px-8"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.12em] text-[#7e5d41]">
              | TESTIMONIOS
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#7e5d41] md:text-4xl">
              Historias de quienes decidieron dar el primer paso
            </h2>
            <p className="mt-4 leading-7 text-[#66594d]">
              Experiencias reales de personas que encontraron un espacio para
              escucharse y avanzar a su propio ritmo.
            </p>
          </div>
          <TestimonialsCarousel testimonials={testimonials} />
        </div>
      </section>

      <section
        id="preguntas-frecuentes"
        className="scroll-mt-20 bg-[#f3e7db] px-5 py-20 md:px-8"
      >
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-[#7e5d41]">
              | INFORMACIÓN PRÁCTICA
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#7e5d41] md:text-4xl">
              Preguntas frecuentes
            </h2>
            <p className="mt-5 max-w-md leading-7 text-[--muted]">
              Encuentra información clara sobre modalidades, pagos, agendamiento
              y el cuidado de tus datos.
            </p>
          </div>
          <div className="divide-y divide-[#d6c9b8] border-y border-[#d6c9b8]">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-semibold text-[#7e5d41] marker:content-none">
                  {question}
                  <span
                    className="text-xl transition group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="pr-8 pt-4 text-sm leading-7 text-[--muted]">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        id="contacto"
        className="scroll-mt-20 bg-[#f3e7db] px-5 pb-20 md:px-8"
      >
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[20px] bg-[#cfc7ab]/65 px-6 py-12 shadow-[0_8px_30px_rgba(52,41,31,0.04)] md:px-12 md:py-16">
          <div
            className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#e8c59a]/75 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.75fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-[#7e5d41]">
                | DÉ EL PRIMER PASO
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-[#7e5d41] md:text-4xl">
                Estamos aquí para escucharte
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-[--muted]">
                Agenda por WhatsApp y recibe una atención cálida, clara y
                respetuosa desde el primer mensaje.
              </p>
              <div className="mt-8">
                <WhatsAppCta label="Enviar mensaje por WhatsApp" />
              </div>
              <p className="mt-5 text-xs text-[#66594d]">
                Tu información se trata con confidencialidad y respeto.
              </p>
            </div>
            <address className="not-italic">
              <dl className="divide-y divide-[#d6c9b8] rounded-[15px] bg-white shadow-[0_4px_16px_rgba(52,41,31,0.04)]">
                <div className="p-6">
                  <dt className="text-xs font-semibold tracking-[0.1em] text-[#7e5d41]">
                    DIRECCIÓN
                  </dt>
                  <dd className="mt-2 text-sm leading-6 text-[--muted]">
                    Valle del Ciprés #148, Jardines del Valle, San Juan del Río,
                    Querétaro
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-4 p-6">
                  <div>
                    <dt className="text-xs font-semibold tracking-[0.1em] text-[#7e5d41]">
                      WHATSAPP
                    </dt>
                    <dd className="mt-2 text-sm text-[--muted]">
                      56 6095 0665
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-[0.1em] text-[#7e5d41]">
                      TELÉFONO
                    </dt>
                    <dd className="mt-2 text-sm text-[--muted]">
                      427 427 9168
                    </dd>
                  </div>
                </div>
                <div className="p-6">
                  <dt className="text-xs font-semibold tracking-[0.1em] text-[#7e5d41]">
                    HORARIO DE ATENCIÓN
                  </dt>
                  <dd className="mt-2 text-sm text-[--muted]">9:00 a 21:00</dd>
                </div>
              </dl>
            </address>
          </div>
        </div>
      </section>

      <footer className="bg-[#cfc7ab]/55 px-5 py-16 md:px-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-3">
                <BrandLogo className="h-[85px] w-[85px] shadow-sm" />
                <p className="text-2xl font-semibold italic text-[#7e5d41]">
                  Salud desde el Alma
                </p>
              </div>
              <p className="mt-4 max-w-sm text-base leading-7 text-[--muted]">
                Psicología integral para cuerpo, mente y espíritu. Tu bienestar,
                nuestro propósito.
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[#7e5d41]">Navegación</p>
              <nav
                aria-label="Enlaces del pie de página"
                className="mt-5 grid gap-3 text-base text-[--muted]"
              >
                <a className="transition hover:text-[#7e5d41]" href="#nosotros">
                  Sobre nosotros
                </a>
                <a
                  className="transition hover:text-[#7e5d41]"
                  href="#servicios"
                >
                  Servicios
                </a>
                <a
                  className="transition hover:text-[#7e5d41]"
                  href="#preguntas-frecuentes"
                >
                  Preguntas frecuentes
                </a>
                <a className="transition hover:text-[#7e5d41]" href="#contacto">
                  Contacto
                </a>
              </nav>
            </div>
            <div>
              <p className="text-lg font-semibold text-[#7e5d41]">
                Acompañamiento
              </p>
              <p className="mt-5 text-base leading-7 text-[--muted]">
                En caso de una crisis o urgencia emocional, busca atención
                inmediata en los servicios de emergencia de tu localidad.
              </p>
              <AdminAccessLink />
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-2 border-t border-[#7e5d41]/20 pt-6 text-sm text-[--muted] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Salud desde el Alma. Todos los derechos reservados.</p>
            <p className="font-semibold uppercase tracking-[0.08em]">
              Atención ética y confidencial
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
