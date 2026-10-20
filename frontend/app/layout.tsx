import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./components/Map.css";
import "./components/MapFilterBox.css";
import "./components/Navbar.css";
import "./components/Profile.css";
import "./components/Sidebar.css";
import "./components/SavedEvents.css";
import "./components/LoginPopup.css";
import "./components/NavigationLinks.css";
import "./components/SearchBar.css";
import SystemMessageProvider from "./components/SystemMessageProvider";
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
      className={`app-root ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="app-root__body">
        {/* <NavBar search={search} onSearchChange={setSearch}/> */}
        <SystemMessageProvider>{children}</SystemMessageProvider>
      </body>
    </html>
  );
}
