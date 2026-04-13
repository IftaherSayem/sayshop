'use client';

import { useState, useEffect } from "react";
import { MessageSquare, Star } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import type { Product, Review } from "@/lib/types";
import { parseImages } from "@/lib/types";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

interface ReviewWithProduct {
  review: Review;
  product: Product;
}

export function ReviewsShowcase() {
  const [reviews, setReviews] = useState<ReviewWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const setView = useUIStore((s) => s.setView);

  useEffect(() => {
    async function fetchReviews() {
      try {
        // Fetch top products by popularity
        const res = await fetch("/api/products?sort=popular&limit=5");
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        const products: Product[] = data.products;

        // Fetch reviews for each product
        const reviewPromises = products.map(async (product) => {
          const reviewRes = await fetch(`/api/products/${product.id}/reviews?limit=1`);
          if (!reviewRes.ok) return null;
          const reviewData = await reviewRes.json();
          if (reviewData.reviews && reviewData.reviews.length > 0) {
            return { review: reviewData.reviews[0], product };
          }
          return null;
        });

        const results = await Promise.all(reviewPromises);
        const validReviews = results.filter((r): r is ReviewWithProduct => r !== null);
        setReviews(validReviews);
      } catch (error) {
        console.error("Failed to fetch reviews:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={`review-sk-star-${i}`}
            className={`h-3.5 w-3.5 ${
              i < rating
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <section className="py-12 md:py-16 bg-muted/20">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="h-0.5 max-w-24 mb-4 rounded-full bg-gradient-to-r from-orange-400 to-orange-600" />
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            <h2 className="text-2xl md:text-3xl font-bold">What Customers Are Saying</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Real reviews from verified buyers
          </p>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`review-sk-card-${i}`} className="break-inside-avoid mb-4">
                <Skeleton className="h-48 rounded-xl p-4" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No customer reviews yet</p>
            <p className="text-sm mt-1">Be the first to share your experience</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {reviews.map((item, index) => {
              const { review, product } = item;
              const images = parseImages(product.images);
              return (
                <motion.div
                  key={review.id}
                  className="break-inside-avoid mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div
                    className="bg-card border border-border/50 rounded-xl p-4 hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                    onClick={() => setView({ type: "product-detail", productId: product.id })}
                  >
                    {/* Product info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                        <Image
                          src={images[0]?.url || "/images/products/headphones.png"}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <div className="flex items-center gap-1.5">
                          {renderStars(review.rating)}
                          <span className="text-xs text-muted-foreground">{review.rating % 1 === 0 ? `${review.rating}.0` : review.rating}</span>
                        </div>
                      </div>
                    </div>

                    {/* Review snippet */}
                    {review.title && (
                      <p className="text-sm font-semibold mb-1.5">{review.title}</p>
                    )}
                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                      &ldquo;{review.comment.length > 100 ? review.comment.slice(0, 100) + "..." : review.comment}&rdquo;
                    </p>

                    {/* Reviewer info */}
                    <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <span className="text-xs font-bold text-orange-600">
                            {review.userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs font-semibold">{review.userName}</span>
                        {review.verified && (
                          <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
                            Verified
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      </motion.div>
    </section>
  );
}
