import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Josefin_Sans } from "next/font/google";
import { GameProvider } from "@/context/GameContext";
import PostHogProvider from "@/components/PostHogProvider";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const josefinSans = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Date Night Games",
  description: "Conversation run dry? Shuffle the deck.",
  manifest: "/manifest.json",
  icons: {
    icon: "/qh-favicon.png",
    apple: "/qh-favicon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Date Night",
  },
  openGraph: {
    title: "Date Night Games",
    description: "Conversation run dry? Shuffle the deck.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSerif.variable} ${josefinSans.variable} antialiased`}>
        <PostHogProvider>
          <GameProvider>{children}</GameProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
