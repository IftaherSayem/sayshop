'use client';

import { useWishlistStore } from "@/stores/wishlist-store";
import { useUIStore } from "@/stores/ui-store";
import { formatPrice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Heart, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { toast } from "sonner";

export function WishlistSection() {
  const items = useWishlistStore((s) => s.items);
  const removeItem = useWishlistStore((s) => s.removeItem);
  const setView = useUIStore((s) => s.setView);

  const handleRemove = (e: React.MouseEvent, productId: string, name: string) => {
    e.stopPropagation();
    removeItem(productId);
    toast.success(`${name} removed from wishlist`);
  };

  const handleNavigate = (productId: string) => {
    setView({ type: "product-detail", productId });
  };

  if (items.length === 0) {
    return (
      <section className="hidden lg:block py-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
        <div className="max-w-7xl mx-auto px-4">
          <div className="border border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-orange-950/30">
              <Heart className="h-7 w-7 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold">Your wishlist is empty</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Save your favorite products here so you can easily find them later.
            </p>
            <Button
              variant="outline"
              className="mt-1 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-orange-700 dark:border-orange-800 dark:text-blue-400 dark:hover:bg-orange-950/30"
              onClick={() => setView({ type: "products" })}
            >
              Browse Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="hidden lg:block py-8">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            <h2 className="text-xl font-bold">Your Wishlist</h2>
            <span className="text-sm text-muted-foreground">({items.length})</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => setView({ type: "products" })}
          >
            View All
            <ShoppingBag className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.productId}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0 w-[200px] cursor-pointer group"
                onClick={() => handleNavigate(item.productId)}
              >
                <div className="relative aspect-square overflow-hidden rounded-lg border border-border/50 bg-muted mb-2 transition-all duration-300 group-hover:shadow-md group-hover:border-blue-200">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="200px"
                  />
                  {/* Remove button overlay */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 bg-white/90 dark:bg-neutral-800/90 hover:bg-red-50 dark:hover:bg-red-950/50 shadow-sm hover:text-red-500"
                      onClick={(e) => handleRemove(e, item.productId, item.name)}
                      aria-label={`Remove ${item.name} from wishlist`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <h4 className="text-sm font-medium line-clamp-1 group-hover:text-blue-700 transition-colors">
                  {item.name}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold">{formatPrice(item.price)}</span>
                  {item.comparePrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(item.comparePrice)}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      </motion.div>
    </section>
  );
}
