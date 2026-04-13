'use client';

import { useState, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Send, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const MAX_NAME_LENGTH = 50;

export function NewsletterSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      setEmailError("Email is required.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validateName = (value: string) => {
    if (value.length > MAX_NAME_LENGTH) {
      setNameError(`Name must be ${MAX_NAME_LENGTH} characters or less.`);
      return false;
    }
    setNameError("");
    return true;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) validateEmail(value);
  };

  const handleNameChange = (value: string) => {
    if (value.length <= MAX_NAME_LENGTH) {
      setName(value);
    }
    if (nameError) validateName(value);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const isEmailValid = validateEmail(email);
    const isNameValid = validateName(name);

    if (!isEmailValid || !isNameValid) return;

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
      toast.success("Welcome aboard! You've been subscribed to our newsletter.");
    }, 800);
  };

  const handleReset = () => {
    setSubmitted(false);
    setEmail("");
    setName("");
    setEmailError("");
    setNameError("");
  };

  return (
    <section className="py-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-12 md:px-12 md:py-16 text-center"
        >
          {/* Background decoration - floating animated shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Large circle top-right */}
            <motion.div
              className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/10"
              animate={{
                y: [0, -20, 0],
                x: [0, 10, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Circle bottom-left */}
            <motion.div
              className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/10"
              animate={{
                y: [0, 15, 0],
                x: [0, -10, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />
            {/* Small center circle */}
            <motion.div
              className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-white/5"
              animate={{
                y: [0, -25, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
            />
            {/* Floating diamond shape */}
            <motion.div
              className="absolute top-8 left-[60%] w-16 h-16 bg-white/10 rotate-45"
              animate={{
                y: [0, -30, 0],
                rotate: [45, 90, 45],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
            />
            {/* Small floating circle right */}
            <motion.div
              className="absolute bottom-8 right-[20%] w-20 h-20 rounded-full bg-white/8"
              animate={{
                y: [0, -15, 0],
                x: [0, 15, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 3,
              }}
            />
          </div>

          <div className="relative z-10 max-w-xl mx-auto">
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Mail icon with pulse */}
                  <motion.div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mb-6"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute w-20 h-20 rounded-full bg-white/10"
                    />
                    <Mail className="h-7 w-7 text-white relative" />
                  </motion.div>

                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3">
                    Stay in the Loop
                  </h2>
                  <p className="text-white/90 text-sm md:text-base mb-8 max-w-md mx-auto">
                    Subscribe to get special offers, free giveaways, and exclusive deals
                  </p>

                  <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-3 max-w-md mx-auto"
                  >
                    {/* Name field */}
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Your name (optional)"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="h-11 bg-white/95 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums">
                        {name.length}/{MAX_NAME_LENGTH}
                      </span>
                      <AnimatePresence>
                        {nameError && (
                          <motion.p
                            initial={{ opacity: 0, y: -4, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -4, height: 0 }}
                            className="flex items-center gap-1 text-xs text-red-200 mt-1 ml-1 overflow-hidden"
                          >
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {nameError}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Email field */}
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className={`h-11 bg-white/95 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 ${emailError ? "focus-visible:ring-red-300" : "focus-visible:ring-white/50"} rounded-lg`}
                      />
                      <AnimatePresence>
                        {emailError && (
                          <motion.p
                            initial={{ opacity: 0, y: -4, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -4, height: 0 }}
                            className="flex items-center gap-1 text-xs text-red-200 mt-1 ml-1 overflow-hidden"
                          >
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {emailError}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-11 rounded-lg px-6 transition-all duration-300 bg-gradient-to-r from-white to-white/90 text-orange-600 hover:from-white/95 hover:to-white/85 font-semibold shadow-lg hover:shadow-xl"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 border-2 border-orange-600/30 border-t-orange-600 rounded-full animate-spin" />
                          Subscribing...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Subscribe
                          <Send className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </form>

                  {/* Privacy note */}
                  <div className="flex items-center justify-center gap-1.5 mt-4">
                    <Shield className="h-3 w-3 text-white/60" />
                    <p className="text-white/70 text-xs">
                      By subscribing, you agree to our{" "}
                      <span className="underline cursor-pointer hover:text-white transition-colors">Privacy Policy</span>.
                      No spam, unsubscribe anytime.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex flex-col items-center py-4"
                >
                  {/* Animated checkmark */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                    className="mb-6"
                  >
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: [0.8, 1.15, 1] }}
                      transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                      className="relative flex items-center justify-center w-20 h-20 rounded-full bg-white/20"
                    >
                      <motion.div
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute w-24 h-24 rounded-full bg-white/10"
                      />
                      <CheckCircle2 className="h-10 w-10 text-white relative" />
                    </motion.div>
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl md:text-3xl font-bold text-white mb-2"
                  >
                    You&apos;re Subscribed!
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/90 text-sm md:text-base mb-2 max-w-sm mx-auto"
                  >
                    {name ? (
                      <>Thanks, <span className="font-semibold">{name}</span>! You&apos;ll receive our latest deals and offers.</>
                    ) : (
                      "You'll receive our latest deals and offers straight to your inbox."
                    )}
                  </motion.p>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/60 text-xs mb-6"
                  >
                    We sent a confirmation to <span className="text-white/80">{email}</span>
                  </motion.p>

                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    onClick={handleReset}
                    className="text-sm text-white/80 underline underline-offset-4 hover:text-white transition-colors"
                  >
                    Subscribe another email
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
      </motion.div>
    </section>
  );
}
