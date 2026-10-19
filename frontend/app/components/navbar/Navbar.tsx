"use client";

import SearchBar from './SearchBar';
import Logo from './Logo';
import Login from './Login';
import ThemeToggle from '../ThemeToggle';

interface FullNavbarProps {
  logoOnly?: false;
  search: string;
  onSearchChange: (value: string) => void;
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
          <Logo />
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
    search,
    onSearchChange,
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
        <Logo />
      </div>

      <SearchBar value={search} onChange={onSearchChange} isDarkMode={isDarkMode} />

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
