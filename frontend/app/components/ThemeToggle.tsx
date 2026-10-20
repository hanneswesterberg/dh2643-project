interface ThemeToggleProps {
  isDarkMode: boolean;
  onChange: (isDarkMode: boolean) => void;
  className?: string;
}

export default function ThemeToggle({
  isDarkMode,
  onChange,
  className = '',
}: ThemeToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDarkMode}
      aria-label="Dark mode"
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => onChange(!isDarkMode)}
      className={`theme-toggle${isDarkMode ? ' theme-toggle--checked' : ''} ${className}`}
    >
      <span className="theme-toggle__thumb" aria-hidden="true">
        {isDarkMode ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path
              d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <circle
              cx="12"
              cy="12"
              r="4"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
