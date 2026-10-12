"use client"
import React from 'react';
import SearchBar from './SearchBar'; //'@/components/navbar/SearchBar/SearchBar'
import Logo from './Logo';
import NavigationLinks from './NavigationLinks';
import Login from './Login'; // Import the Login component
//import useIsMobile from '@/hooks/useIsMobile';
//import NavbarMobile from '@/components/navbar/NavbarMobile/NavbarMobile';

interface NavbarProps {
    search: string;
    onSearchChange: (value: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ search, onSearchChange }) => {
  //const isMobile = useIsMobile();

  /*if (isMobile) {
    return <NavbarMobile />;
  }*/

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', alignItems: 'center' }}>
      {/* Logo and Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Logo />
        {/* <NavigationLinks /> */}
      </div>

      {/* Search Bar */}
      <SearchBar value={search} onChange={onSearchChange} />

      {/* Login icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Login />
      </div>
    </nav>
  );
};

export default Navbar;