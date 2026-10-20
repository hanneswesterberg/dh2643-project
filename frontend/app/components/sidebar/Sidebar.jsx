import { useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, logIn, logOut, signUp } from '../Lib/userAPI';
import { useSystemMessage } from '../SystemMessageProvider';

export default function SideBar({
  isOpen,
  isDarkMode,
  onClose,
  currentUser,
  onAuthenticated,
  onLoggedOut,
}) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showSystemMessage = useSystemMessage();

  async function handleSubmit(event) {
    event.preventDefault();
    if (mode === 'register' && password !== confirmPassword) {
      showSystemMessage('Passwords do not match.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = mode === 'register'
        ? await signUp(username, email, password)
        : await logIn(username, password);

      if (!response.ok) {
        const message = response.data.error ?? `Could not ${mode === 'register' ? 'register' : 'log in'}. Please try again.`;
        showSystemMessage(message, 'error');
        return;
      }

      if (mode === 'register') {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        showSystemMessage('Account created. You can now sign in.', 'success');
      } else {
        const user = await getCurrentUser();
        if (!user) {
          showSystemMessage('Login succeeded, but your account could not be loaded. Please try again.', 'error');
          return;
        }
        onAuthenticated(user);
        showSystemMessage('Logged in successfully.', 'success');
      }
    } catch {
      const message = `Could not connect to the server. Please try to ${mode === 'register' ? 'register' : 'log in'} again.`;
      showSystemMessage(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setPassword('');
    setConfirmPassword('');
  }

  async function handleLogout() {
    setIsSubmitting(true);
    try {
      await logOut();
      onLoggedOut();
      showSystemMessage('You have been signed out.', 'success');
    } catch (logoutError) {
      const message = logoutError instanceof Error ? logoutError.message : 'Could not log out.';
      showSystemMessage(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isRegistering = mode === 'register';

  return (
    <div
      aria-hidden={!isOpen}
      inert={!isOpen}
      className="sidebar-panel"
      data-theme={isDarkMode ? 'dark' : 'light'}
      data-open={isOpen}
    >
      <div className="sidebar-panel__content">
        <div className={`sidebar-panel__header${currentUser ? ' sidebar-panel__header--user' : ''}`}>
          {!currentUser && (
            <h2 id="sign-in-heading" className="sidebar-panel__title">
              {isRegistering ? 'Create account' : 'Sign in'}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign-in panel"
            className={`sidebar-close${currentUser ? ' sidebar-close--user' : ''}`}
          >
            &times;
          </button>
        </div>
        {currentUser ? (
          <div className="sidebar-panel__user">
            <div className="sidebar-panel__profile">
              <Link
                href="/profile"
                aria-label="Open Profile Settings"
                className="sidebar-panel__profile-link"
              >
                {currentUser.profile_picture ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentUser.profile_picture}
                      alt=""
                      className="sidebar-panel__picture"
                    />
                  </>
                ) : (
                  <div className="sidebar-panel__avatar">
                    <svg
                      viewBox="0 0 24 24"
                      width="84"
                      height="84"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </Link>
              <div className="sidebar-panel__identity">
                {currentUser.display_name && (
                  <p className="sidebar-panel__display-name">{currentUser.display_name}</p>
                )}
                <p className={currentUser.display_name ? 'sidebar-panel__username sidebar-panel__username--with-name' : 'sidebar-panel__username'}>
                  @{currentUser.username}
                </p>
              </div>
              {currentUser.bio && (
                <div
                  className="sidebar-bio"
                >
                  <div
                    className="sidebar-bio__text"
                    dangerouslySetInnerHTML={{ __html: currentUser.bio }}
                  />
                </div>
              )}
            </div>
            <div className="sidebar-panel__action">
              <Link
                href="/profile/events"
                className="sidebar-panel__primary-action"
              >
                Your Events
              </Link>
            </div>
            <div className="sidebar-panel__action">
              <Link
                href="/profile"
                className="sidebar-panel__primary-action"
              >
                Profile Settings
              </Link>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSubmitting}
              className="sidebar-panel__primary-action"
            >
              {isSubmitting ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} aria-labelledby="sign-in-heading" className="sidebar-panel__form">
          <label className="sidebar-panel__field">
            {isRegistering ? 'Username' : 'Username or email'}
            <input
              type="text"
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="sidebar-input"
            />
          </label>
          {isRegistering && (
            <label className="sidebar-panel__field">
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="sidebar-input"
              />
            </label>
          )}
          <label className="sidebar-panel__field">
            Password
            <input
              type="password"
              name="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="sidebar-input"
            />
          </label>
          {isRegistering && (
            <label className="sidebar-panel__field">
              Confirm password
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="sidebar-input"
              />
            </label>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="sidebar-panel__primary-action"
          >
            {isSubmitting
              ? (isRegistering ? 'Creating account...' : 'Logging in...')
              : (isRegistering ? 'Register' : 'Login')}
          </button>
          <button
            type="button"
            onClick={() => changeMode(isRegistering ? 'login' : 'register')}
            className="sidebar-mode-toggle"
          >
            {isRegistering ? 'Back to sign in' : 'Register a new account'}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
