'use client';

import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Play, PlayCircle, Camera, RotateCcw, FileText, Star } from 'lucide-react';

interface ProductVideoSectionProps {
  productId: string;
  productName: string;
}

const highlights = [
  {
    icon: Camera,
    title: 'HD Quality',
    description: 'Crystal clear product visuals',
  },
  {
    icon: RotateCcw,
    title: '360° View',
    description: 'See every angle in detail',
  },
  {
    icon: FileText,
    title: 'Detailed Specs',
    description: 'Complete technical information',
  },
  {
    icon: Star,
    title: 'Customer Review',
    description: 'Real feedback from buyers',
  },
];

export function ProductVideoSection({ productId, productName }: ProductVideoSectionProps) {
  const handlePlayClick = () => {
    toast.info('Video playback coming soon!');
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Section Heading */}
      <div className="flex items-center gap-2">
        <PlayCircle className="h-6 w-6 text-orange-500" />
        <h2 className="text-2xl font-bold">Product Video</h2>
      </div>

      {/* Video Player Placeholder */}
      <div
        onClick={handlePlayClick}
        className="relative aspect-video w-full rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 overflow-hidden cursor-pointer group"
        role="button"
        tabIndex={0}
        aria-label={`Play video for ${productName}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlePlayClick();
          }
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Product name overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="absolute top-6 left-6 text-white/40 text-sm font-medium tracking-wide uppercase">
            {productName}
          </p>
        </div>

        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-orange-500/30 rounded-full blur-xl scale-150 group-hover:bg-orange-500/50 transition-colors duration-300" />
            {/* Circle button */}
            <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 rounded-full p-5 shadow-lg shadow-orange-500/30 group-hover:scale-110 group-hover:shadow-orange-500/50 transition-all duration-300">
              <Play className="h-8 w-8 text-white fill-white ml-1" />
            </div>
          </div>
        </div>

        {/* Bottom info bar */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white/70 text-xs font-medium">PREVIEW</span>
          </div>
          <span className="text-white/50 text-xs">Click to play</span>
        </div>
      </div>

      {/* Product Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {highlights.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="flex items-start gap-3 rounded-lg border bg-card p-4 hover:border-orange-200 hover:shadow-sm transition-all duration-200"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {item.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
