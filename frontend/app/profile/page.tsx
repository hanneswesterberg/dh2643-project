'use client';

import { useState } from 'react';
import UserProfile from '../components/Profile';
import Navbar from '../components/navbar/Navbar';

export default function ProfilePage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <main
      className="profile-page min-h-screen"
      data-theme={isDarkMode ? 'dark' : 'light'}
    >
      <header className="relative z-50 shrink-0">
        <Navbar
          logoOnly
          title="Profile"
          isDarkMode={isDarkMode}
          onThemeChange={setIsDarkMode}
        />
      </header>
      <div className="profile-content">
        <UserProfile />
      </div>
    </main>
  );
}
