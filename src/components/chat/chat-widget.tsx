'use client'

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageCircle,
  X,
  Send,
  ShoppingBag,
  Sparkles,
  Package,
  Tag,
  Truck,
} from "lucide-react"

interface ChatMessage {
  id: string
  role: "user" | "bot"
  content: string
  timestamp: Date
}

const QUICK_ACTIONS = [
  { label: "Find Products", icon: ShoppingBag, message: "I'm looking for products. Can you help me find something?" },
  { label: "Track Order", icon: Package, message: "I'd like to track my order. How can I do that?" },
  { label: "Apply Coupon", icon: Tag, message: "What coupon codes are available? I'd like to apply one." },
  { label: "Shipping Info", icon: Truck, message: "Can you tell me about your shipping options and policies?" },
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex items-center gap-1">
        <span className="sr-only">AI is typing</span>
        <motion.span
          className="h-2 w-2 rounded-full bg-blue-400"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-blue-400"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-blue-400"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
        />
      </div>
    </div>
  )
}

import { useAuthStore } from "@/stores/auth-store"

export function ChatWidget() {
  const { isAuthenticated, _hydrated } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      content: "Hi! I'm your AI shopping assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatPanelRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 400)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isTyping) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    try {
      const chatHistory = [
        ...messages,
        userMessage,
      ].map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      })

      const data = await res.json()

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "bot",
        content: data.message || "Sorry, I couldn't process your request.",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])
    } catch {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "bot",
        content: "I'm sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }, [messages, isTyping])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuickAction = (message: string) => {
    sendMessage(message)
  }

  if (!_hydrated || !isAuthenticated) return null

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-6">
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            ref={chatPanelRef}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="mb-2 flex h-[500px] max-h-[70vh] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl sm:w-[380px]"
            role="dialog"
            aria-label="AI Shopping Assistant"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="text-sm font-semibold">Say Shop AI</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[11px] text-blue-100">Online</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="flex flex-col gap-3">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                        msg.role === "bot"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {msg.role === "bot" ? (
                        <ShoppingBag className="h-3.5 w-3.5" />
                      ) : (
                        "U"
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "rounded-br-md bg-blue-600 text-white"
                          : "rounded-bl-md bg-muted text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <ShoppingBag className="h-3.5 w-3.5" />
                    </div>
                    <div className="rounded-2xl rounded-bl-md bg-muted">
                      <TypingIndicator />
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions (only show when bot has responded and not typing) */}
              {!isTyping && messages.length <= 2 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 flex flex-wrap gap-2"
                >
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon
                    return (
                      <button
                        key={action.label}
                        onClick={() => handleQuickAction(action.message)}
                        className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                      >
                        <Icon className="h-3 w-3" />
                        {action.label}
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 border-t bg-muted px-3 py-2.5">
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isTyping}
                  className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                  aria-label="Chat message input"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30 transition-shadow hover:shadow-xl hover:shadow-blue-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 mt-4"
            aria-label="Open AI Assistant"
          >
            <MessageCircle className="h-6 w-6" />
            
            {/* Hover Tooltip */}
            <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              AI Assistant
              <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
