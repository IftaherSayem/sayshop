'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

const slides = [
  {
    headline: "Summer Tech Sale",
    subtitle: "Up to 40% off on premium electronics",
    cta: "Shop Now",
    gradient: "from-blue-900/80 via-blue-800/50 to-transparent",
    image: "/images/hero/banner1.png"
  },
  {
    headline: "New Arrivals",
    subtitle: "Discover the latest gadgets and accessories",
    cta: "Explore",
    gradient: "from-blue-600/80 via-purple-600/50 to-transparent",
    image: "/images/hero/banner2.png"
  },
  {
    headline: "Free Shipping",
    subtitle: "On all orders over $50, no code needed",
    cta: "Start Shopping",
    gradient: "from-green-600/80 via-teal-600/50 to-transparent",
    image: "/images/hero/banner3.png"
  },
];

// Particle dots configuration
const particles = [
  { size: 6, x: "10%", y: "20%", duration: 8, delay: 0, opacity: 0.3 },
  { size: 4, x: "75%", y: "15%", duration: 12, delay: 1, opacity: 0.2 },
  { size: 8, x: "50%", y: "70%", duration: 10, delay: 2, opacity: 0.15 },
  { size: 5, x: "85%", y: "60%", duration: 9, delay: 0.5, opacity: 0.25 },
  { size: 3, x: "30%", y: "80%", duration: 11, delay: 1.5, opacity: 0.2 },
];

export function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const setView = useUIStore((s) => s.setView);
  const sectionRef = useRef<HTMLElement>(null);

  // Parallax scroll effect
  const { scrollY } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const bgY = useTransform(scrollY, [0, 600], [0, 150]);
  const contentY = useTransform(scrollY, [0, 600], [0, 50]);
  const contentOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  const goToSlide = useCallback(
    (index: number) => {
      setCurrentSlide(index);
    },
    []
  );

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  const handleCTA = () => {
    setView({ type: "products" });
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[560px] overflow-hidden"
    >
      {/* ── Background with parallax ──────────────────────── */}
      <motion.div style={{ y: bgY }} className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* Background Image */}
            <Image
              src={slides[currentSlide].image}
              alt={slides[currentSlide].headline}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            {/* Slide-specific gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-r ${slides[currentSlide].gradient}`} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ── Vignette overlay ──────────────────────────────── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.45)_100%)] z-[1]" />

      {/* ── Floating particle dots (desktop only for performance) ── */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none hidden sm:block">
        {particles.map((p, i) => (
          <motion.div
            key={`hero-particle-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              width: p.size,
              height: p.size,
              left: p.x,
              top: p.y,
              opacity: p.opacity,
            }}
            animate={{
              y: [0, -30, 10, -20, 0],
              x: [0, 15, -10, 20, 0],
              opacity: [p.opacity, p.opacity * 1.5, p.opacity * 0.5, p.opacity * 1.2, p.opacity],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* ── Animated HOT DEALS badge ──────────────────────── */}
      <motion.div
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20"
        animate={{ y: [0, -6, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 px-4 py-1.5 text-sm font-bold shadow-lg shadow-amber-500/25">
          🔥 HOT DEALS
        </Badge>
      </motion.div>

      {/* ── Content with parallax (simplified on mobile) ───── */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-lg"
          >
            <h1 className="hero-gradient-text text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight drop-shadow-lg">
              {slides[currentSlide].headline}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 md:mb-8 drop-shadow">
              {slides[currentSlide].subtitle}
            </p>
            <Button
              size="lg"
              className="hero-cta-shimmer bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 hover:from-blue-700 hover:via-indigo-600 hover:to-blue-700 text-white text-sm sm:text-base px-6 sm:px-8 py-5 sm:py-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
              onClick={handleCTA}
            >
              {slides[currentSlide].cta}
            </Button>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ── Navigation Arrows (desktop only) ────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm rounded-full h-10 w-10 hidden sm:flex"
        onClick={prevSlide}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm rounded-full h-10 w-10 hidden sm:flex"
        onClick={nextSlide}
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* ── Dots ──────────────────────────────────────────── */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, index) => (
          <button
            key={`hero-slide-dot-${index}`}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${index === currentSlide
              ? "w-8 h-3 bg-blue-500"
              : "w-3 h-3 bg-white/60 hover:bg-white/80 active:bg-white/90"
              }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
