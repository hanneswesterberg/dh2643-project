"use client";

import SearchBar from './SearchBar';
import Logo from './Logo';
import Login from './Login';

interface NavbarProps {
  loginChange: (state: boolean) => void;
  currentSidebarState: boolean;
  isDarkMode: boolean;
  username: string | null;
  profilePicture: string | null;
}

const Navbar = ({
  loginChange,
  currentSidebarState,
  isDarkMode,
  username,
  profilePicture,
}: NavbarProps) => {
  function handleLogin(): void {
    loginChange(!currentSidebarState);
  }

  return (
    <nav
      className={`navbar ${isDarkMode ? 'navbar--dark' : 'navbar--light'}`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '1rem',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Logo isDarkMode={isDarkMode} />
      </div>

      <SearchBar isDarkMode={isDarkMode} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Login
          onLogin={handleLogin}
          username={username}
          profilePicture={profilePicture}
        />
      </div>
    </nav>
  );
};

export default Navbar;
