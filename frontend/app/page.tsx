'use client'
import NavBar from './components/navbar/Navbar';
import { useEffect, useState } from 'react';
import SideBar from './components/sidebar/Sidebar';
import { useSystemMessage } from './components/SystemMessageProvider';
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
        className="home-page__loading"
        role="status"
      >
        Loading concert map…
      </div>
    ),
  }
);

export default function Home() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useThemePreference();
  const [currentUser, setCurrentUser] = useState<UserProfileData | null>(null);
  const showSystemMessage = useSystemMessage();

  useEffect(() => {
    let isCurrent = true;

    getCurrentUser()
      .then((user) => {
        if (isCurrent) setCurrentUser(user);
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          showSystemMessage(
            error instanceof Error ? error.message : 'Could not check your sign-in status.',
            'error',
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [showSystemMessage]);

  return (
    <main
      className="home-page"
      data-theme={isDarkMode ? 'dark' : 'light'}
    >
      <header className="home-page__header">
        <NavBar
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
        onAuthenticated={(user: UserProfileData) => {
          setCurrentUser(user);
        }}
        onLoggedOut={() => setCurrentUser(null)}
      />
      <ConcertMap
        isDarkMode={isDarkMode}
        onDarkModeChange={setIsDarkMode}
        isSidebarOpen={isSidebarOpen}
        authenticatedUsername={currentUser?.username ?? null}
        onLoginRequired={() => setSidebarOpen(true)}
      />
    </main>
  );
}