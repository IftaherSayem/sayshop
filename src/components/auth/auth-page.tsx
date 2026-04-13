'use client'

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useUIStore } from "@/stores/ui-store"
import { useAuthStore } from "@/stores/auth-store"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Mail,
  Lock,
  User,
  Loader2,
  Eye,
  EyeOff,
  ShoppingBag,
  ShieldCheck,
  KeyRound,
  RefreshCw,
} from "lucide-react"
import type { AuthUser } from "@/stores/auth-store"

export function AuthPage({ prefilledEmail }: { prefilledEmail?: string }) {
  const setView = useUIStore((s) => s.setView)
  const { login, isAuthenticated } = useAuthStore()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setView({ type: "home" })
    }
  }, [isAuthenticated, setView])

  // ── Shared state ──
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // ── Sign In state ──
  const [signinEmail, setSigninEmail] = useState(prefilledEmail || "")
  const [signinPassword, setSigninPassword] = useState("")

  // ── Sign Up state ──
  const [signupName, setSignupName] = useState("")
  const [signupEmail, setSignupEmail] = useState(prefilledEmail || "")
  const [signupPassword, setSignupPassword] = useState("")
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("")

  // ── Verification state ──
  const [verificationStep, setVerificationStep] = useState<null | 'verify'>(null)
  const [verifyEmail, setVerifyEmail] = useState("")
  const [verifyCode, setVerifyCode] = useState(["", "", "", "", "", ""])
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Sync prefilled email
  useEffect(() => {
    if (prefilledEmail) {
      setSigninEmail(prefilledEmail)
      setSignupEmail(prefilledEmail)
    }
  }, [prefilledEmail])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Only allow digits
    const newCode = [...verifyCode]
    newCode[index] = value.slice(-1) // Take only last character
    setVerifyCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }, [verifyCode])

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !verifyCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }, [verifyCode])

  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted.length === 0) return
    const newCode = [...verifyCode]
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || ""
    }
    setVerifyCode(newCode)
    const focusIndex = Math.min(pasted.length, 5)
    otpRefs.current[focusIndex]?.focus()
  }, [verifyCode])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signinEmail.trim() || !signinPassword) {
      toast.error("Please fill in all fields")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signinEmail.trim(), password: signinPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Check if verification is required
        if (data.requiresVerification) {
          setVerifyEmail(data.email)
          setVerificationStep("verify")
          toast.error(data.error || "Please verify your email first")
          // Auto-send verification code
          try {
            await fetch("/api/auth/send-verification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: data.email }),
            })
          } catch {
            // Silent fail — user can use resend button
          }
        } else {
          toast.error(data.error || "Sign in failed")
        }
        return
      }
      const user: AuthUser = data.user
      login(user)
      toast.success(`Welcome back, ${user.name}!`)
      setView({ type: "home" })
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword || !signupConfirmPassword) {
      toast.error("Please fill in all fields")
      return
    }
    if (signupPassword !== signupConfirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (signupPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Sign up failed")
        return
      }
      // Show verification screen instead of logging in
      setVerifyEmail(data.user.email)
      setVerificationStep("verify")
      toast.success("Account created! Please verify your email")
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    const fullCode = verifyCode.join("")
    if (fullCode.length !== 6) {
      toast.error("Please enter the full 6-digit code")
      return
    }
    setVerifyLoading(true)
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, code: fullCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Verification failed")
        return
      }
      const user: AuthUser = data.user
      login(user)
      toast.success("Email verified successfully!")
      setView({ type: "home" })
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    setResendLoading(true)
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to send code")
        return
      }
      toast.success("New verification code sent!")
      setResendCooldown(60)
      setVerifyCode(["", "", "", "", "", ""])
      otpRefs.current[0]?.focus()
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setResendLoading(false)
    }
  }

  const handleBackToSignIn = () => {
    setVerificationStep(null)
    setVerifyEmail("")
    setVerifyCode(["", "", "", "", "", ""])
  }

  const handleForgotPassword = () => {
    if (!signinEmail.trim()) {
      toast.error("Please enter your email first, then click Forgot Password")
      return
    }
    toast.success("Password reset link sent to your email!")
  }

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => setView({ type: "home" })}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shopping
        </button>

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25"
          >
            <ShoppingBag className="h-8 w-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-orange-500">Say Shop</h1>
            <p className="text-sm text-muted-foreground">Your one-stop shop for everything</p>
          </div>
        </div>

        {/* Auth Card */}
        <AnimatePresence mode="wait">
          {verificationStep === 'verify' ? (
            /* ── Verification Step ── */
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Card className="border-0 shadow-xl shadow-black/5">
                <CardHeader className="space-y-1 pb-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/50">
                    <KeyRound className="h-6 w-6 text-orange-500" />
                  </div>
                  <CardTitle className="text-xl font-bold">Verify Your Email</CardTitle>
                  <CardDescription className="text-sm">
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold text-foreground">{verifyEmail}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* OTP Input Boxes */}
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {verifyCode.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => { otpRefs.current[index] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={index === 0 ? handleOtpPaste : undefined}
                        className="h-12 w-11 text-center text-lg font-bold sm:h-14 sm:w-14 sm:text-xl focus-visible:ring-orange-500"
                        disabled={verifyLoading}
                      />
                    ))}
                  </div>

                  {/* Verify Button */}
                  <Button
                    onClick={handleVerifyCode}
                    className="w-full bg-orange-500 text-white hover:bg-orange-600"
                    size="lg"
                    disabled={verifyLoading || verifyCode.join("").length !== 6}
                  >
                    {verifyLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Email"
                    )}
                  </Button>

                  {/* Resend Code */}
                  <div className="text-center">
                    <p className="mb-2 text-sm text-muted-foreground">
                      Didn&apos;t receive the code?
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResendCode}
                      disabled={resendLoading || resendCooldown > 0}
                      className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                    >
                      {resendLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Sending...
                        </>
                      ) : resendCooldown > 0 ? (
                        <>
                          <RefreshCw className="mr-2 h-3.5 w-3.5" />
                          Resend in {resendCooldown}s
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-3.5 w-3.5" />
                          Resend Code
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Back to Sign In */}
                  <div className="relative">
                    <Separator className="my-4" />
                    <button
                      onClick={handleBackToSignIn}
                      className="flex items-center gap-2 mx-auto text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Sign In
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                    <span>Your data is encrypted and secure</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            /* ── Sign In / Sign Up Card ── */
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Card className="border-0 shadow-xl shadow-black/5">
                <CardHeader className="space-y-1 pb-4 text-center">
                  <CardTitle className="text-xl font-bold">Welcome</CardTitle>
                  <CardDescription>Sign in to your account or create a new one</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="signin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="signin">Sign In</TabsTrigger>
                      <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>

                    {/* ── Sign In Tab ── */}
                    <TabsContent value="signin">
                      <form onSubmit={handleSignIn} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signin-email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="signin-email"
                              type="email"
                              placeholder="you@example.com"
                              value={signinEmail}
                              onChange={(e) => setSigninEmail(e.target.value)}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="signin-password">Password</Label>
                            <button
                              type="button"
                              onClick={handleForgotPassword}
                              className="text-xs text-orange-500 hover:text-orange-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
                            >
                              Forgot Password?
                            </button>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="signin-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              value={signinPassword}
                              onChange={(e) => setSigninPassword(e.target.value)}
                              className="pl-10 pr-10"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-orange-500 text-white hover:bg-orange-600"
                          size="lg"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing In...
                            </>
                          ) : (
                            "Sign In"
                          )}
                        </Button>

                        <div className="relative">
                          <Separator className="my-4" />
                          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                            secure connection
                          </span>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                          <span>Your data is encrypted and secure</span>
                        </div>
                      </form>
                    </TabsContent>

                    {/* ── Sign Up Tab ── */}
                    <TabsContent value="signup">
                      <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name">Full Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="signup-name"
                              type="text"
                              placeholder="John Doe"
                              value={signupName}
                              onChange={(e) => setSignupName(e.target.value)}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="signup-email"
                              type="email"
                              placeholder="you@example.com"
                              value={signupEmail}
                              onChange={(e) => setSignupEmail(e.target.value)}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-password">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="signup-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Min. 6 characters"
                              value={signupPassword}
                              onChange={(e) => setSignupPassword(e.target.value)}
                              className="pl-10 pr-10"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-confirm">Confirm Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="signup-confirm"
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your password"
                              value={signupConfirmPassword}
                              onChange={(e) => setSignupConfirmPassword(e.target.value)}
                              className="pl-10 pr-10"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-orange-500 text-white hover:bg-orange-600"
                          size="lg"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating Account...
                            </>
                          ) : (
                            "Create Account"
                          )}
                        </Button>

                        <div className="relative">
                          <Separator className="my-4" />
                          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                            secure connection
                          </span>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                          <span>Your data is encrypted and secure</span>
                        </div>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer text */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to Say Shop&apos;s{" "}
          <span className="text-orange-500 hover:underline cursor-pointer">Terms of Service</span>
          {" "}and{" "}
          <span className="text-orange-500 hover:underline cursor-pointer">Privacy Policy</span>
        </p>
      </div>
    </main>
  )
}
