"use client"
import ConcertMap from './components/Map';
import NavBar from './components/navbar/Navbar';

import {useState} from 'react';


export default function Home() {
  const [search, setSearch] = useState('');

  return (
    <main>
      <NavBar search={search} onSearchChange={setSearch} />
      {/* <ConcertMap /> */}
    </main>
  );
}