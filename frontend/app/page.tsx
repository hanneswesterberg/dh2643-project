'use client'
import NavBar from './components/navbar/Navbar';
import { useEffect, useState } from 'react';
import SideBar from './components/sidebar/Sidebar';
import { getCurrentUser } from './components/Lib/userAPI';
import type { UserProfileData } from './components/userModel';
import useThemePreference from './lib/useThemePreference';

import dynamic from 'next/dynamic';

const ConcertMap = dynamic(
  () => import('./components/Map'),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex flex-1 items-center justify-center"
        role="status"
      >
        Loading concert map…
      </div>
    ),
  }
);

export default function Home() {
  const [search, setSearch] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useThemePreference();
  const [currentUser, setCurrentUser] = useState<UserProfileData | null>(null);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    getCurrentUser()
      .then((user) => {
        if (isCurrent) setCurrentUser(user);
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setSessionError(
            error instanceof Error ? error.message : 'Could not check your sign-in status.',
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

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
          username={currentUser?.username ?? null}
          profilePicture={currentUser?.profile_picture ?? null}
        />
      </header>
      <SideBar
        isOpen={isSidebarOpen}
        isDarkMode={isDarkMode}
        onClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          setSessionError('');
        }}
        onLoggedOut={() => setCurrentUser(null)}
        sessionError={sessionError}
      />
      <ConcertMap
        isDarkMode={isDarkMode}
        onDarkModeChange={setIsDarkMode}
        isSidebarOpen={isSidebarOpen}
      />
    </main>
  );
}