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

export function AuthPage({ prefilledEmail, authMode }: { prefilledEmail?: string; authMode?: 'signin' | 'signup' | 'forgot-password' | 'reset-password' }) {
  const setView = useUIStore((s) => s.setView)
  const { login, isAuthenticated } = useAuthStore()

  // ── Sync with AuthMode prop (Routing) ──
  useEffect(() => {
    if (authMode === 'signup') {
      // In AuthPage, we use Tabs. Value "signup" corresponds to Register.
      // We don't have a direct state for tab other than the defaultValue or DOM.
      // But we can trigger a DOM click or better, handle via internal state if we had it.
      // However, we have verificationStep for sub-flows.
      setVerificationStep(null);
    } else if (authMode === 'forgot-password') {
      setVerificationStep('forgot-verify');
    } else if (authMode === 'reset-password') {
      setVerificationStep('forgot-update');
    } else {
      setVerificationStep(null);
    }
  }, [authMode])

  // Helper to change view and sync URL
  const changeAuthMode = (mode: 'signin' | 'signup' | 'forgot-password' | 'reset-password') => {
     setSigninError(null);
     setSignupError(null);
     setForgotError(null);
     setView({ type: 'auth', authMode: mode, prefilledEmail: signinEmail });
  }

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setView({ type: "home" })
    }
  }, [isAuthenticated, setView])

  // ── Shared state ──
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(authMode === 'signup' ? 'signup' : 'signin')

  useEffect(() => {
    if (authMode === 'signup' || authMode === 'signin') {
      setActiveTab(authMode as 'signin' | 'signup');
    }
  }, [authMode])
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

  const [verificationStep, setVerificationStep] = useState<null | 'verify' | 'forgot-request' | 'forgot-verify' | 'forgot-update'>(null)
  const [resetCode, setResetCode] = useState(["", "", "", "", "", ""])
  const [resetEmail, setResetEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("")
  const [verifyEmail, setVerifyEmail] = useState("")
  const [verifyCode, setVerifyCode] = useState(["", "", "", "", "", ""])
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)
  const [signinError, setSigninError] = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | null>(null)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const resetOtpRefs = useRef<(HTMLInputElement | null)[]>([])

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

  const handleOtpPaste = useCallback((e: React.ClipboardEvent, isReset: boolean = false) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted.length === 0) return
    
    if (isReset) {
      const newCode = [...resetCode]
      for (let i = 0; i < 6; i++) {
        newCode[i] = pasted[i] || ""
      }
      setResetCode(newCode)
      const focusIndex = Math.min(pasted.length, 5)
      resetOtpRefs.current[focusIndex]?.focus()
    } else {
      const newCode = [...verifyCode]
      for (let i = 0; i < 6; i++) {
        newCode[i] = pasted[i] || ""
      }
      setVerifyCode(newCode)
      const focusIndex = Math.min(pasted.length, 5)
      otpRefs.current[focusIndex]?.focus()
    }
  }, [verifyCode, resetCode])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setSigninError(null)
    if (!signinEmail.trim() || !signinPassword) {
      setSigninError("Please fill in all fields")
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
          
          if (data.error === 'Please verify your identity. A verification code was sent to your email.') {
             toast.info("Please verify your identity")
          } else {
             toast.info("Verification code sent to your email")
             try {
               await fetch("/api/auth/send-verification", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ email: data.email }),
               })
             } catch {}
          }
        } else {
          setSigninError(data.error || "Sign in failed")
        }
        return
      }
      const user: AuthUser = data.user
      login(user)
      toast.success(`Welcome back, ${user.name}!`)
      setView({ type: "home" })
    } catch {
      setSigninError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupError(null)
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword || !signupConfirmPassword) {
      setSignupError("Please fill in all fields")
      return
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Passwords do not match")
      return
    }
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters")
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
        setSignupError(data.error || "Sign up failed")
        return
      }
      // Show verification screen
      setVerifyEmail(data.user.email)
      setVerificationStep("verify")
      toast.success("Account created! Please check your email.")
    } catch {
      setSignupError("Network error. Please try again.")
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
      toast.info("Verification code sent!", { duration: 5000 })
      
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
    setForgotError(null)
  }

  const handleForgotPassword = async () => {
    if (!signinEmail.trim()) {
      toast.error("Please enter your email in the box above first")
      return
    }
    setForgotLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signinEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSigninError(data.error || "Failed to initiate reset")
        return
      }
      setResetEmail(signinEmail.trim())
      changeAuthMode('forgot-password')
      toast.info("A security code has been sent to your email")
    } catch {
      toast.error("Network error")
    } finally {
      setForgotLoading(false)
    }
  }

  const handleVerifyResetCode = async () => {
    const fullCode = resetCode.join("")
    if (fullCode.length !== 6) {
      toast.error("Please enter the 6-digit code")
      return
    }
    
    setForgotLoading(true)
    setForgotError(null)
    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, code: fullCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setForgotError(data.error || "Invalid code")
        return
      }
      changeAuthMode('reset-password')
    } catch {
      setForgotError("Verification failed")
    } finally {
      setForgotLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters")
      return
    }
    if (newPassword !== newPasswordConfirm) {
      toast.error("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          code: resetCode.join(""),
          newPassword
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to reset password")
        return
      }
      toast.success("Security key updated! Please log in.")
      setVerificationStep(null)
      setSigninPassword("")
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12 md:py-24">
      {/* Background Ambient Effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute left-[20%] top-[30%] h-[20%] w-[20%] rounded-full bg-indigo-400/5 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => setView({ type: "home" })}
          className="group mb-8 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg pr-4"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 group-hover:bg-blue-600/10 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Back to shopping
        </button>

        {/* Logo Section */}
        <div className="mb-10 flex flex-col items-center gap-6 text-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="group relative"
          >
            <div className="absolute inset-0 animate-pulse rounded-3xl bg-blue-600/10 blur-2xl transition-all group-hover:bg-blue-600/20" />
            <img 
              src="/images/logo-premium.png" 
              alt="SayShop Logo" 
              className="relative h-24 w-auto drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
            />
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              <span className="bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
                Elevate Your Style
              </span>
            </h1>
            <p className="max-w-[280px] mx-auto text-sm font-medium text-muted-foreground/70 leading-relaxed">
              Join thousands of discerning shoppers who choose SayShop for premium quality and exclusive designs.
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <AnimatePresence mode="wait">
          {verificationStep === 'verify' ? (
            /* ── Registration / 2FA Verification Step ── */
            <motion.div
              key="verify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Card className="border-border/40 bg-background/60 backdrop-blur-xl shadow-2xl shadow-black/5 rounded-3xl overflow-hidden">
                <CardHeader className="space-y-1 pb-6 text-center border-b border-border/40 bg-muted/30">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700 shadow-sm border border-blue-600/20">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight">Security Code</CardTitle>
                  <CardDescription className="text-sm font-medium">
                    Please enter the code sent to{" "}
                    <span className="font-bold text-foreground block mt-1">{verifyEmail}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-8">
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
                        className="h-14 w-11 rounded-xl text-center text-xl font-bold sm:h-16 sm:w-14 sm:text-2xl border-border/80 bg-muted/30 focus-visible:bg-background focus-visible:border-blue-600 focus-visible:ring-blue-600/20 transition-all shadow-sm"
                        disabled={verifyLoading}
                      />
                    ))}
                  </div>

                  <div className="space-y-4">
                    <Button
                      onClick={handleVerifyCode}
                      className="w-full h-14 rounded-2xl bg-blue-700 text-white hover:bg-orange-700 shadow-lg shadow-blue-700/20 text-md font-bold transition-all hover:scale-[1.01] active:scale-[0.99]"
                      size="lg"
                      disabled={verifyLoading || verifyCode.join("").length !== 6}
                    >
                      {verifyLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Verify & Continue"}
                    </Button>

                    <div className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResendCode}
                        disabled={resendLoading || resendCooldown > 0}
                        className="h-10 px-4 rounded-xl text-blue-700 hover:text-orange-700 hover:bg-blue-50/50 dark:hover:bg-orange-950/20"
                      >
                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Security Code"}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40">
                    <button
                      onClick={handleBackToSignIn}
                      className="flex items-center gap-2 mx-auto py-2 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground focus-visible:outline-none"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Login
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : verificationStep === 'forgot-verify' ? (
            /* ── Forgot Password: Code Entry Step ── */
            <motion.div
              key="forgot-verify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border-border/40 bg-background/60 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                <CardHeader className="text-center border-b border-border/40 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/20 text-orange-600">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Identity Check</CardTitle>
                  <CardDescription className="px-6">Enter the reset code sent to your email.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                  <div className="flex justify-center gap-2">
                    {resetCode.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => { resetOtpRefs.current[index] = el }}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onPaste={index === 0 ? (e) => handleOtpPaste(e, true) : undefined}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(-1);
                          const newCode = [...resetCode];
                          newCode[index] = val;
                          setResetCode(newCode);
                          if(val && index < 5) resetOtpRefs.current[index + 1]?.focus();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !resetCode[index] && index > 0) {
                            resetOtpRefs.current[index - 1]?.focus()
                          }
                        }}
                        className="h-14 w-11 rounded-xl text-center text-xl font-bold border-zinc-200 dark:border-zinc-800"
                      />
                    ))}
                  </div>

                  {forgotError && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/20 py-2 rounded-lg border border-red-500/20"
                    >
                      {forgotError}
                    </motion.p>
                  )}

                  <Button
                    onClick={handleVerifyResetCode}
                    disabled={forgotLoading}
                    className="w-full h-12 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 uppercase font-black text-xs tracking-widest flex items-center justify-center gap-2"
                  >
                    {forgotLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm Code
                  </Button>
                  <button onClick={handleBackToSignIn} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-zinc-800 flex items-center justify-center gap-2">
                    <ArrowLeft className="h-3 w-3" /> Cancel Reset
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          ) : verificationStep === 'forgot-update' ? (
            /* ── Forgot Password: New Password Step ── */
            <motion.div
              key="forgot-update"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border-border/40 bg-background/60 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                <CardHeader className="text-center border-b border-border/40 bg-zinc-50/50 dark:bg-zinc-900/50">
                   <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Update Credentials</CardTitle>
                  <CardDescription>Enter your new secure access key.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-8">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest">New Security Key</Label>
                    <Input 
                      type="password" 
                      placeholder="Min. 6 characters" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest">Confirm Key</Label>
                    <Input 
                      type="password" 
                      placeholder="Repeat your new key" 
                      value={newPasswordConfirm}
                      onChange={e => setNewPasswordConfirm(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <Button
                    onClick={handleUpdatePassword}
                    disabled={loading}
                    className="w-full h-13 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 uppercase font-black text-xs tracking-widest mt-4"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save New Credentials"}
                  </Button>
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
              <Card className="border-border/40 bg-background/60 backdrop-blur-xl shadow-2xl shadow-black/5 rounded-3xl overflow-hidden">
                <Tabs value={activeTab} onValueChange={(v) => changeAuthMode(v as any)} className="w-full">
                  <div className="p-2 border-b border-border/40 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-zinc-200/50 dark:bg-zinc-800/50 p-1.5 h-14">
                      <TabsTrigger value="signin" className="h-full rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-black uppercase tracking-tighter text-xs">Sign In</TabsTrigger>
                      <TabsTrigger value="signup" className="h-full rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-black uppercase tracking-tighter text-xs">Register</TabsTrigger>
                    </TabsList>
                  </div>

                  <CardContent className="pt-8">
                    {/* ── Sign In Tab ── */}
                    <TabsContent value="signin" className="space-y-6 mt-0 outline-none">
                      <form onSubmit={handleSignIn} className="space-y-5">
                        <div className="space-y-2.5">
                          <Label htmlFor="signin-email" className="text-sm font-bold ml-1">Email Address</Label>
                          <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-blue-600">
                             <Mail className="h-4 w-4" />
                            </div>
                            <Input
                              id="signin-email"
                              type="email"
                              placeholder="you@example.com"
                              value={signinEmail}
                              onChange={(e) => setSigninEmail(e.target.value)}
                              className="h-12 pl-11 rounded-2xl border-border/80 bg-background/50 focus-visible:bg-background focus-visible:border-blue-600 focus-visible:ring-blue-600/20 transition-all font-medium"
                              required
                            />
                          </div>
                          {signinError && (
                            <motion.p
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs font-bold text-red-500 mt-1.5 ml-1"
                            >
                              {signinError}
                            </motion.p>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between ml-1">
                            <Label htmlFor="signin-password" className="text-sm font-bold">Password</Label>
                            <button
                              type="button"
                              onClick={handleForgotPassword}
                              disabled={forgotLoading}
                              className="text-xs font-bold text-blue-700 hover:text-orange-700 transition-colors flex items-center gap-2"
                            >
                              {forgotLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                              Forgot Password?
                            </button>
                          </div>
                          <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-blue-600">
                               <Lock className="h-4 w-4" />
                            </div>
                            <Input
                              id="signin-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your security key"
                              value={signinPassword}
                              onChange={(e) => setSigninPassword(e.target.value)}
                              className="h-12 pl-11 pr-11 rounded-2xl border-border/80 bg-background/50 focus-visible:bg-background focus-visible:border-blue-600 focus-visible:ring-blue-600/20 transition-all font-medium"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-blue-600 transition-colors focus-visible:outline-none"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-13 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-xl shadow-zinc-900/10 dark:shadow-white/5 text-sm font-black uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.99] mt-2 group"
                          size="lg"
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <span className="flex items-center gap-2">
                              Access Account
                              <ShieldCheck className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </span>
                          )}
                        </Button>

                        <div className="relative my-6">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border/60" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background/60 backdrop-blur-md px-3 text-muted-foreground font-bold tracking-wider">
                              Or continue with
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => window.location.href = '/api/auth/google'}
                          className="w-full h-12 rounded-xl border border-border/80 bg-background/50 backdrop-blur-sm text-foreground hover:bg-background/80 shadow-sm text-sm font-bold transition-all"
                        >
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                            <path d="M1 1h22v22H1z" fill="none" />
                          </svg>
                          Sign in with Google
                        </Button>
                      </form>
                    </TabsContent>

                    {/* ── Sign Up Tab ── */}
                    <TabsContent value="signup" className="space-y-6 mt-0 outline-none">
                      <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name" className="text-sm font-bold ml-1">Full Name</Label>
                          <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-blue-600">
                               <User className="h-4 w-4" />
                            </div>
                            <Input
                              id="signup-name"
                              type="text"
                              placeholder="How should we call you?"
                              value={signupName}
                              onChange={(e) => setSignupName(e.target.value)}
                              className="h-12 pl-11 rounded-2xl border-border/80 bg-background/50 focus-visible:bg-background focus-visible:border-blue-600 focus-visible:ring-blue-600/20 transition-all"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-email" className="text-sm font-bold ml-1">Email Address</Label>
                          <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-blue-600">
                             <Mail className="h-4 w-4" />
                            </div>
                            <Input
                              id="signup-email"
                              type="email"
                              placeholder="you@example.com"
                              value={signupEmail}
                              onChange={(e) => setSignupEmail(e.target.value)}
                              className="h-12 pl-11 rounded-2xl border-border/80 bg-background/50 focus-visible:bg-background focus-visible:border-blue-600 focus-visible:ring-blue-600/20 transition-all font-medium"
                              required
                            />
                          </div>
                          {signupError && (
                            <motion.p
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs font-bold text-red-500 mt-1.5 ml-1"
                            >
                              {signupError}
                            </motion.p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="signup-password" className="text-sm font-bold ml-1">Password</Label>
                            <div className="relative group">
                              <Input
                                id="signup-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Min. 6"
                                value={signupPassword}
                                onChange={(e) => setSignupPassword(e.target.value)}
                                className="h-12 px-4 rounded-2xl border-border/80 bg-background/50 focus-visible:bg-background focus-visible:border-blue-600 focus-visible:ring-blue-600/20 transition-all"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signup-confirm" className="text-sm font-bold ml-1">Confirm</Label>
                            <div className="relative group">
                               <Input
                                id="signup-confirm"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Match password"
                                value={signupConfirmPassword}
                                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                                className="h-12 px-4 rounded-2xl border-border/80 bg-background/50 focus-visible:bg-background focus-visible:border-blue-600 focus-visible:ring-blue-600/20 transition-all"
                                required
                              />
                            </div>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-13 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-xl shadow-zinc-900/10 dark:shadow-white/5 text-sm font-black uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.99] mt-4 group"
                          size="lg"
                          disabled={loading}
                        >
                          {loading ? (
                             <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <span className="flex items-center gap-2">
                              Create Profile
                              <ArrowLeft className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity rotate-180" />
                            </span>
                          )}
                        </Button>

                        <div className="relative my-6">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border/60" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background/60 backdrop-blur-md px-3 text-muted-foreground font-bold tracking-wider">
                              Or continue with
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => window.location.href = '/api/auth/google'}
                          className="w-full h-12 rounded-xl border border-border/80 bg-background/50 backdrop-blur-sm text-foreground hover:bg-background/80 shadow-sm text-sm font-bold transition-all"
                        >
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                            <path d="M1 1h22v22H1z" fill="none" />
                          </svg>
                          Sign up with Google
                        </Button>
                      </form>
                    </TabsContent>

                    <div className="mt-8 pt-6 border-t border-border/40 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground/80">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span>256-bit SSL Secure Encryption</span>
                      </div>
                    </div>
                  </CardContent>
                </Tabs>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer text */}
        <p className="mt-10 text-center text-[11px] text-muted-foreground/60 font-medium uppercase tracking-widest leading-relaxed">
          Secure access signifies agreement to our <br className="sm:hidden" />
          <span className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 transition-colors cursor-pointer underline underline-offset-4">Terms of Service</span>
          {" "} & {" "}
          <span className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 transition-colors cursor-pointer underline underline-offset-4">Privacy Framework</span>
        </p>
      </div>
    </main>
  )
}
