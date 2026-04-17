'use client';

import { motion } from 'framer-motion';
import { Search, ShoppingCart, ShieldCheck, Truck, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Step {
  number: number;
  title: string;
  description: string;
  icon: typeof Search;
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Browse Products',
    description: 'Explore our wide range of categories and find what you love',
    icon: Search,
  },
  {
    number: 2,
    title: 'Add to Cart',
    description: 'Select your favorite items and add them to your shopping cart',
    icon: ShoppingCart,
  },
  {
    number: 3,
    title: 'Secure Checkout',
    description: 'Complete your purchase with our secure and fast checkout process',
    icon: ShieldCheck,
  },
  {
    number: 4,
    title: 'Fast Delivery',
    description: 'Receive your order at your doorstep with free shipping on orders over $50',
    icon: Truck,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;

  return (
    <motion.div variants={itemVariants} className="relative flex flex-col items-center">
      <Card className="border-border/50 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/5 transition-all duration-300 h-full">
        <CardContent className="p-5 md:p-6 flex flex-col items-center text-center gap-3">
          {/* Step number badge */}
          <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 shadow-sm">
            Step {step.number}
          </Badge>

          {/* Icon in colored circle */}
          <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-orange-950/40 flex items-center justify-center mt-1">
            <Icon className="h-7 w-7 text-blue-600" />
          </div>

          {/* Title */}
          <h3 className="font-bold text-sm md:text-base">{step.title}</h3>

          {/* Description */}
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function HowItWorksSection() {
  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
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
            How It Works
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Shopping made simple in just 4 easy steps
          </p>
        </motion.div>

        {/* Desktop: Horizontal timeline with connectors */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="hidden md:grid md:grid-cols-4 gap-6 relative"
        >
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <StepCard step={step} />
              {/* Dashed connector arrow between steps (not after last) */}
              {index < steps.length - 1 && (
                <div className="absolute top-1/2 -right-4 -translate-y-1/2 z-10 flex items-center">
                  <div className="w-6 border-t-2 border-dashed border-blue-300" />
                  <ChevronRight className="h-4 w-4 text-blue-400 -ml-0.5" />
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Mobile: Vertical timeline with connector */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="md:hidden relative"
        >
          {/* Vertical dashed line */}
          <div className="absolute left-7 top-10 bottom-10 w-px border-l-2 border-dashed border-blue-200 dark:border-orange-800" />

          <div className="flex flex-col gap-6">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  variants={itemVariants}
                  className="relative pl-14"
                >
                  {/* Circle icon on the timeline */}
                  <div className="absolute left-0 top-4 w-14 h-14 rounded-full bg-blue-100 dark:bg-orange-950/40 flex items-center justify-center z-10 border-2 border-background">
                    <Icon className="h-7 w-7 text-blue-600" />
                  </div>

                  <Card className="border-border/50 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/5 transition-all duration-300">
                    <CardContent className="p-4 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-xs font-bold px-2 py-0.5">
                          Step {step.number}
                        </Badge>
                        <h3 className="font-bold text-sm">{step.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
      </motion.div>
    </section>
  );
}
