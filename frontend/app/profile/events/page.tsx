'use client';

import Navbar from '../../components/navbar/Navbar';
import SavedEvents from '../../components/SavedEvents';
import useThemePreference from '../../lib/useThemePreference';

export default function YourEventsPage() {
  const [isDarkMode, setIsDarkMode] = useThemePreference();

  return (
    <main
      className="profile-page min-h-screen"
      data-theme={isDarkMode ? 'dark' : 'light'}
    >
      <header className="relative z-50 shrink-0">
        <Navbar
          logoOnly
          title="Your Events"
          isDarkMode={isDarkMode}
          onThemeChange={setIsDarkMode}
        />
      </header>
      <div className="profile-content">
        <SavedEvents />
      </div>
    </main>
  );
}
