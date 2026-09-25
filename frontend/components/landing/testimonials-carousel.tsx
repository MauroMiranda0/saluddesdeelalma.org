"use client";

import { useLayoutEffect, useRef, useState } from "react";

type TestimonialsCarouselProps = {
  testimonials: readonly (readonly [string, string])[];
};

export const TestimonialsCarousel = ({
  testimonials
}: TestimonialsCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideHeight, setSlideHeight] = useState<number>();
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const total = testimonials.length;

  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + total) % total);
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % total);
  };

  useLayoutEffect(() => {
    const activeSlide = slideRefs.current[activeIndex];

    if (!activeSlide) {
      return;
    }

    const updateHeight = () => {
      setSlideHeight(activeSlide.getBoundingClientRect().height);
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(activeSlide);

    return () => resizeObserver.disconnect();
  }, [activeIndex]);

  if (total === 0) {
    return null;
  }

  return (
    <div className="mx-auto mt-12 max-w-4xl">
      <div
        className="overflow-hidden rounded-[20px] transition-[height] duration-300 ease-out motion-reduce:transition-none"
        style={{ height: slideHeight }}
      >
        <div
          className="flex items-start transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {testimonials.map(([name, quote], index) => (
            <figure
              key={name}
              ref={(element) => {
                slideRefs.current[index] = element;
              }}
              className="w-full shrink-0 bg-white px-7 py-10 text-center shadow-[0_12px_30px_rgba(52,41,31,0.12)] sm:px-12 sm:py-14"
            >
              <blockquote className="mx-auto max-w-2xl text-lg font-medium leading-8 text-[#34291f] sm:text-xl sm:leading-9">
                &ldquo;{quote}&rdquo;
              </blockquote>
              <figcaption className="mt-8 text-sm font-semibold text-[#7e5d41]">
                {name}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={showPrevious}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#7e5d41]/35 text-lg text-[#7e5d41] transition hover:bg-[#cfc7ab]/55"
          aria-label="Ver testimonio anterior"
        >
          &larr;
        </button>
        <div
          className="flex items-center gap-2"
          aria-label="Selector de testimonios"
        >
          {testimonials.map(([name], index) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === activeIndex
                  ? "w-7 bg-[#7e5d41]"
                  : "w-2.5 bg-[#cfc7ab] hover:bg-[#868564]"
              }`}
              aria-label={`Ver testimonio de ${name}`}
              aria-current={index === activeIndex ? "true" : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={showNext}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#7e5d41]/35 text-lg text-[#7e5d41] transition hover:bg-[#cfc7ab]/55"
          aria-label="Ver siguiente testimonio"
        >
          &rarr;
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-[#66594d]">
        {activeIndex + 1} de {total}
      </p>
    </div>
  );
};
