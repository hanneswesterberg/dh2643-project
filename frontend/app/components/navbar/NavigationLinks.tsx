"use client"
import React from 'react';
import { useRouter } from 'next/navigation'; // Corrected from 'next/navigation' to 'next/router'

const NavigationLinks: React.FC = () => {
  const router = useRouter();

  return (
    <div className="navigation-links">
      <button onClick={() => router.push('/search')}>All</button>
      <button onClick={() => router.push('/login')}>Log in</button>
    </div>
  );
};
export default NavigationLinks;