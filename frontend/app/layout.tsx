import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
//import NavBar from "./components/navbar/Navbar";
//import { useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ballad",
  description: "Concert event finder application.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  //const [search, setSearch] = useState('');

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* <NavBar search={search} onSearchChange={setSearch}/> */}
        {children}
      </body>
    </html>
  );
}
