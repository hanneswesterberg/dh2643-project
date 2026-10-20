"use client"
import React from 'react';
import Image from 'next/image';
//import { useRouter } from 'next/navigation';

interface LoginProps {
  onLogin: () => void;
  username: string | null;
  profilePicture: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, username, profilePicture }) => {
  return (
    <button
      type="button"
      onClick={onLogin}
      aria-label={username ?? 'Sign in'}
      className="navbar__login"
    >
      {profilePicture ? (
        <Image
          src={profilePicture}
          alt=""
          width={24}
          height={24}
          unoptimized
          className="h-6 w-6 rounded-full object-cover"
        />
      ) : username ? (
        <span
          aria-hidden="true"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#fbbf24] text-[#171717]"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )}
      <span>{username ?? 'Sign In'}</span>
    </button>
  );
};

export default Login;