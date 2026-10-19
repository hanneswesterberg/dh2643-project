"use client";

import { Suspense } from 'react';
import SearchBar from './SearchBar';
import Logo from './Logo';
import Login from './Login';
import ThemeToggle from '../ThemeToggle';

interface FullNavbarProps {
  logoOnly?: false;
  loginChange: (state: boolean) => void;
  currentSidebarState: boolean;
  isDarkMode: boolean;
  username: string | null;
  profilePicture: string | null;
}

interface LogoNavbarProps {
  logoOnly: true;
  isDarkMode?: boolean;
  title?: string;
  onThemeChange?: (isDarkMode: boolean) => void;
}

type NavbarProps = FullNavbarProps | LogoNavbarProps;

const Navbar = (props: NavbarProps) => {
  const isDarkMode = props.isDarkMode ?? false;

  if (props.logoOnly) {
    return (
      <nav
        aria-label="Main navigation"
        className={`navbar ${isDarkMode ? 'navbar--dark' : 'navbar--light'}`}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          position: 'relative',
          height: '80px',
          boxSizing: 'border-box',
          padding: '1rem',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Logo isDarkMode={isDarkMode} />
        </div>
        {props.title && (
          <h1
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              margin: 0,
              fontSize: '2.5rem',
              fontWeight: 600,
            }}
          >
            {props.title}
          </h1>
        )}
        {props.onThemeChange && (
          <ThemeToggle
            isDarkMode={isDarkMode}
            onChange={props.onThemeChange}
            style={{ position: 'absolute', right: '16px' }}
          />
        )}
      </nav>
    );
  }

  const {
    loginChange,
    currentSidebarState,
    username,
    profilePicture,
  } = props;

  function handleLogin(): void {
    loginChange(!currentSidebarState);
  }

  return (
    <nav
      className={`navbar ${isDarkMode ? 'navbar--dark' : 'navbar--light'}`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        height: '80px',
        boxSizing: 'border-box',
        padding: '1rem',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Logo isDarkMode={isDarkMode} />
      </div>

      <Suspense fallback={<div className="w-full max-w-md" aria-hidden="true" />}>
        <SearchBar isDarkMode={isDarkMode} />
      </Suspense>

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
