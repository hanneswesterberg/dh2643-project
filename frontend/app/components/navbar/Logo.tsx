import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Logo: React.FC = () => {
  return (
    <Link href="/" passHref>
      <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        {/* Assuming logo.jpg is in the public/logo directory */}
        <Image 
          src="/logo/logo.jpg" 
          alt="TakeMeOut Logo"
          width={100} // Adjust width as needed
          height={50} // Adjust height as needed
          objectFit="contain" // Adjust as needed for your specific logo
        />
      </div>
    </Link>
  );
};

export default Logo;