'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast as sonnerToast } from 'sonner';
import {
  MessageCircleQuestion,
  ThumbsUp,
  Send,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface QAItem {
  id: string;
  question: string;
  answer: string;
  askedBy: string;
  answeredBy: string;
  helpful: number;
  createdAt: string;
}

interface ProductQAProps {
  productId: string;
}

export function ProductQA({ productId }: ProductQAProps) {
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [helpfulSet, setHelpfulSet] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch Q&A data
  useEffect(() => {
    let cancelled = false;
    async function fetchQA() {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${productId}/qa`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setQaItems(data.qa || []);
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchQA();
    return () => { cancelled = true; };
  }, [productId]);

  const handleHelpful = (id: string) => {
    if (helpfulSet.has(id)) return;
    setHelpfulSet((prev) => new Set(prev).add(id));
    setQaItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, helpful: item.helpful + 1 } : item
      )
    );
  };

  const handleSubmitQuestion = async () => {
    if (!questionText.trim()) return;
    setSubmitting(true);
    // Simulate a short delay for submission
    await new Promise((resolve) => setTimeout(resolve, 600));
    sonnerToast.success('Your question has been submitted. We\'ll answer within 24 hours.');
    setQuestionText('');
    setSubmitting(false);
    setDialogOpen(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`qa-sk-${i}`} className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="ml-10 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
            {i < 2 && <Separator className="mt-4" />}
          </div>
        ))}
      </div>
    );
  }

  if (qaItems.length === 0) {
    return (
      <Card className="p-12 text-center">
        <MessageCircleQuestion className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Questions Yet</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Be the first to ask a question about this product!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Q&A Items */}
      <div className="space-y-0">
        {qaItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
          >
            {/* Question */}
            <div className="flex items-start gap-3 py-4">
              <Avatar className="h-8 w-8 mt-0.5">
                <AvatarFallback className="bg-orange-100 text-orange-600 text-xs font-semibold">
                  {getInitials(item.askedBy)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm">{item.askedBy}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{item.question}</p>
              </div>
            </div>

            {/* Answer */}
            <div className="ml-11 rounded-lg bg-muted/50 border border-border/50 p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-7 w-7 mt-0.5">
                  <AvatarFallback className="bg-orange-500 text-white text-[10px] font-bold">
                    SS
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm text-orange-600 dark:text-orange-400">
                      {item.answeredBy}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>

              {/* Helpful button */}
              <div className="mt-3 ml-10">
                <button
                  onClick={() => handleHelpful(item.id)}
                  className={`inline-flex items-center gap-1.5 text-xs transition-colors rounded-md px-2 py-1 ${
                    helpfulSet.has(item.id)
                      ? 'text-orange-500 cursor-default'
                      : 'text-muted-foreground hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                  }`}
                  disabled={helpfulSet.has(item.id)}
                >
                  <ThumbsUp className={`h-3.5 w-3.5 ${helpfulSet.has(item.id) ? 'fill-orange-500' : ''}`} />
                  Helpful ({item.helpful})
                </button>
              </div>
            </div>

            {/* Divider */}
            {index < qaItems.length - 1 && <Separator className="mt-4" />}
          </motion.div>
        ))}
      </div>

      {/* Ask a Question Button */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: qaItems.length * 0.08 + 0.1 }}
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-12 border-orange-500 text-orange-500 hover:bg-orange-50 hover:text-orange-600 gap-2"
            >
              <MessageCircleQuestion className="h-5 w-5" />
              Ask a Question
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircleQuestion className="h-5 w-5 text-orange-500" />
                Ask a Question
              </DialogTitle>
              <DialogDescription>
                Have a question about this product? Our team will respond within 24 hours.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Textarea
                placeholder="Type your question here..."
                rows={4}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDialogOpen(false);
                    setQuestionText('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                  onClick={handleSubmitQuestion}
                  disabled={submitting || !questionText.trim()}
                >
                  {submitting ? (
                    'Submitting...'
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Question
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
