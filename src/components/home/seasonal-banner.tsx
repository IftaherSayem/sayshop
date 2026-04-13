'use client';

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { motion } from "framer-motion";
import Image from "next/image";

const floatingImages = [
  { src: "/images/products/smartphone.png", alt: "Smartphone", className: "w-32 h-32 md:w-44 md:h-44 lg:w-52 lg:h-52" },
  { src: "/images/products/headphones.png", alt: "Headphones", className: "w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44" },
  { src: "/images/products/smartwatch.png", alt: "Smartwatch", className: "w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40" },
];

const floatingVariants = [
  {
    initial: { y: 0, rotate: -6 },
    animate: { y: [-0, -12, 0], rotate: -6 },
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0 },
  },
  {
    initial: { y: 0, rotate: 4 },
    animate: { y: [0, -16, 0], rotate: 4 },
    transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
  },
  {
    initial: { y: 0, rotate: -3 },
    animate: { y: [0, -10, 0], rotate: -3 },
    transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1 },
  },
];

export function SeasonalBanner() {
  const setView = useUIStore((s) => s.setView);

  return (
    <section className="relative overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 relative">
        {/* Decorative circles */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />

        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 lg:py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            {/* Left side: Text content */}
            <motion.div
              className="flex-1 text-center md:text-left z-10"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold uppercase tracking-wider rounded-full mb-4">
                Limited Time Offer
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
                Summer Collection 2025
              </h2>
              <p className="text-lg md:text-xl text-white/90 mb-6 max-w-lg mx-auto md:mx-0">
                Up to <span className="font-bold text-yellow-200">60% off</span> on selected items.
                Don&apos;t miss out on the hottest deals of the season.
              </p>
              <Button
                size="lg"
                onClick={() => setView({ type: "products", sort: "popular" })}
                className="bg-white text-orange-600 hover:bg-white/90 font-semibold text-base px-8 h-12 shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                Shop Now
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>

            {/* Right side: Floating product images */}
            <motion.div
              className="flex-1 relative h-64 md:h-72 lg:h-80 z-10"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {floatingImages.map((img, index) => (
                <motion.div
                  key={img.src}
                  className="absolute"
                  style={{
                    top: `${15 + index * 18}%`,
                    right: index === 0 ? "5%" : index === 1 ? "30%" : "55%",
                    zIndex: 3 - index,
                  }}
                  initial={floatingVariants[index].initial}
                  animate={floatingVariants[index].animate}
                  transition={floatingVariants[index].transition}
                >
                  <div className={`${img.className} rounded-2xl overflow-hidden shadow-2xl bg-white/20 backdrop-blur-sm p-3 md:p-4`}>
                    <Image
                      src={img.src}
                      alt={img.alt}
                      width={200}
                      height={200}
                      className="w-full h-full object-contain drop-shadow-lg"
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Wave divider at bottom */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-[99%]">
          <svg
            viewBox="0 0 1440 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto"
            preserveAspectRatio="none"
          >
            <path
              d="M0 60V20C240 0 480 40 720 30C960 20 1200 0 1440 20V60H0Z"
              className="fill-background dark:fill-background"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
