import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps{
  isDarkMode: boolean;
}

const Logo = ({ isDarkMode }: LogoProps) => {
  return (
    <Link href="/" passHref>
      <div className="navbar__logo-link">
        {/* Assuming logo.jpg is in the public/logo directory */}
        <Image 
          src="/DH2643LOGOV1.svg" 
          alt="Home"
          width={386}
          height={100}
          className={`navbar__logo${isDarkMode ? ' navbar__logo--dark' : ''}`}
          
        />
      </div>
    </Link>
  );
};

export default Logo;