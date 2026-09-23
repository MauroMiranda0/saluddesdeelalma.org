import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Salud desde el Alma",
  description: "Sistema de gestion del consultorio Salud desde el Alma",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg"
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
