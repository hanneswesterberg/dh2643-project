"use client"
import React from 'react';
import { useRouter } from 'next/navigation'; // Corrected from 'next/navigation' to 'next/router'

const NavigationLinks: React.FC = () => {
  const router = useRouter();

  const buttonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'pink'
  };

  return (
    <div style={{ display: 'flex', gap: '1rem' }}> {/* Adjust gap as needed */}
      <button onClick={() => router.push('/search')} style={buttonStyle}>All</button>
      <button onClick={() => router.push('/login')} style={buttonStyle}>Log in</button>
    </div>
  );
};
export default NavigationLinks;