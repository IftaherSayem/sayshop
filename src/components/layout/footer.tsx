'use client'

import { useState, useCallback } from "react"
import { Mail, Send, Package, MessageCircle, Truck, ShieldCheck, RotateCcw, Headphones, Smartphone, Play } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

const footerSections = [
  {
    title: "Get to Know Us",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
  {
    title: "Make Money with Us",
    links: [
      { label: "Sell Products", href: "#" },
      { label: "Become an Affiliate", href: "#" },
      { label: "Advertise", href: "#" },
    ],
  },
  {
    title: "Payment Methods",
    links: [
      { label: "Bkash", href: "#" },
      { label: "Nagad", href: "#" },
      { label: "Rocket", href: "#" },
      { label: "Google Pay", href: "#" },
    ],
  },
  {
    title: "Let Us Help You",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Returns", href: "#" },
      { label: "Shipping Info", href: "#" },
      { label: "Contact Us", href: "#" },
      { label: "Track Your Order", href: "#", isTrackOrder: true },
    ],
  },
]

// Social media SVG icons
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

// Payment method icons
function VisaIcon() {
  return (
    <div className="flex h-7 items-center rounded bg-blue-600 px-2.5">
      <span className="text-[10px] font-bold tracking-widest text-white">VISA</span>
    </div>
  )
}

function MastercardIcon() {
  return (
    <div className="flex h-7 items-center gap-0.5 rounded bg-neutral-800 px-2">
      <span className="text-[10px] font-bold text-red-500">●</span>
      <span className="text-[10px] font-bold text-blue-400">●</span>
    </div>
  )
}

function PayPalIcon() {
  return (
    <div className="flex h-7 items-center rounded bg-[#003087] px-2">
      <span className="text-[9px] font-bold text-white">PayPal</span>
    </div>
  )
}

function ApplePayIcon() {
  return (
    <div className="flex h-7 items-center rounded bg-white px-2">
      <span className="text-[9px] font-semibold text-neutral-900"> Pay</span>
    </div>
  )
}

function ConfettiParticle({ index }: { index: number }) {
  const angle = (index / 12) * Math.PI * 2
  const distance = 30 + Math.random() * 40
  const size = 4 + Math.random() * 4
  const colors = ["#f97316", "#fb923c", "#fbbf24", "#22c55e", "#ffffff"]
  const color = colors[index % colors.length]

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        top: "50%",
        left: "50%",
      }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      animate={{
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        scale: 0,
        opacity: 0,
      }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    />
  )
}

export function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState("")
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 700)
  }, [])

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newsletterEmail.trim()) {
      setNewsletterSubmitted(true)
      triggerConfetti()
      setNewsletterEmail("")
      setTimeout(() => setNewsletterSubmitted(false), 3000)
    }
  }

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, isTrackOrder?: boolean) => {
    e.preventDefault()
    if (isTrackOrder) {
      // Dispatch custom event to open the OrderTracking sheet
      window.dispatchEvent(new CustomEvent("open-order-tracking"))
    }
  }

  return (
    <footer className="mt-auto border-t bg-neutral-900 text-neutral-300">
      {/* Gradient separator at the very top */}
      <div className="h-px bg-gradient-to-r from-transparent via-blue-600/30 to-transparent" />

      {/* Back to top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="block w-full bg-neutral-800 py-3 text-center text-sm text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        Back to top
      </button>

      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
        {/* Logo + tagline row */}
        <div className="mb-8 flex flex-col items-center gap-2 sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <div className="flex items-center gap-2.5">
              <Image src="/images/logo-premium.png" alt="SayShop" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
              <span className="text-xl font-bold text-white tracking-widest">SAYSHOP</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium">Premier E-Commerce Experience</p>
          </div>
        </div>

        {/* Newsletter mini-form */}
        <div className="mb-8 flex justify-center">
          <form
            onSubmit={handleNewsletterSubmit}
            className="flex w-full max-w-md items-center gap-2"
          >
            <div className="relative flex-1">
              <Mail className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
              <Input
                type="email"
                placeholder="Get exclusive deals via email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="h-8 border-neutral-700 bg-neutral-800 pl-8 text-xs text-neutral-300 placeholder:text-neutral-500 focus-visible:ring-blue-600"
              />
            </div>
            <div className="relative">
              <Button
                type="submit"
                size="sm"
                className="h-8 shrink-0 bg-blue-600 px-3 text-xs text-white hover:bg-blue-700"
              >
                {newsletterSubmitted ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-1"
                  >
                    <span className="text-[10px]">✓</span> Done
                  </motion.span>
                ) : (
                  <>
                    <Send className="mr-1 h-3 w-3" />
                    Subscribe
                  </>
                )}
              </Button>
              <AnimatePresence>
                {showConfetti && (
                  <div className="pointer-events-none absolute inset-0">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <ConfettiParticle key={i} index={i} />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>

        {/* Trust Badges Row */}
        <div className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-800/50 px-4 py-5">
            <Truck className="h-6 w-6 text-blue-400" />
            <div className="text-center">
              <p className="text-xs font-semibold text-neutral-200">Free Shipping</p>
              <p className="text-[11px] text-neutral-500">On orders over $50</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-800/50 px-4 py-5">
            <ShieldCheck className="h-6 w-6 text-blue-400" />
            <div className="text-center">
              <p className="text-xs font-semibold text-neutral-200">Secure Payment</p>
              <p className="text-[11px] text-neutral-500">100% secure checkout</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-800/50 px-4 py-5">
            <RotateCcw className="h-6 w-6 text-blue-400" />
            <div className="text-center">
              <p className="text-xs font-semibold text-neutral-200">Easy Returns</p>
              <p className="text-[11px] text-neutral-500">30-day return policy</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-800/50 px-4 py-5">
            <Headphones className="h-6 w-6 text-blue-400" />
            <div className="text-center">
              <p className="text-xs font-semibold text-neutral-200">24/7 Support</p>
              <p className="text-[11px] text-neutral-500">Dedicated support</p>
            </div>
          </div>
        </div>

        {/* 4-column grid */}
        <div className="grid grid-cols-2 gap-8 sm:gap-12 lg:grid-cols-4">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="group relative mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                {section.title}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-blue-600 transition-all duration-300 group-hover:w-full" />
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) =>
                        handleLinkClick(e, "isTrackOrder" in link && link.isTrackOrder)
                      }
                      className={`group relative inline-block text-sm text-neutral-400 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded ${"isTrackOrder" in link && link.isTrackOrder
                        ? "font-medium text-neutral-300 hover:text-blue-600"
                        : ""
                        }`}
                    >
                      {"isTrackOrder" in link && link.isTrackOrder && (
                        <Package className="mr-1.5 inline-block h-3.5 w-3.5 -translate-y-px" />
                      )}
                      {link.label}
                      {/* Hover underline animation */}
                      <span className="absolute bottom-0 left-0 h-px w-0 bg-blue-600 transition-all duration-300 group-hover:w-full" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Payment methods + social icons row */}
      <div className="border-t border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 py-5">
          {/* Payment icons */}
          <div className="mb-4 flex flex-col items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-600">
              We Accept
            </span>
            <div className="flex items-center gap-2">
              <VisaIcon />
              <MastercardIcon />
              <PayPalIcon />
              <ApplePayIcon />
            </div>
          </div>

          {/* App Download Badges */}
          <div className="mb-4 flex flex-col items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-600">
              Download Our App
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-neutral-300 transition-colors hover:bg-neutral-700 hover:border-neutral-600"
              >
                <Smartphone className="h-4 w-4" />
                <div className="text-left">
                  <p className="text-[8px] leading-none text-neutral-500">Download on the</p>
                  <p className="text-[11px] font-semibold leading-tight">App Store</p>
                </div>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-neutral-300 transition-colors hover:bg-neutral-700 hover:border-neutral-600"
              >
                <Play className="h-4 w-4" />
                <div className="text-left">
                  <p className="text-[8px] leading-none text-neutral-500">Get it on</p>
                  <p className="text-[11px] font-semibold leading-tight">Google Play</p>
                </div>
              </button>
            </div>
          </div>

          {/* Social media icons with scale + rotate hover */}
          <div className="flex items-center justify-center gap-3">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 transition-all duration-200 hover:bg-blue-600 hover:text-white hover:scale-110 hover:rotate-[8deg] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-label="Facebook"
            >
              <FacebookIcon />
            </a>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 transition-all duration-200 hover:bg-blue-600 hover:text-white hover:scale-110 hover:-rotate-[8deg] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-label="Twitter / X"
            >
              <TwitterIcon />
            </a>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 transition-all duration-200 hover:bg-blue-600 hover:text-white hover:scale-110 hover:rotate-[12deg] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 transition-all duration-200 hover:bg-blue-600 hover:text-white hover:scale-110 hover:-rotate-[12deg] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-label="YouTube"
            >
              <YouTubeIcon />
            </a>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 transition-all duration-200 hover:bg-blue-600 hover:text-white hover:scale-110 hover:rotate-[8deg] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-label="Message"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom copyright bar */}
      <div className="border-t border-neutral-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-neutral-500">
            Made with <span className="text-red-500">&hearts;</span> &copy; 2025 Say Shop. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="relative text-xs text-neutral-500 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="relative text-xs text-neutral-500 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
