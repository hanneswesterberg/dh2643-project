"use client"
import ConcertMap from './components/Map';
import NavBar from './components/navbar/Navbar';

import {useState} from 'react';


export default function Home() {
  const [search, setSearch] = useState('');

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="relative z-50 shrink-0">
      <NavBar search={search} onSearchChange={setSearch} />
      </header>
      <ConcertMap />
    </main>
  );
}