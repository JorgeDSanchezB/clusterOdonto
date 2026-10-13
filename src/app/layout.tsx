import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "OdontoSite — SaaS para Consultorios Odontológicos",
  description:
    "Template SaaS multi-tenant para consultorios odontológicos: web pública editable, agenda con reservas en línea, pedidos por WhatsApp y facturación PDF. Demo: Clínica Dental Sonrisa Andina (Quito, Ecuador).",
  keywords: ["odontología", "SaaS", "multi-tenant", "Ecuador", "reservas", "facturación"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* 4 tipografías curadas del motor de temas (con fallback de sistema) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Playfair+Display:wght@500;600;700&family=Montserrat:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}