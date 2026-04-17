'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { Package, Truck, Headphones, RotateCcw, Check } from "lucide-react";
import { motion } from "framer-motion";

interface StatConfig {
  icon: typeof Package;
  title: string;
  description: string;
  type: 'counter' | 'checkmark' | 'pulse' | 'text';
  counterTarget?: number;
  counterSuffix?: string;
  animatedText?: string;
}

const stats: StatConfig[] = [
  {
    icon: Package,
    title: "Products",
    description: "Wide selection across all categories",
    type: "counter",
    counterTarget: 50,
    counterSuffix: "K+",
  },
  {
    icon: Truck,
    title: "Free Shipping",
    description: "On all orders over $50",
    type: "checkmark",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Round-the-clock customer service",
    type: "pulse",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    description: "Hassle-free 30-day returns",
    type: "text",
    animatedText: "30-Day",
  },
];

function useAnimatedCounter(
  target: number,
  duration: number = 2000,
  inView: boolean = false
) {
  const [count, setCount] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) return;

    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [target, duration, inView]);

  return count;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function StatItem({ stat, isInView }: { stat: StatConfig; isInView: boolean }) {
  const Icon = stat.icon;
  const count = useAnimatedCounter(
    stat.counterTarget ?? 0,
    2000,
    isInView && stat.type === "counter"
  );

  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col items-center text-center px-4"
    >
      <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-blue-600/10 mb-3">
        <Icon className="h-6 w-6 text-blue-600" />
        {/* Checkmark overlay for Free Shipping */}
        {stat.type === "checkmark" && isInView && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
          >
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </motion.div>
        )}
        {/* Pulse ring for 24/7 Support */}
        {stat.type === "pulse" && isInView && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-blue-600/40"
              animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-blue-600/30"
              animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
            />
          </>
        )}
      </div>

      {/* Title / Counter */}
      {stat.type === "counter" ? (
        <h3 className="font-bold text-base md:text-lg mb-1">
          <span>{count.toLocaleString()}</span>
          <span className="text-blue-600">{stat.counterSuffix}</span>
          <span>{" "}{stat.title}</span>
        </h3>
      ) : stat.type === "text" ? (
        <h3 className="font-bold text-base md:text-lg mb-1">
          {isInView ? (
            <>
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-blue-600"
              >
                {stat.animatedText}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                {" "}{stat.title}
              </motion.span>
            </>
          ) : (
            stat.title
          )}
        </h3>
      ) : (
        <h3 className="font-bold text-base md:text-lg mb-1">
          {stat.title}
        </h3>
      )}

      <p className="text-xs md:text-sm text-muted-foreground">
        {stat.description}
      </p>
    </motion.div>
  );
}

export function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const entry = entries[0];
    if (entry.isIntersecting) {
      setIsInView(true);
    }
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.3,
    });

    observer.observe(node);

    return () => {
      observer.unobserve(node);
    };
  }, [handleIntersection]);

  return (
    <section className="py-12 md:py-16 border-y border-border/50 relative overflow-hidden bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" ref={sectionRef}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0"
        >
          {stats.map((stat, index) => (
            <div
              key={stat.title}
              className={index < stats.length - 1 ? "md:border-r md:border-border/50" : ""}
            >
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-xl p-5 md:p-6 transition-all duration-300 hover:shadow-xl">
                <StatItem stat={stat} isInView={isInView} />
              </div>
            </div>
          ))}
        </motion.div>
      </div>
      </motion.div>
    </section>
  );
}
