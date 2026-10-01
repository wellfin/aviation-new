import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Manrope, Open_Sans, Poppins } from "next/font/google";
import { AuthProvider } from "@/lib/auth/auth-context";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter-face", subsets: ["latin"], display: "swap" });
const openSans = Open_Sans({ variable: "--font-open-sans-face", subsets: ["latin"], display: "swap" });
const poppins = Poppins({ variable: "--font-poppins-face", subsets: ["latin"], weight: "600", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Global Aviation Services Directory — Your Aviation Command Center",
    template: "%s | Global Aviation Services Directory",
  },
  description:
    "Search 50,000+ verified aviation service providers — FBOs, ground handlers, fuel, catering, MRO and charter operators — plus live METAR, TAF and NOTAMs for 12,000+ airports.",
  openGraph: { type: "website", siteName: "Global Aviation Services Directory" },
};

export const viewport: Viewport = { themeColor: "#0b1f3a" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${manrope.variable} ${jetbrainsMono.variable} ${inter.variable} ${poppins.variable} ${openSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
