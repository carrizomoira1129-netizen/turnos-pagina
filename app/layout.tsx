import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TurnosPro - Reserva de Turnos Online",
  description: "Sistema profesional de reserva de turnos online. Agendá tu turno de forma fácil y rápida.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#0D0D0D] antialiased`}>
        {children}
      </body>
    </html>
  );
}
