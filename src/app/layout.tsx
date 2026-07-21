import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Nav from "@/components/Nav";
import SWRegister from "@/components/SWRegister";

export const metadata: Metadata = {
  title: "Aferições - Controle de Bombas",
  description: "Registro de aferições de bombas de combustível",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aferições",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SWRegister />
          <div className="flex min-h-screen">
            <Nav />
            <main className="flex-1 pb-20 md:pb-0">
              <div className="max-w-5xl mx-auto p-4 md:p-8">{children}</div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
