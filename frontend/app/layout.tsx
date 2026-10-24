import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Mumbai AirSense AI — Atmospheric Telemetry & Neural Forecasting",
  description:
    "Developer-grade environmental intelligence platform for the Mumbai Metropolitan Region (MMR). Continuous CAAQMS telemetry, official Indian CPCB NAQI calculation, and 7-day multi-model forecasting with PyTorch LSTM, Prophet, and ARIMA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark notranslate" translate="no">
      <body className="min-h-screen bg-black text-neutral-100 antialiased flex flex-col justify-between selection:bg-neutral-800 selection:text-neutral-100 font-sans">
        <AuthProvider>
          <div className="flex-1 flex flex-col">
            <Navbar />
            <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 flex-1">
              {children}
            </main>
          </div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
