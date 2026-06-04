import type { Metadata, Viewport } from "next";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL 
  ? process.env.NEXT_PUBLIC_APP_URL 
  : process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Hudi Datel Care | Enterprise Clinic Management",
  description: "Advanced healthcare operations, EHR, and telehealth by Hudi-Soft.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png", sizes: "512x512" },
      { url: "/logo-192.png", type: "image/png", sizes: "192x192" },
      { url: "/logo-144.png", type: "image/png", sizes: "144x144" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "Hudi Datel Care",
    description: "Enterprise clinical management system by Hudi-Soft",
    images: [{ url: "/logo-512.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white selection:bg-clinical-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
