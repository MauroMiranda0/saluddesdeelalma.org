import { AdminAccessLink } from "../components/landing/admin-access-link";
import { ConsultorioInfo } from "../components/landing/consultorio-info";
import { Hero } from "../components/landing/hero";
import { WhatsAppCta } from "../components/landing/whatsapp-cta";
import { BrandLogo } from "../components/ui/brand-logo";

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
        <ConsultorioInfo />
        <section className="grid gap-10 bg-[#868564] px-6 py-20 text-[#fffaf0] md:grid-cols-3 md:px-16">
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
              className="text-center md:border-r md:border-[#e7e4be]/35 md:px-8 md:last:border-0"
            >
              <span
                className="mb-3 block text-2xl text-gold"
                aria-hidden="true"
              >
                ✦
              </span>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#f2e6d4]">{text}</p>
            </article>
          ))}
        </section>
        <section className="bg-[#fef2e5] px-6 py-20 text-center md:px-12">
          <h2 className="landing-serif text-4xl text-[#78583c]">Testimonios</h2>
          <blockquote className="landing-serif mx-auto mt-7 max-w-2xl text-2xl leading-9 text-[--foreground]">
            "Un espacio para volver a mí, con tranquilidad y propósito."
          </blockquote>
          <p className="mt-3 text-sm text-[--muted]">
            Atención psicológica integral
          </p>
        </section>
        <footer
          id="contacto"
          className="grid gap-7 bg-[#78583c] px-6 py-14 text-[#fff7e9] sm:grid-cols-2 md:grid-cols-3 md:px-16"
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
