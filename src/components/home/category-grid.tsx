'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { useUIStore } from "@/stores/ui-store";
import type { Category } from "@/lib/types";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryWithCount extends Category {
  productCount: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function CategoryGrid() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const setView = useUIStore((s) => s.setView);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={`cat-sk-${i}`} className="aspect-[4/5] rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ── High Performance: Image Mapper ──
  const getCategoryImage = (cat: CategoryWithCount) => {
    const slug = cat.slug.toLowerCase()
    const name = cat.name.toLowerCase()
    
    if (slug.includes('electron') || name.includes('electron')) return '/images/categories/electronics.png'
    if (slug.includes('computer') || name.includes('computer')) return '/images/categories/computers.png'
    if (slug.includes('gaming') || name.includes('gaming')) return '/images/products/mechanical-keyboard.png'
    if (slug.includes('audio') || name.includes('audio')) return '/images/products/headphones.png'
    if (slug.includes('photo') || name.includes('photo')) return '/images/products/camera.png'
    if (slug.includes('wearable') || name.includes('wearable')) return '/images/products/premium-smartwatch.png'
    if (slug.includes('access') || name.includes('access')) return '/images/products/smart-speaker.png'
    
    return cat.image || "/images/products/headphones.png"
  }

  return (
    <section className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            Shop by Category
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {categories.map((category) => (
            <motion.div key={category.id} variants={itemVariants}>
              <Card
                className="group cursor-pointer overflow-hidden border border-border/50 py-0 gap-0 transition-all duration-300 hover:shadow-xl hover:shadow-blue-600/10 hover:scale-[1.03] hover:border-blue-300 sm:hover:-translate-y-1 hover:ring-0 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={() =>
                  setView({ type: "products", categoryId: category.id })
                }
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  <Image
                    src={getCategoryImage(category)}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  />
                  {/* Product count badge */}
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="absolute top-2 right-2 z-10 bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow-md"
                  >
                    {category.productCount} items
                  </motion.span>
                  {/* Gradient overlay on hover (desktop only) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Category info overlaid at bottom on hover (desktop only) */}
                  <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full sm:group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="font-semibold text-sm text-white drop-shadow-md">
                      {category.name}
                    </h3>
                    <p className="text-xs text-white/80 mt-0.5">
                      {category.productCount} products
                    </p>
                    {/* Shop Now text that fades in */}
                    <span className="inline-block mt-2 text-xs font-medium text-blue-300 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 delay-100">
                      Shop Now →
                    </span>
                  </div>
                </div>
                {/* Category name below (always visible, hidden on hover for desktop) */}
                <div className="p-3 text-center sm:group-hover:opacity-0 transition-opacity duration-300">
                  <h3 className="font-semibold text-sm group-hover:text-blue-700 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {category.productCount} products
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
