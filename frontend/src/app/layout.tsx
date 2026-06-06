import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wordlelo — daily word game on Celo",
  description:
    "A faithful Wordle clone: one 5-letter puzzle a day, settled on Celo.",
  applicationName: "Wordlelo",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Wordlelo", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121213" },
  ],
};

const THEME_BOOTSTRAP = `try{var s=JSON.parse(localStorage.getItem("wordlelo:settings")||"{}");var d=typeof s.dark==="boolean"?s.dark:matchMedia("(prefers-color-scheme: dark)").matches;var e=document.documentElement;e.dataset.theme=d?"dark":"light";if(s.colorblind)e.dataset.colorblind="true";}catch(_){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
