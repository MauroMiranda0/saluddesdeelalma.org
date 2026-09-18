import { AdminAccessLink } from "../components/landing/admin-access-link";
import { ConsultorioInfo } from "../components/landing/consultorio-info";
import { Hero } from "../components/landing/hero";
import { WhatsAppCta } from "../components/landing/whatsapp-cta";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <div className="landing-frame">
        <header className="flex items-center justify-between gap-4 border-b border-sepia/20 px-2 py-4 sm:px-5">
          <a
            href="#inicio"
            className="flex items-center gap-2 text-[--foreground] no-underline"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-sepia/40 bg-[#fff9ef] font-serif text-xs italic text-sepia">
              SdA
            </span>
            <span className="hidden font-serif text-lg sm:block">
              Salud desde el Alma
            </span>
          </a>
          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-5 text-sm text-[#54493d] md:flex"
          >
            <a href="#nosotros" className="hover:text-sepia">
              Nosotros
            </a>
            <a href="#servicios" className="hover:text-sepia">
              Servicios
            </a>
            <a href="#contacto" className="hover:text-sepia">
              Contacto
            </a>
          </nav>
          <WhatsAppCta compact />
        </header>
        <Hero />
        <ConsultorioInfo />
        <section className="grid gap-6 bg-[#59633d] px-6 py-12 text-[#fffaf0] md:grid-cols-3 md:px-12">
          {[
            [
              "Enfoque integral",
              "Cuerpo, mente y espíritu en un espacio de escucha respetuosa."
            ],
            [
              "Atención cercana",
              "Acompañamiento profesional con calma, claridad y calidez."
            ],
            [
              "Crecimiento consciente",
              "Un proceso a su ritmo, orientado a su bienestar cotidiano."
            ]
          ].map(([title, text]) => (
            <article
              key={title}
              className="border-[#d9cbb3]/40 md:border-r md:px-6 md:last:border-0"
            >
              <span
                className="mb-3 block text-2xl text-gold"
                aria-hidden="true"
              >
                ✦
              </span>
              <h2 className="landing-serif text-xl">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#f2e6d4]">{text}</p>
            </article>
          ))}
        </section>
        <section className="bg-[#fffaf3] px-6 py-12 text-center md:px-12">
          <p className="text-sm uppercase tracking-[0.2em] text-sepia">
            Testimonios
          </p>
          <blockquote className="landing-serif mx-auto mt-4 max-w-2xl text-xl leading-8 text-[#514338]">
            "Un espacio para volver a mí, con tranquilidad y propósito."
          </blockquote>
          <p className="mt-3 text-sm text-[--muted]">
            Atención psicológica integral
          </p>
        </section>
        <footer
          id="contacto"
          className="grid gap-7 bg-[#88562e] px-6 py-10 text-[#fff7e9] sm:grid-cols-2 md:grid-cols-3 md:px-12"
        >
          <div>
            <p className="landing-serif text-xl">Salud desde el Alma</p>
            <p className="mt-2 text-sm">Tu bienestar, nuestro propósito.</p>
          </div>
          <div>
            <p className="font-semibold">Contacto</p>
            <p className="mt-2 text-sm">WhatsApp: 56 6095 0665</p>
            <p className="text-sm">Tel. 427 427 9168</p>
          </div>
          <div>
            <p className="font-semibold">Consultorio</p>
            <p className="mt-2 text-sm">
              Valle del Ciprés #148, Jardines del Valle, San Juan del Río,
              Querétaro.
            </p>
            <AdminAccessLink />
          </div>
        </footer>
      </div>
    </main>
  );
}
