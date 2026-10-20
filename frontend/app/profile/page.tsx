'use client';

import UserProfile from '../components/Profile';
import Navbar from '../components/navbar/Navbar';
import useThemePreference from '../lib/useThemePreference';

export default function ProfilePage() {
  const [isDarkMode, setIsDarkMode] = useThemePreference();

  return (
    <main
      className={`profile-page${isDarkMode ? ' profile-page--dark' : ' profile-page--light'}`}
      data-theme={isDarkMode ? 'dark' : 'light'}
    >
      <header className="profile-page__header">
        <Navbar
          logoOnly
          title="Profile"
          isDarkMode={isDarkMode}
          onThemeChange={setIsDarkMode}
        />
      </header>
      <div className="profile-page__content">
        <UserProfile />
      </div>
    </main>
  );
}
