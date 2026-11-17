import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Infiniti | Your network, in focus",
  description: "Infiniti is a modern CRM for meaningful connections and clearer customer relationships.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased">{children}</body></html>;
}
