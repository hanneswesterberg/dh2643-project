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
        className={`navbar navbar--logo-only ${isDarkMode ? 'navbar--dark' : 'navbar--light'}`}
      >
        <div className="navbar__group">
          <Logo isDarkMode={isDarkMode} />
        </div>
        {props.title && (
          <h1 className="navbar__title">
            {props.title}
          </h1>
        )}
        {props.onThemeChange && (
          <ThemeToggle
            isDarkMode={isDarkMode}
            onChange={props.onThemeChange}
            className="navbar__theme-toggle"
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
    >
      <div className="navbar__group">
        <Logo isDarkMode={isDarkMode} />
      </div>

      <Suspense fallback={<div className="navbar__search-placeholder" aria-hidden="true" />}>
        <SearchBar isDarkMode={isDarkMode} />
      </Suspense>

      <div className="navbar__group">
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
