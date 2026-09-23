import { AdminAccessLink } from "../components/landing/admin-access-link";
import { ConsultorioInfo } from "../components/landing/consultorio-info";
import { Hero } from "../components/landing/hero";
import { WhatsAppCta } from "../components/landing/whatsapp-cta";
import { BrandLogo } from "../components/ui/brand-logo";

const trustItems = [
  ["🌿", "Atención cálida y sin prisas"],
  ["💬", "Agendamiento directo por WhatsApp"],
  ["🔒", "Confidencialidad garantizada"],
  ["📱", "Recordatorios automáticos de tus sesiones"]
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
    "Elige día, hora y modalidad (en línea o presencial). Nosotros nos encargamos del resto."
  ],
  [
    "04",
    "Recibe tu recordatorio",
    "Te enviaremos un recordatorio el día previo para que no olvides tu sesión."
  ]
];

const testimonials = [
  [
    "Alicia",
    "La terapia me ha ayudado a conocer a la persona que en realidad soy, con fortalezas y debilidades. A entender que todos actuamos desde nuestras heridas o carencias, pero no siempre con el deseo de dañar. Me ha ayudado a ser feliz, a ser empática, a valorarme, cuidarme y, sobre todo, quererme. Aceptar que somos seres imperfectos con la posibilidad de mejorar, y poder disfrutar de lo hermoso que es la vida."
  ],
  ["Antoine", "Me ha ayudado con mis enojos y a soltar las cosas para no explotar."],
  [
    "Lázaro",
    "Me ayudó a salir adelante y ver mi vida desde un ángulo diferente al que yo venía viviendo."
  ],
  [
    "Calixto",
    "Empecé la terapia por síntomas de ansiedad y mal manejo del estrés. Ha mejorado mi salud en general porque ahora manejo mejor mis situaciones de crisis y el daño físico es menor. Además, he estructurado mejores hábitos y mantenido disciplina. También ha mejorado la forma en la que me relaciono con las personas."
  ],
  [
    "Alberto",
    "Ir a terapia con Gina me cambió mi mundo. Anteriormente había estado con diferentes terapeutas, pero aquí encontré todo lo que necesitaba y más. Me hizo trabajar de forma integral con mis emociones, ver mis heridas desde otro ángulo y buscar el aprendizaje de todo. Me ayudó a mejorar mi relación familiar, laboral e individual, a poner límites desde el respeto, e incluso me ayudó con la parte espiritual. Definitivamente fue la mejor decisión de mi vida."
  ]
];

const faqs = [
  [
    "¿Cómo agendo una cita?",
    "Escríbenos por WhatsApp al 56 6095 0665. Nuestro asistente te saludará, revisará la disponibilidad en tiempo real y te ofrecerá horarios concretos para tu sesión."
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
    "Aceptamos transferencia bancaria y efectivo el día de la sesión. Puedes optar por un anticipo del 50% para apartar tu cita o pagar el total el día de la sesión."
  ],
  [
    "¿Qué pasa si necesito cancelar?",
    "Puedes cancelar o reagendar avisándonos con al menos 24 horas de anticipación. Si cancelas con menos tiempo, se considera cancelación tardía y podría aplicar un costo adicional."
  ],
  [
    "¿Los recordatorios son automáticos?",
    "Sí. Te enviaremos un recordatorio por WhatsApp el día previo a tu sesión, entre las 6:00 y 7:00 de la tarde."
  ],
  [
    "¿Mis datos están seguros?",
    "Absolutamente. Tratamos tus datos con confidencialidad absoluta, cumpliendo estándares de privacidad en datos de salud y la normativa mexicana aplicable (LFPDPPP)."
  ],
  [
    "¿Atienden a personas que nunca han ido a terapia?",
    "Por supuesto. Te recibimos con calidez y sin juicios, en el punto en el que estés."
  ]
];

export default function HomePage() {
  return (
    <main className="landing-shell">
      <div className="landing-frame">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[--border]/30 bg-[#fff8f3]/85 px-3 py-4 backdrop-blur-md sm:px-6">
          <a
            href="#inicio"
            className="flex items-center gap-2 text-[--foreground] no-underline"
          >
            <BrandLogo className="h-12 w-12 shadow-sm" priority />
            <span className="hidden font-serif text-2xl text-[#78583c] sm:block">
              Salud desde el Alma
            </span>
          </a>
          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-6 text-sm font-semibold text-[--muted] md:flex"
          >
            <a href="#nosotros" className="hover:text-sepia">
              Nosotros
            </a>
            <a href="#servicios" className="hover:text-forest">
              Servicios
            </a>
            <a href="#contacto" className="hover:text-forest">
              Contacto
            </a>
          </nav>
          <WhatsAppCta compact />
        </header>
        <Hero />
        <section
          aria-label="Compromisos de atención"
          className="bg-[#3c5a44] px-5 py-7 text-[#fffaf0] md:px-16"
        >
          <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-xl" aria-hidden="true">
                  {icon}
                </span>
                <p className="text-sm font-semibold leading-5">{text}</p>
              </div>
            ))}
          </div>
        </section>
        <ConsultorioInfo />
        <section
          id="proceso"
          className="scroll-mt-24 bg-[#3c5a44] px-5 py-20 text-[#fffaf0] md:px-16"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold tracking-[0.18em] text-[#d9cbb3]">
                PROCESO DE AGENDAMIENTO
              </p>
              <h2 className="landing-serif mt-3 text-4xl">
                Agendar tu cita es muy sencillo
              </h2>
            </div>
            <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {bookingSteps.map(([number, title, text]) => (
                <li
                  key={number}
                  className="rounded-xl border border-white/20 bg-white/8 p-6"
                >
                  <span className="font-serif text-3xl text-[#c2a878]">{number}</span>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#e5eadf]">{text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10">
              <WhatsAppCta label="Agenda ahora por WhatsApp" />
            </div>
          </div>
        </section>
        <section
          id="testimonios"
          className="scroll-mt-24 bg-[#fef2e5] px-5 py-20 md:px-16"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold tracking-[0.18em] text-sepia">
                TESTIMONIOS
              </p>
              <h2 className="landing-serif mt-3 text-4xl text-[#78583c]">
                Lo que dicen quienes han caminado con nosotros
              </h2>
              <p className="mt-4 text-[--muted]">
                Historias reales de personas que decidieron dar el primer paso.
              </p>
            </div>
            <div className="mt-12 columns-1 gap-6 md:columns-2 lg:columns-3">
              {testimonials.map(([name, quote]) => (
                <figure
                  key={name}
                  className="panel-card mb-6 break-inside-avoid p-7"
                >
                  <blockquote className="text-sm leading-7 text-[--muted]">
                    "{quote}"
                  </blockquote>
                  <figcaption className="mt-5 font-semibold text-forest">
                    {name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
        <section
          id="preguntas-frecuentes"
          className="scroll-mt-24 bg-[--background] px-5 py-20 md:px-16"
        >
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]">
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-sepia">
                INFORMACIÓN PRÁCTICA
              </p>
              <h2 className="landing-serif mt-3 text-4xl text-[#78583c]">
                Preguntas frecuentes
              </h2>
              <p className="mt-5 max-w-md leading-7 text-[--muted]">
                Encuentra información clara sobre modalidades, pagos,
                agendamiento y el cuidado de tus datos.
              </p>
            </div>
            <div className="divide-y divide-[--border]/70 border-y border-[--border]/70">
              {faqs.map(([question, answer]) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-semibold text-forest marker:content-none">
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
        <section className="bg-[#d9cbb3] px-5 py-20 text-center md:px-16">
          <div className="mx-auto max-w-3xl">
            <p className="landing-serif text-3xl leading-10 text-[#3c5a44] md:text-4xl">
              "Creemos que cada persona está aquí con un propósito extraordinario
              y el nuestro es ayudarte a encontrarlo."
            </p>
            <p className="mt-6 text-[--muted]">
              Da el primer paso hoy. Agenda tu cita por WhatsApp.
            </p>
            <div className="mt-8">
              <WhatsAppCta label="Agenda tu cita por WhatsApp" />
            </div>
          </div>
        </section>
        <section
          id="contacto"
          className="scroll-mt-24 bg-[#fef2e5] px-5 py-20 md:px-16"
        >
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.8fr)] lg:items-center">
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-sepia">
                CONTACTO
              </p>
              <h2 className="landing-serif mt-3 text-4xl text-[#78583c]">
                Estamos aquí para ti
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-[--muted]">
                Agenda por WhatsApp y recibe una atención cálida, clara y
                respetuosa desde el primer mensaje.
              </p>
              <div className="mt-8">
                <WhatsAppCta label="Enviar mensaje por WhatsApp" />
              </div>
            </div>
            <address className="panel-card not-italic">
              <dl className="divide-y divide-[--border]/60">
                <div className="p-6">
                  <dt className="text-xs font-semibold tracking-[0.12em] text-sepia">
                    DIRECCIÓN
                  </dt>
                  <dd className="mt-2 text-sm leading-7 text-[--muted]">
                    Valle del Ciprés #148, Jardines del Valle, San Juan del Río,
                    Querétaro
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-4 p-6">
                  <div>
                    <dt className="text-xs font-semibold tracking-[0.12em] text-sepia">
                      WHATSAPP
                    </dt>
                    <dd className="mt-2 text-sm text-[--muted]">56 6095 0665</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-[0.12em] text-sepia">
                      TELÉFONO
                    </dt>
                    <dd className="mt-2 text-sm text-[--muted]">427 427 9168</dd>
                  </div>
                </div>
                <div className="p-6">
                  <dt className="text-xs font-semibold tracking-[0.12em] text-sepia">
                    HORARIO DE ATENCIÓN
                  </dt>
                  <dd className="mt-2 text-sm text-[--muted]">9:00 a 21:00</dd>
                </div>
              </dl>
            </address>
          </div>
        </section>
        <footer
          className="bg-[#3c5a44] px-6 py-14 text-white md:px-16"
        >
          <div className="mx-auto grid max-w-7xl gap-9 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-3">
                <BrandLogo className="h-12 w-12 border border-white/60" />
                <p className="landing-serif text-2xl text-white">Salud desde el Alma</p>
              </div>
              <p className="mt-3 text-sm text-[#f5ead7]">
                "Tu bienestar, nuestro propósito"
              </p>
            </div>
            <div>
              <p className="font-semibold text-white">Enlaces rápidos</p>
              <nav aria-label="Enlaces del pie de página" className="mt-3 grid gap-2 text-sm">
                <a href="#nosotros" className="!text-white hover:!text-[#d9cbb3]">
                  Sobre nosotros
                </a>
                <a href="#servicios" className="!text-white hover:!text-[#d9cbb3]">
                  Servicios
                </a>
                <a href="#testimonios" className="!text-white hover:!text-[#d9cbb3]">
                  Testimonios
                </a>
                <a href="#preguntas-frecuentes" className="!text-white hover:!text-[#d9cbb3]">
                  Preguntas frecuentes
                </a>
                <a href="#contacto" className="!text-white hover:!text-[#d9cbb3]">
                  Contacto
                </a>
              </nav>
            </div>
            <div>
              <p className="font-semibold text-white">Contacto</p>
              <p className="mt-3 text-sm text-[#f5ead7]">WhatsApp: 56 6095 0665</p>
              <p className="text-sm text-[#f5ead7]">Tel. 427 427 9168</p>
              <p className="mt-5 font-semibold text-white">Redes sociales</p>
              <p className="mt-2 text-sm text-[#f5ead7]">Facebook · Instagram</p>
            </div>
            <div>
              <p className="font-semibold text-white">Consultorio</p>
              <p className="mt-3 text-sm leading-6 text-[#f5ead7]">
                Valle del Ciprés #148, Jardines del Valle, San Juan del Río,
                Querétaro.
              </p>
              <AdminAccessLink />
              <p className="mt-2 text-xs text-[#f5ead7]">Solo para el equipo</p>
            </div>
          </div>
          <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-white/40 pt-6 text-xs text-[#f5ead7] sm:flex-row sm:justify-between">
            <p>© 2026 Salud desde el Alma. Todos los derechos reservados.</p>
            <p>Aviso de privacidad · Términos y condiciones</p>
          </div>
        </footer>
        <WhatsAppCta
          label="¿Necesitas ayuda? Escríbenos 😊"
          className="fixed bottom-5 right-5 z-40 max-w-64 rounded-full px-4 py-3 text-center shadow-lg md:bottom-8 md:right-8"
        />
      </div>
    </main>
  );
}
