import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NetworkProvider } from "@/context/NetworkContext";
import { SyncProgressPopup } from "@/components/ui/SyncProgressPopup";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "One Acre Fund Nigeria — Offline Farmer Registration & Admin Portal",
  description:
    "Offline-first farmer registration application and synchronization engine for rural field officers and central operations in Nigeria.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-sans text-[#0E121B] bg-[#F8FAFC]"
        suppressHydrationWarning
      >
        <NetworkProvider>
          {children}
          <SyncProgressPopup />
          <Toaster position="top-right" richColors closeButton />
        </NetworkProvider>
      </body>
    </html>
  );
}
