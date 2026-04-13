'use client';

import { motion } from 'framer-motion';
import {
  Monitor,
  Headphones,
  Cloud,
  Dumbbell,
  Gamepad2,
  Laptop,
  Home,
  Camera,
} from 'lucide-react';

interface Brand {
  name: string;
  icon: typeof Monitor;
}

const brands: Brand[] = [
  { name: 'TechVision Pro', icon: Monitor },
  { name: 'AudioMax', icon: Headphones },
  { name: 'CloudTech', icon: Cloud },
  { name: 'UltraFit', icon: Dumbbell },
  { name: 'GameZone', icon: Gamepad2 },
  { name: 'NovaBook', icon: Laptop },
  { name: 'SmartHome Pro', icon: Home },
  { name: 'ProCam', icon: Camera },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

function BrandCard({ brand }: { brand: Brand }) {
  const Icon = brand.icon;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.05 }}
      className="group bg-card border border-border/50 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:shadow-lg hover:shadow-orange-500/5 hover:border-orange-200 transition-all duration-300 cursor-pointer"
    >
      <Icon className="h-10 w-10 text-muted-foreground/40 group-hover:text-orange-500 transition-colors duration-300" />
      <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors duration-300">
        {brand.name}
      </span>
    </motion.div>
  );
}

export function BrandsSection() {
  return (
    <section className="py-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      >
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 md:mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Trusted by Top Brands
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            We partner with the world&apos;s leading brands
          </p>
        </motion.div>

        {/* Brand Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          {brands.map((brand) => (
            <BrandCard key={brand.name} brand={brand} />
          ))}
        </motion.div>
      </div>
      </motion.div>
    </section>
  );
}
