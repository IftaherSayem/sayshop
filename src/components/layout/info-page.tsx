'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Info, 
  Target, 
  Users, 
  Globe, 
  Briefcase, 
  Newspaper, 
  BookOpen, 
  HelpCircle, 
  Truck, 
  Mail, 
  MapPin, 
  Phone,
  MessageSquare,
  Clock,
  ShieldCheck,
  Zap,
  Scale,
  FileText,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface InfoContent {
  title: string
  subtitle: string
  icon: React.ReactNode
  sections: {
    title: string
    content: string
    icon?: React.ReactNode
  }[]
}

const CONTENT_MAP: Record<string, InfoContent> = {
  about: {
    title: "About SayShop",
    subtitle: "Pioneering the future of premium tech commerce.",
    icon: <Info className="h-8 w-8 text-blue-600" />,
    sections: [
      {
        title: "Our Mission",
        content: "To provide a seamless, premium shopping experience for tech enthusiasts worldwide, bridging the gap between cutting-edge innovation and everyday accessibility.",
        icon: <Target className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Our Story",
        content: "Founded in 2024, SayShop began with a simple idea: that buying technology should be as innovative as the technology itself. We've grown from a small startup to a leading destination for premium electronics.",
        icon: <Globe className="h-5 w-5 text-blue-500" />
      },
      {
        title: "The Team",
        content: "Our team consists of tech experts, designers, and innovators who are passionate about bringing the best products to your doorstep.",
        icon: <Users className="h-5 w-5 text-blue-500" />
      }
    ]
  },
  careers: {
    title: "Join Our Team",
    subtitle: "Help us shape the future of tech commerce.",
    icon: <Briefcase className="h-8 w-8 text-blue-600" />,
    sections: [
      {
        title: "Innovation First",
        content: "We're always looking for talented individuals who aren't afraid to push boundaries and think differently.",
        icon: <Zap className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Our Culture",
        content: "Work in an environment that values creativity, collaboration, and continuous learning. We believe in empowering our employees to grow.",
        icon: <Users className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Open Positions",
        content: "We're currently hiring for Frontend Developers, Product Managers, and UX Designers. Check back often for new opportunities.",
        icon: <Briefcase className="h-5 w-5 text-blue-500" />
      }
    ]
  },
  shipping: {
    title: "Shipping Info",
    subtitle: "Fast, reliable, and secure delivery worldwide.",
    icon: <Truck className="h-8 w-8 text-blue-600" />,
    sections: [
      {
        title: "Standard Shipping",
        content: "Delivered within 3-5 business days. Free for orders over $50.",
        icon: <Clock className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Express Delivery",
        content: "Need it faster? Choose Express at checkout for 1-2 day delivery.",
        icon: <Zap className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Secure Packaging",
        content: "Every item is double-checked and professionally packed to ensure it arrives in perfect condition.",
        icon: <ShieldCheck className="h-5 w-5 text-blue-500" />
      }
    ]
  },
  contact: {
    title: "Contact Us",
    subtitle: "We're here to help you with anything you need.",
    icon: <Mail className="h-8 w-8 text-blue-600" />,
    sections: [
      {
        title: "Email Support",
        content: "support@sayshop.com - We aim to respond within 24 hours.",
        icon: <Mail className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Live Chat",
        content: "Available 24/7 via the chat bubble in the bottom right of your screen.",
        icon: <MessageSquare className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Headquarters",
        content: "123 Tech Plaza, Silicon Valley, CA 94025, United States.",
        icon: <MapPin className="h-5 w-5 text-blue-500" />
      }
    ]
  },
  help: {
    title: "Help Center",
    subtitle: "Find answers and solve issues instantly.",
    icon: <HelpCircle className="h-8 w-8 text-blue-600" />,
    sections: [
      {
        title: "FAQs",
        content: "Browse our extensive library of frequently asked questions to find quick answers.",
        icon: <BookOpen className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Order Tracking",
        content: "Use our real-time tracker to see exactly where your package is.",
        icon: <Truck className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Returns & Refunds",
        content: "Easy 30-day returns. Start a return process directly from your orders page.",
        icon: <ShieldCheck className="h-5 w-5 text-blue-500" />
      }
    ]
  },
  "terms-and-conditions": {
    title: "Terms & Conditions",
    subtitle: "The legal framework for using SayShop services.",
    icon: <Scale className="h-8 w-8 text-blue-600" />,
    sections: [
      {
        title: "User Agreement & Eligibility",
        content: "By accessing SayShop, you represent that you are at least 18 years old and agree to comply with our service standards. You are responsible for maintaining the confidentiality of your account and security keys.",
        icon: <FileText className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Intellectual Property",
        content: "All content on this platform, including logos, designs, and text, is the exclusive property of SayShop. Unauthorized use or reproduction is strictly prohibited and protected by international copyright laws.",
        icon: <Zap className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Data Privacy & Security",
        content: "We implement enterprise-grade security protocols to protect your data. Your information is processed in accordance with our Privacy Framework and is never disclosed to third parties without your explicit consent.",
        icon: <Lock className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Purchasing & Transaction Terms",
        content: "Prices and availability are subject to change without notice. We reserve the right to refuse or cancel any order for reasons including inventory limits, pricing errors, or suspicion of fraudulent activity.",
        icon: <ShieldCheck className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Limitation of Liability",
        content: "SayShop provides services 'as is' without warranties. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform or any products purchased through it.",
        icon: <Scale className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Termination of Service",
        content: "We reserve the right to suspend or terminate access to our services at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users or our business interests.",
        icon: <FileText className="h-5 w-5 text-blue-500" />
      },
      {
        title: "Governing Law & Disputes",
        content: "These terms are governed by the laws of the jurisdiction in which we operate. Any disputes shall be resolved through binding arbitration or in the appropriate courts of said jurisdiction.",
        icon: <ShieldCheck className="h-5 w-5 text-blue-500" />
      }
    ]
  }
}

const DEFAULT_CONTENT: InfoContent = {
  title: "Information",
  subtitle: "Everything you need to know about SayShop.",
  icon: <Info className="h-8 w-8 text-blue-600" />,
  sections: [
    {
      title: "Content Unavailable",
      content: "We're currently updating this section. Please check back later.",
      icon: <Clock className="h-5 w-5 text-blue-500" />
    }
  ]
}

export function InfoPage({ slug }: { slug: string }) {
  const content = CONTENT_MAP[slug.toLowerCase()] || DEFAULT_CONTENT

  return (
    <main className="min-h-screen bg-background pb-12">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden bg-neutral-950 py-20 text-white">
        {/* Abstract Background Glows */}
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute right-1/4 bottom-0 h-96 w-96 translate-x-1/2 rounded-full bg-indigo-600/10 blur-[100px]" />

        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
              {content.icon}
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {content.title}
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-neutral-400">
              {content.subtitle}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto -mt-12 px-4">
        <div className="grid gap-8 lg:grid-cols-3">
          {content.sections.map((section, idx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="h-full border-none shadow-xl shadow-neutral-200/50 dark:shadow-none bg-white dark:bg-neutral-900 overflow-hidden">
                <CardContent className="p-8">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
                    {section.icon}
                  </div>
                  <h3 className="mb-4 text-xl font-bold">{section.title}</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {section.content}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="rounded-3xl bg-blue-600 px-8 py-12 text-white">
            <h2 className="mb-4 text-3xl font-bold">Have more questions?</h2>
            <p className="mb-8 text-blue-100">Our team is always ready to help you find the perfect tech solution.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-neutral-100 font-bold px-8">
                Contact Support
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 font-bold px-8">
                Learn More
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
