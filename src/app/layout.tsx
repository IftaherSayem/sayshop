import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Say Shop - Premier Luxury E-Commerce",
  description:
    "Discover the latest premium electronics, luxury gadgets, and elite tech accessories at unbeatable prices. Experience the next level of online shopping.",
  keywords: [
    "Say Shop",
    "premium e-commerce",
    "luxury electronics",
    "exclusive gadgets",
    "high-end tech",
  ],
  metadataBase: new URL('https://sayshop.example.com'),
  openGraph: {
    title: 'Say Shop - Premier Luxury E-Commerce',
    description: 'Experience the next level of online shopping with our curated collection of luxury electronics and gadgets.',
    url: 'https://sayshop.example.com',
    siteName: 'Say Shop',
    images: [
      {
        url: '/images/logo-premium.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Say Shop - Premier Luxury E-Commerce',
    description: 'Experience the next level of online shopping with our curated collection of luxury electronics and gadgets.',
    images: ['/images/logo-premium.png'],
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
