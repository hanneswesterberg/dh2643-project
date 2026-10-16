'use client'
import ConcertMap from './components/Map';
import NavBar from './components/navbar/Navbar';
import { useState } from 'react';
import SideBar from './components/sidebar/Sidebar';

export default function Home() {
  const [search, setSearch] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="relative z-50 shrink-0">
      <NavBar
        search={search}
        onSearchChange={setSearch}
        loginChange={setSidebarOpen}
        currentSidebarState={isSidebarOpen}/>
      </header>
      <SideBar isOpen={isSidebarOpen}></SideBar>
      <ConcertMap />
    </main>
  );
}