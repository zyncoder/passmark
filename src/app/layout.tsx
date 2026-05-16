import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Passmark — Event Accreditation Platform",
    template: "%s | Passmark",
  },
  description:
    "The modern accreditation platform for event organizers. Issue vendor passes, manage media approvals, and streamline security — all in one place.",
  keywords: [
    "accreditation",
    "event management",
    "vendor passes",
    "credential management",
    "media accreditation",
    "event security",
  ],
  authors: [{ name: "Passmark" }],
  manifest: "/manifest.webmanifest",
  applicationName: "Passmark",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Passmark",
  },
  openGraph: {
    title: "Passmark — Event Accreditation Platform",
    description:
      "Issue vendor passes, manage media approvals, and streamline event security.",
    url: "https://passmark.in",
    siteName: "Passmark",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Passmark — Event Accreditation Platform",
    description:
      "The modern accreditation platform for event organizers.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#1B4FD8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

import { Toaster } from "@/components/ui/toaster";
import { PWARegister } from "@/components/PWARegister";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
        <PWARegister />
      </body>
    </html>
  );
}
