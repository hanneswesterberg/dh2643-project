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
          width={100} // Adjust width as needed
          height={50} // Adjust height as needed
          style={{
            objectFit: "contain",
            filter: isDarkMode ? 'invert(1)' : 'none',
          }}
          
        />
      </div>
    </Link>
  );
};

export default Logo;