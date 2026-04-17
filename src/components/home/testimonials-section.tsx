'use client';

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote, ShieldCheck } from "lucide-react";

const avatarColors = ["bg-blue-600", "bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-rose-500", "bg-cyan-500", "bg-amber-500"];

interface Testimonial {
  id: number;
  name: string;
  initials: string;
  date: string;
  rating: number;
  text: string;
  productImage?: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Mitchell",
    initials: "SM",
    date: "2 days ago",
    rating: 5,
    text: "Absolutely love shopping here! The product quality is fantastic and shipping is always faster than expected. I've been a loyal customer for over a year now and recommend Say Shop to everyone I know.",
    productImage: "/images/products/headphones.png",
  },
  {
    id: 2,
    name: "James Rodriguez",
    initials: "JR",
    date: "1 week ago",
    rating: 5,
    text: "The customer service team went above and beyond to help me with a return. The whole process was seamless and my refund was processed quickly. Great selection of electronics too!",
    productImage: "/images/products/smartwatch.png",
  },
  {
    id: 3,
    name: "Emily Chen",
    initials: "EC",
    date: "3 weeks ago",
    rating: 4,
    text: "Found exactly what I was looking for at unbeatable prices. The website is easy to navigate and checkout was a breeze. I'd love to see even more tech accessories and gadget bundles added to the catalog.",
    productImage: "/images/products/earbuds.png",
  },
  {
    id: 4,
    name: "Michael Thompson",
    initials: "MT",
    date: "1 month ago",
    rating: 5,
    text: "Say Shop has become my go-to online store. The daily deals are amazing and I've saved hundreds over the past few months. The product descriptions are accurate and reviews are helpful for making decisions.",
    productImage: "/images/products/laptop.png",
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={`testi-star-${i}`}
          className={`h-4 w-4 ${
            i < rating
              ? "fill-blue-400 text-blue-400"
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  const [[page, direction], setPage] = useState([0, 0]);
  const [isPaused, setIsPaused] = useState(false);

  const paginate = useCallback(
    (newDirection: number) => {
      setPage(([prevPage]) => {
        const nextPage = prevPage + newDirection;
        if (nextPage < 0) return [testimonials.length - 1, newDirection];
        if (nextPage >= testimonials.length) return [0, newDirection];
        return [nextPage, newDirection];
      });
    },
    []
  );

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      paginate(1);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused, paginate]);

  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
      <div className="max-w-4xl mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Real reviews from real shoppers
          </p>
        </motion.div>

        {/* Carousel */}
        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="overflow-hidden rounded-2xl">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={page}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.25 },
                }}
                className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Quote icon */}
                  <Quote className="h-10 w-10 text-blue-300 -rotate-[5deg] mb-4" />

                  {/* Review text */}
                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed max-w-2xl mb-6">
                    &ldquo;{testimonials[page].text}&rdquo;
                  </p>

                  {/* Rating */}
                  <StarRating rating={testimonials[page].rating} />

                  {/* Author */}
                  <div className="flex items-center gap-3 mt-4">
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full ${avatarColors[page % avatarColors.length]} flex items-center justify-center flex-shrink-0`}
                    >
                      <span className="text-white text-sm font-semibold">
                        {testimonials[page].initials}
                      </span>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm">
                          {testimonials[page].name}
                        </p>
                        <ShieldCheck className="h-3.5 w-3.5 text-green-500" aria-label="Verified Purchase" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {testimonials[page].date}
                      </p>
                    </div>

                    {/* Product photo placeholder */}
                    {testimonials[page].productImage && (
                      <div className="relative ml-2 flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden border border-border/50">
                          <img
                            src={testimonials[page].productImage}
                            alt="Reviewed product"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-0.5">
                          <Star className="h-3 w-3 fill-white text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={() => paginate(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 md:-translate-x-5 w-8 h-8 rounded-full bg-card border border-border/50 shadow-sm flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 transition-colors"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => paginate(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 md:translate-x-5 w-8 h-8 rounded-full bg-card border border-border/50 shadow-sm flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 transition-colors"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, i) => (
            <button
              key={`testi-dot-${i}`}
              onClick={() => setPage([i, i > page ? 1 : -1])}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === page
                  ? "w-6 bg-blue-600"
                  : "w-2 bg-border hover:bg-blue-300"
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
      </div>
      </motion.div>
    </section>
  );
}
