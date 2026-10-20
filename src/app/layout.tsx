import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GameHub — Your Gaming Home",
  description: "GameHub is a Discord-like gaming platform with servers, clans, voice channels, quests, and activities. Find your squad, drop in, and play.",
  keywords: ["GameHub", "Discord", "Gaming", "Voice", "Clans", "Servers", "Next.js"],
  authors: [{ name: "GameHub" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <Sonner
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#3d302a",
              border: "1px solid #1a1310",
              color: "#f5e6c8",
            },
          }}
        />
      </body>
    </html>
  );
}
