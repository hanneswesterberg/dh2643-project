import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps{
  isDarkMode: boolean;
}

const Logo = ({ isDarkMode }: LogoProps) => {
  return (
    <Link href="/" passHref>
      <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        {/* Assuming logo.jpg is in the public/logo directory */}
        <Image 
          src="/DH2643LOGOV1.svg" 
          alt="Home"
          width={386}
          height={100}
          style={{
            width: 100,
            height: 'auto',
            objectFit: "contain",
            filter: isDarkMode ? 'invert(1)' : 'none',
          }}
          
        />
      </div>
    </Link>
  );
};

export default Logo;