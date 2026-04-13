'use client'

import Image from "next/image"

type PaymentLogoSize = "sm" | "md" | "lg"

interface PaymentLogoProps {
  className?: string
  size?: PaymentLogoSize
}

const sizeMap: Record<PaymentLogoSize, { h: number; w: number }> = {
  sm: { h: 20, w: 60 },
  md: { h: 28, w: 84 },
  lg: { h: 36, w: 108 },
}

// ── bKash Logo ──────────────────────────────────────────────────
export function BkashLogo({ className, size = "md" }: PaymentLogoProps) {
  const { h, w } = sizeMap[size]
  return (
    <Image
      src="/images/payment/bkash.png"
      alt="bKash"
      width={w}
      height={h}
      className={`object-contain ${className || ""}`}
      style={className ? { width: 'auto', height: undefined } : undefined}
    />
  )
}

// ── Nagad Logo ──────────────────────────────────────────────────
export function NagadLogo({ className, size = "md" }: PaymentLogoProps) {
  const { h, w } = sizeMap[size]
  return (
    <Image
      src="/images/payment/nagad.png"
      alt="Nagad"
      width={w}
      height={h}
      className={`object-contain ${className || ""}`}
      style={className ? { width: 'auto', height: undefined } : undefined}
    />
  )
}

// ── Rocket Logo ─────────────────────────────────────────────────
export function RocketLogo({ className, size = "md" }: PaymentLogoProps) {
  const { h, w } = sizeMap[size]
  return (
    <Image
      src="/images/payment/rocket.png"
      alt="Rocket"
      width={w}
      height={h}
      className={`object-contain ${className || ""}`}
      style={className ? { width: 'auto', height: undefined } : undefined}
    />
  )
}

// ── Google Pay (GPay) Logo ──────────────────────────────────────
export function GPayLogo({ className, size = "md" }: PaymentLogoProps) {
  const { h, w } = sizeMap[size]
  return (
    <Image
      src="/images/payment/gpay.png"
      alt="Google Pay"
      width={w}
      height={h}
      className={`object-contain ${className || ""}`}
      style={className ? { width: 'auto', height: undefined } : undefined}
    />
  )
}
