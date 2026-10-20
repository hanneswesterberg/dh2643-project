'use client';

import Navbar from '../../components/navbar/Navbar';
import SavedEvents from '../../components/SavedEvents';
import useThemePreference from '../../lib/useThemePreference';

export default function YourEventsPage() {
  const [isDarkMode, setIsDarkMode] = useThemePreference();

  return (
    <main
      className={`profile-page${isDarkMode ? ' profile-page--dark' : ' profile-page--light'}`}
      data-theme={isDarkMode ? 'dark' : 'light'}
    >
      <header className="profile-page__header">
        <Navbar
          logoOnly
          title="Your Events"
          isDarkMode={isDarkMode}
          onThemeChange={setIsDarkMode}
        />
      </header>
      <div className="profile-page__content">
        <SavedEvents />
      </div>
    </main>
  );
}
