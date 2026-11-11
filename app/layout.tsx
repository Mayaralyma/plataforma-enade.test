import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ENADE | Simulados interativos",
  description: "Pratique com questões do ENADE, acompanhe seu desempenho e organize provas anteriores.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
