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
      className="sidebar-panel fixed right-0 top-[80px] z-[1100] h-[calc(100vh-80px)] overflow-hidden"
      data-theme={isDarkMode ? 'dark' : 'light'}
      data-open={isOpen}
    >
      <div className="h-full w-80 overflow-y-auto p-6">
        <div className={`${currentUser ? 'mb-2' : 'mb-6'} flex items-center justify-between`}>
          {!currentUser && (
            <h2 id="sign-in-heading" className="text-xl font-semibold">
              {isRegistering ? 'Create account' : 'Sign in'}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign-in panel"
            className={`sidebar-close rounded px-2 py-1 text-2xl leading-none ${currentUser ? 'ml-auto' : ''}`}
          >
            &times;
          </button>
        </div>
        {currentUser ? (
          <div className="space-y-4">
            <div className="flex flex-col items-start gap-[20px] text-left">
              <Link
                href="/profile"
                aria-label="Open Profile Settings"
                className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                {currentUser.profile_picture ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentUser.profile_picture}
                      alt=""
                      className="h-[150px] w-[150px] object-cover"
                    />
                  </>
                ) : (
                  <div className="grid h-[150px] w-[150px] place-items-center bg-[#fbbf24] text-[#171717]">
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
              <div className="space-y-1">
                {currentUser.display_name && (
                  <p className="text-xl font-semibold">{currentUser.display_name}</p>
                )}
                <p className={currentUser.display_name ? 'text-sm' : 'text-xl font-semibold'}>
                  @{currentUser.username}
                </p>
              </div>
              {currentUser.bio && (
                <div
                  className="sidebar-bio w-full rounded border p-3 text-sm"
                >
                  <div
                    className="break-words"
                    dangerouslySetInnerHTML={{ __html: currentUser.bio }}
                  />
                </div>
              )}
            </div>
            <div className="text-center">
              <Link
                href="/profile/events"
                className="block w-full rounded bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700"
              >
                Your Events
              </Link>
            </div>
            <div className="text-center">
              <Link
                href="/profile"
                className="block w-full rounded bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700"
              >
                Profile Settings
              </Link>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} aria-labelledby="sign-in-heading" className="space-y-4">
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
              />
            </label>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
