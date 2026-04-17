'use client';

import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Package, ShoppingCart, Headphones, Smartphone, Shield, Lamp, Mouse, RectangleHorizontal, Dumbbell, Droplets, Grip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ComboItem {
  name: string;
  originalPrice: number;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
}

interface ComboDeal {
  id: string;
  title: string;
  items: ComboItem[];
  bundlePrice: number;
  originalTotal: number;
  savings: number;
}

const comboDeals: ComboDeal[] = [
  {
    id: 'tech-starter',
    title: 'Tech Starter Pack',
    items: [
      { name: 'Headphones', originalPrice: 89.99, icon: Headphones, bgColor: 'bg-violet-100 dark:bg-violet-950/50' },
      { name: 'Phone Case', originalPrice: 24.99, icon: Smartphone, bgColor: 'bg-sky-100 dark:bg-sky-950/50' },
      { name: 'Screen Protector', originalPrice: 12.99, icon: Shield, bgColor: 'bg-emerald-100 dark:bg-emerald-950/50' },
    ],
    bundlePrice: 109.99,
    originalTotal: 127.97,
    savings: 17.98,
  },
  {
    id: 'home-office',
    title: 'Home Office Setup',
    items: [
      { name: 'Desk Lamp', originalPrice: 45.99, icon: Lamp, bgColor: 'bg-amber-100 dark:bg-amber-950/50' },
      { name: 'Wireless Mouse', originalPrice: 29.99, icon: Mouse, bgColor: 'bg-rose-100 dark:bg-rose-950/50' },
      { name: 'Mouse Pad', originalPrice: 14.99, icon: RectangleHorizontal, bgColor: 'bg-teal-100 dark:bg-teal-950/50' },
    ],
    bundlePrice: 74.99,
    originalTotal: 90.97,
    savings: 15.98,
  },
  {
    id: 'fitness-essentials',
    title: 'Fitness Essentials',
    items: [
      { name: 'Yoga Mat', originalPrice: 34.99, icon: Dumbbell, bgColor: 'bg-green-100 dark:bg-green-950/50' },
      { name: 'Water Bottle', originalPrice: 19.99, icon: Droplets, bgColor: 'bg-cyan-100 dark:bg-cyan-950/50' },
      { name: 'Resistance Bands', originalPrice: 15.99, icon: Grip, bgColor: 'bg-blue-100 dark:bg-orange-950/50' },
    ],
    bundlePrice: 54.99,
    originalTotal: 70.97,
    savings: 15.98,
  },
];

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function ComboDealsSection() {
  const handleAddBundle = (deal: ComboDeal) => {
    toast.info('Bundle deals coming soon!');
  };

  return (
    <section className="relative py-16 bg-gradient-to-b from-blue-50/30 to-transparent">
      {/* Decorative gradient line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-blue-400 via-blue-600 to-blue-700 rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <Package className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Bundle & Save
            </h2>
          </div>
          <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
            Get more for less with our exclusive bundles
          </p>
        </motion.div>

        {/* Combo Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {comboDeals.map((deal, index) => (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="group rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3">
                <h3 className="text-white font-bold text-lg">{deal.title}</h3>
              </div>

              {/* Product Items */}
              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  {deal.items.map((item, itemIndex) => (
                    <div
                      key={`${deal.id}-item-${itemIndex}`}
                      className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                    >
                      {/* Icon placeholder */}
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${item.bgColor}`}>
                        <item.icon className="h-5 w-5 text-foreground/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-sm text-muted-foreground line-through">
                          {formatPrice(item.originalPrice)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Original Total:</span>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(deal.originalTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-foreground">Bundle Price:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatPrice(deal.bundlePrice)}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 text-sm px-2.5 py-0.5">
                      Save {formatPrice(deal.savings)}
                    </Badge>
                  </div>
                </div>

                {/* Add to Cart Button */}
                <Button
                  onClick={() => handleAddBundle(deal)}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm gap-2 transition-colors"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add Bundle to Cart
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
