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

const floatingVariants: any = [
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
      <div className="bg-[#0a0a0c] relative border-y border-white/5 overflow-hidden">
        {/* Abstract Premium Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
        
        {/* Subtle grid pattern for tech feel */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 lg:py-28 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 md:gap-20">
            {/* Left side: Text content */}
            <motion.div
              className="flex-1 text-center md:text-left"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 backdrop-blur-md text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full mb-6">
                Limited Time Offer
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-6 leading-[1.1] tracking-tighter italic uppercase">
                Summer<span className="text-blue-600 font-light not-italic"> Collection</span>
              </h2>
              <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-lg mx-auto md:mx-0 leading-relaxed">
                Experience next-level technology. Up to <span className="text-white font-semibold">60% off</span> on premier electronics. 
                Redefining the digital lifestyle for the new season.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <Button
                  size="lg"
                  onClick={() => setView({ type: "products", sort: "popular" })}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-wider px-10 h-14 rounded-2xl shadow-2xl shadow-blue-600/20 transition-all duration-300 group"
                >
                  Shop Collection
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-sm uppercase tracking-wider px-10 h-14 rounded-2xl backdrop-blur-sm"
                >
                  View Catalog
                </Button>
              </div>
            </motion.div>
  
            {/* Right side: Floating product images with premium glass cards */}
            <motion.div
              className="flex-1 relative h-72 md:h-80 lg:h-[400px] w-full"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {floatingImages.map((img, index) => (
                <motion.div
                  key={img.src}
                  className="absolute"
                  style={{
                    top: `${10 + index * 15}%`,
                    right: index === 0 ? "0%" : index === 1 ? "25%" : "50%",
                    zIndex: 3 - index,
                  }}
                  initial={floatingVariants[index].initial}
                  animate={floatingVariants[index].animate}
                  transition={floatingVariants[index].transition}
                >
                  <div className={`${img.className} rounded-[2rem] overflow-hidden border border-white/10 shadow-3xl bg-zinc-900/40 backdrop-blur-2xl p-4 md:p-6 lg:p-8 flex items-center justify-center group hover:border-blue-500/50 transition-colors duration-500`}>
                    <Image
                      src={img.src}
                      alt={img.alt}
                      width={200}
                      height={200}
                      className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
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
    </section>
  );
}
