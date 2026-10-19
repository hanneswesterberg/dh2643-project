import { useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, logIn, logOut, signUp } from '../Lib/userAPI';

export default function SideBar({
  isOpen,
  isDarkMode,
  onClose,
  currentUser,
  onAuthenticated,
  onLoggedOut,
  sessionError,
}) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = mode === 'register'
        ? await signUp(username, email, password)
        : await logIn(username, password);

      if (!response.ok) {
        setError(response.data.error ?? `Could not ${mode === 'register' ? 'register' : 'log in'}. Please try again.`);
        return;
      }

      if (mode === 'register') {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setNotice('Account created. You can now sign in.');
      } else {
        const user = await getCurrentUser();
        if (!user) {
          setError('Login succeeded, but your account could not be loaded. Please try again.');
          return;
        }
        onAuthenticated(user);
        setNotice('Logged in successfully.');
      }
    } catch {
      setError(`Could not connect to the server. Please try to ${mode === 'register' ? 'register' : 'log in'} again.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
  }

  async function handleLogout() {
    setError('');
    setNotice('');
    setIsSubmitting(true);
    try {
      await logOut();
      onLoggedOut();
      setNotice('You have been signed out.');
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Could not log out.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isRegistering = mode === 'register';

  return (
    <div
      aria-hidden={!isOpen}
      inert={!isOpen}
      className="sidebar-panel fixed right-0 top-[82px] z-[1100] h-[calc(100vh-82px)] overflow-hidden"
      style={{
        width: isOpen ? '320px' : '0px',
        transition: 'width 300ms ease, background-color 300ms ease, color 300ms ease, box-shadow 300ms ease',
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        color: isDarkMode ? '#f9fafb' : '#171717',
        boxShadow: isDarkMode
          ? '0 10px 25px rgba(0, 0, 0, 0.3)'
          : '0 10px 25px rgba(0, 0, 0, 0.14)',
      }}
    >
      <div className="w-80 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="sign-in-heading" className="text-xl font-semibold">
            {currentUser ? (
              <Link href="/profile" className="underline hover:opacity-80">
                {currentUser.username}
              </Link>
            ) : isRegistering ? 'Create account' : 'Sign in'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign-in panel"
            className="sidebar-close rounded px-2 py-1 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        {currentUser ? (
          <div className="space-y-4">
            <p>Signed in as {currentUser.username}.</p>
            {error && <p role="alert">{error}</p>}
            {notice && <p role="status">{notice}</p>}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSubmitting}
              className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} aria-labelledby="sign-in-heading" className="space-y-4">
          {sessionError && <p role="alert">{sessionError}</p>}
          <label className="block">
            {isRegistering ? 'Username' : 'Username or email'}
            <input
              type="text"
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="sidebar-input mt-1 block w-full rounded border p-2"
              style={{
                borderColor: isDarkMode ? '#6b7280' : '#d1d5db',
                backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                color: isDarkMode ? '#ffffff' : '#171717',
              }}
            />
          </label>
          {isRegistering && (
            <label className="block">
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="sidebar-input mt-1 block w-full rounded border p-2"
                style={{
                  borderColor: isDarkMode ? '#6b7280' : '#d1d5db',
                  backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                  color: isDarkMode ? '#ffffff' : '#171717',
                }}
              />
            </label>
          )}
          <label className="block">
            Password
            <input
              type="password"
              name="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="sidebar-input mt-1 block w-full rounded border p-2"
              style={{
                borderColor: isDarkMode ? '#6b7280' : '#d1d5db',
                backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                color: isDarkMode ? '#ffffff' : '#171717',
              }}
            />
          </label>
          {isRegistering && (
            <label className="block">
              Confirm password
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="sidebar-input mt-1 block w-full rounded border p-2"
                style={{
                  borderColor: isDarkMode ? '#6b7280' : '#d1d5db',
                  backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                  color: isDarkMode ? '#ffffff' : '#171717',
                }}
              />
            </label>
          )}
          {error && <p role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting
              ? (isRegistering ? 'Creating account...' : 'Logging in...')
              : (isRegistering ? 'Register' : 'Login')}
          </button>
          <button
            type="button"
            onClick={() => changeMode(isRegistering ? 'login' : 'register')}
            className="sidebar-mode-toggle w-full text-center underline"
          >
            {isRegistering ? 'Back to sign in' : 'Register a new account'}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
