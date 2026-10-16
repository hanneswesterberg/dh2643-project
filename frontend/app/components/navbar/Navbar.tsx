"use client"
import React from 'react';
import { useRouter } from "next/navigation";
import SearchBar from './SearchBar'; //'@/components/navbar/SearchBar/SearchBar'
import Logo from './Logo';
//import NavigationLinks from './NavigationLinks';
import Login from './Login';
import { useAuth } from "../Lib/AuthContext";
//import useIsMobile from '@/hooks/useIsMobile';
//import NavbarMobile from '@/components/navbar/NavbarMobile/NavbarMobile';


interface NavbarProps {
    search: string;
    onSearchChange: (value: string) => void;
    loginChange: (state: boolean) => void;
    currentSidebarState: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ search, onSearchChange, loginChange, currentSidebarState }) => {
  const router = useRouter();
  const { status, refreshAuth } = useAuth();
  //const isMobile = useIsMobile();

  /*if (isMobile) {
    return <NavbarMobile />;
  }*/

  function handleAccountAction(): void {
    if (status === "authenticated") {
      loginChange(!currentSidebarState);
    } else if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "error") {
      void refreshAuth().catch(() => undefined);
    }
  }

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', alignItems: 'center' }}>
      {/* Logo and Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Logo />
        {/* <NavigationLinks /> */}
      </div>

      {/* Search Bar */}
      <SearchBar />

      {/* Login icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Login
          onLogin={handleAccountAction}
          label={
            status === "loading" ? "Checking..." :
            status === "authenticated" ? "Profile" :
            status === "error" ? "Retry" : "Sign In"
          }
          disabled={status === "loading"}
        />
      </div>
    </nav>
  );
};

export default Navbar;