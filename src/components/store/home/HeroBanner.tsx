"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";

interface HeroBannerProps {
  eyebrow?: string;
  slides?: Array<{
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    imageUrl?: string;
  }>;
  sideCards?: Array<{
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    imageUrl?: string;
  }>;
  autoplayMs?: number;
}

function renderFlippingTitleWords(title: string, isActive: boolean) {
  const lines = title.split("\n");
  let wordIndex = 0;

  return lines.map((line, lineIndex) => {
    const words = line.trim().split(/\s+/).filter(Boolean);

    return (
      <span key={`hero-title-line-${lineIndex}`} className="block">
        {words.map((word, index) => {
          const currentWordIndex = wordIndex;
          wordIndex += 1;
          return (
            <span
              key={`hero-title-word-${lineIndex}-${currentWordIndex}`}
              className={`hero-flip-word ${isActive ? "hero-flip-word-active" : ""}`}
              style={{
                animationDelay: isActive ? `${currentWordIndex * 70}ms` : "0ms",
                marginRight: index === words.length - 1 ? "0" : "0.22em",
              }}
            >
              {word}
            </span>
          );
        })}
      </span>
    );
  });
}

export function HeroBanner({
  eyebrow,
  slides,
  sideCards,
  autoplayMs = 4200,
}: HeroBannerProps) {
  const cards = sideCards ?? [];

  const computedSlides = useMemo(() => (Array.isArray(slides) ? slides : []), [slides]);

  const [activeSlide, setActiveSlide] = useState(0);
  const [animationCycle, setAnimationCycle] = useState(0);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (computedSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % computedSlides.length);
    }, autoplayMs);
    return () => window.clearInterval(timer);
  }, [computedSlides.length, autoplayMs]);

  useEffect(() => {
    setActiveSlide((current) => {
      if (computedSlides.length <= 0) return 0;
      if (current < computedSlides.length) return current;
      return computedSlides.length - 1;
    });
  }, [computedSlides.length]);

  useEffect(() => {
    setAnimationCycle((current) => current + 1);
  }, [activeSlide]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStartX(event.clientX);
    setDragDeltaX(0);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || dragStartX === null) return;
    setDragDeltaX(event.clientX - dragStartX);
  };

  const onPointerEnd = () => {
    if (!isDragging) return;
    const threshold = 60;
    if (dragDeltaX > threshold) {
      setActiveSlide((current) => (current - 1 + computedSlides.length) % computedSlides.length);
    } else if (dragDeltaX < -threshold) {
      setActiveSlide((current) => (current + 1) % computedSlides.length);
    }
    setIsDragging(false);
    setDragStartX(null);
    setDragDeltaX(0);
  };

  if (!computedSlides.length) {
    return null;
  }

  return (
    <section className="mt-0">
      <div className={`grid gap-1 md:gap-2 ${cards.length ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""}`}>
        <div
          className="relative overflow-hidden rounded-none border border-zinc-200 bg-[#f2f2f2] sm:rounded-md"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
        >
          <button
            aria-label="Previous slide"
            onClick={() => setActiveSlide((current) => (current - 1 + computedSlides.length) % computedSlides.length)}
            className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-zinc-300 bg-white/95 px-2 py-1 text-zinc-600 shadow-sm hover:bg-white md:inline-flex md:left-3 md:px-2.5 md:py-1.5"
          >
            ‹
          </button>
          <button
            aria-label="Next slide"
            onClick={() => setActiveSlide((current) => (current + 1) % computedSlides.length)}
            className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-zinc-300 bg-white/95 px-2 py-1 text-zinc-600 shadow-sm hover:bg-white md:inline-flex md:right-3 md:px-2.5 md:py-1.5"
          >
            ›
          </button>

          <div
            className="flex transition-transform duration-700 ease-out"
            style={{
              transform: `translateX(calc(-${activeSlide * 100}% + ${dragDeltaX}px))`,
              transitionDuration: isDragging ? "0ms" : "700ms",
            }}
          >
            {computedSlides.map((slide, index) => {
              const isActive = activeSlide === index;
              const textAnimationKey = isActive ? `hero-text-${index}-${animationCycle}` : `hero-text-${index}`;
              const imageAnimationKey = isActive ? `hero-image-${index}-${animationCycle}` : `hero-image-${index}`;
              return (
                <div
                  key={`${slide.title}-${index}`}
                  className="relative w-full shrink-0 flex-none bg-[linear-gradient(120deg,#f8f8f8_0%,#f3f3f3_45%,#f0f0f0_100%)] min-h-[184px] sm:min-h-[220px] md:min-h-[390px]"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.7),rgba(255,255,255,0)_55%)]" />
                  <div className="relative grid min-h-[184px] grid-cols-2 items-center sm:min-h-[220px] md:min-h-[390px] md:grid-cols-[1fr_1.3fr]">
                    <div className="flex h-full flex-col justify-center px-2.5 py-2 sm:px-3.5 sm:py-3 md:px-8 md:py-8">
                      <div
                        key={textAnimationKey}
                        className={`transition-all duration-700 ease-out ${
                          isActive ? "hero-slide-text-enter translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                        }`}
                      >
                        {eyebrow ? (
                          <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-zinc-500/80 sm:text-[8px] md:text-[10px]">
                            {eyebrow}
                          </p>
                        ) : null}
                        <h1 className="mt-0.5 max-w-[150px] whitespace-pre-line text-[clamp(12px,4.2vw,19px)] font-light uppercase leading-[0.98] tracking-[-0.01em] text-zinc-900 sm:mt-1 sm:max-w-[180px] sm:text-[clamp(14px,4.5vw,22px)] md:max-w-[430px] md:text-[clamp(30px,4.2vw,56px)]">
                          {renderFlippingTitleWords(slide.title, isActive)}
                        </h1>
                        {slide.subtitle ? (
                          <p className="mt-1 max-w-[150px] text-[7px] font-semibold uppercase tracking-[0.01em] text-zinc-900 sm:mt-1.5 sm:max-w-[180px] sm:text-[8px] md:mt-2 md:max-w-[430px] md:text-[15px] md:leading-tight">
                            {slide.subtitle}
                          </p>
                        ) : null}
                        <div className="mt-1.5 sm:mt-2.5 md:mt-6">
                          <Link
                            href={slide.ctaHref}
                            className="inline-flex items-center justify-center rounded-[7px] bg-[#f5c400] px-2.5 py-1 text-[10px] font-medium text-zinc-900 transition hover:bg-[#ffd84d] sm:rounded-[10px] sm:px-3.5 sm:py-1.5 sm:text-[12px] md:min-w-[230px] md:px-8 md:py-3 md:text-[16px]"
                          >
                            {slide.ctaLabel}
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="relative flex min-h-[184px] items-center justify-center sm:min-h-[220px] md:min-h-[390px]">
                      <Image
                        key={imageAnimationKey}
                        src={slide.imageUrl || "/hero-placeholder.svg"}
                        alt={slide.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 100vw, 66vw"
                        priority={index === 0}
                        loading={index === 0 ? "eager" : "lazy"}
                        className={`object-contain object-center p-1 sm:p-0 transition-all duration-700 md:p-5 ${isActive ? "hero-slide-image-enter scale-[1.03] sm:scale-[1.06] md:scale-100 opacity-100" : "scale-95 opacity-70"}`}
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 md:bottom-4 md:left-6 md:translate-x-0">
            {computedSlides.map((slide, index) => (
              <button
                key={`${slide.title}-${index}`}
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => setActiveSlide(index)}
                className={`h-2 rounded-full transition-all ${activeSlide === index ? "w-8 bg-brand-yellow" : "w-2 bg-zinc-300"}`}
              />
            ))}
          </div>
        </div>

        {cards.length ? (
            <div className="flex snap-x snap-mandatory gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-1 md:gap-2 md:overflow-visible md:pb-0">
            {cards.slice(0, 3).map((card, cardIdx) => (
              <div
                key={`${card.title}-${cardIdx}`}
                className="min-w-full shrink-0 snap-start sm:min-w-[84%] md:min-w-0 md:shrink"
              >
                <Link
                  href={card.ctaHref || "/"}
                  className="group grid min-h-[92px] grid-cols-[94px_minmax(0,1fr)] overflow-hidden rounded-none border border-zinc-200 bg-[#efefef] sm:min-h-[108px] sm:grid-cols-[108px_minmax(0,1fr)] sm:rounded md:min-h-[124px] md:grid-cols-[120px_minmax(0,1fr)]"
                >
                  <div className="relative bg-[#f5f5f5]">
                    <Image
                      src={card.imageUrl || "/hero-placeholder.svg"}
                      alt={card.title || "Hero card"}
                      fill
                      sizes="120px"
                      className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.04] sm:p-2.5 md:p-2.5"
                      draggable={false}
                    />
                  </div>
                  <div className="flex flex-col justify-center p-2 md:p-2.5">
                    {card.title ? <p className="line-clamp-3 whitespace-pre-line text-[10px] uppercase leading-[1.12] text-zinc-700 sm:text-[11px] md:text-[13px] md:leading-[1.12]">{card.title}</p> : null}
                    {card.subtitle ? <p className="mt-1 line-clamp-2 text-[9px] uppercase leading-[14px] text-zinc-600 md:text-[10px]">{card.subtitle}</p> : null}
                    <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-900 md:mt-1.5 md:text-[13px]">
                      {card.ctaLabel || "Shop now"}
                      <span className="inline-flex size-4 items-center justify-center rounded-full bg-brand-yellow text-[10px] leading-none text-zinc-900">›</span>
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
