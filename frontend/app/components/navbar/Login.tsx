"use client"
import React from 'react';
//import { useRouter } from 'next/navigation';

interface LoginProps {
  onLogin: () => void;
  label: string;
  disabled: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, label, disabled }) => {
  return (
    <button
      type="button"
      onClick={onLogin}
      disabled={disabled}
      className="flex items-center gap-2 disabled:cursor-wait"
      aria-label={label}
    >
      <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <span>{label}</span>
    </button>
  );
};

export default Login;