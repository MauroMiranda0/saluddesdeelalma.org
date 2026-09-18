const services = [
  [
    "Terapia individual",
    "Un espacio seguro para comprender y acompañar su proceso."
  ],
  [
    "Terapia de pareja",
    "Comunicación y herramientas para construir vínculos conscientes."
  ],
  [
    "Terapia familiar",
    "Orientación para fortalecer el diálogo y el bienestar compartido."
  ]
];

export const ConsultorioInfo = () => {
  return (
    <>
      <section id="servicios" className="bg-[#fffaf3] px-6 py-12 md:px-12">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-sepia">
            Nuestros servicios
          </p>
          <h2 className="landing-serif mt-2 text-3xl text-[#463d31]">
            Acompañamiento a su medida
          </h2>
        </div>
        <div className="mt-9 grid gap-6 md:grid-cols-3">
          {services.map(([title, description]) => (
            <article
              key={title}
              className="border-l border-sepia/30 px-5 text-center first:border-l-0"
            >
              <span className="text-3xl text-sepia" aria-hidden="true">
                ◒
              </span>
              <h3 className="landing-serif mt-3 text-xl text-[#463d31]">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#66594e]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section id="nosotros" className="grid bg-[#eee0ce] md:grid-cols-2">
        <div
          className="min-h-72 bg-[linear-gradient(150deg,#c69867,#755234)]"
          aria-hidden="true"
        />
        <article className="flex flex-col justify-center px-7 py-12 md:px-12">
          <p className="text-sm uppercase tracking-[0.2em] text-sepia">
            Un espacio para usted
          </p>
          <h2 className="landing-serif mt-3 text-3xl text-[#463d31]">
            Bienestar integral
          </h2>
          <p className="mt-5 max-w-md leading-7 text-[#5f5144]">
            En Salud desde el Alma le acompañamos a encontrar un espacio para su
            bienestar, serenidad y crecimiento.
          </p>
          <p className="mt-4 text-sm text-[#5f5144]">
            Atención en línea y presencial, con previa cita.
          </p>
        </article>
      </section>
    </>
  );
};
