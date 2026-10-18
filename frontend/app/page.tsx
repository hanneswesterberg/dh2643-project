'use client'
import ConcertMap from './components/Map';
import NavBar from './components/navbar/Navbar';
import { useState } from 'react';
import SideBar from './components/sidebar/Sidebar';

export default function Home() {
  const [search, setSearch] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <main
      className="flex h-screen flex-col overflow-hidden"
      data-theme={isDarkMode ? 'dark' : 'light'}
    >
      <header className="relative z-50 shrink-0">
        <NavBar
          search={search}
          onSearchChange={setSearch}
          loginChange={setSidebarOpen}
          currentSidebarState={isSidebarOpen}
          isDarkMode={isDarkMode}
          onDarkModeChange={setIsDarkMode}
        />
      </header>
      <SideBar isOpen={isSidebarOpen} />
      <ConcertMap isDarkMode={isDarkMode} />
    </main>
  );
}