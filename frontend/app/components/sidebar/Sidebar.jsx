//import React, { useState } from 'react';
export default function SideBar({ isOpen }) {
  return (
    <div
      className={`fixed right-0 top-0 z-40 h-screen overflow-hidden bg-gray-800 text-white transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-0'
      }`}
    >
      <div className="flex flex-col items-center">
        <div className="mt-4">
          <a href="#" className="text-white hover:text-gray-300">
            Home
          </a>
        </div>
        <div className="mt-4">
          <a href="#" className="text-white hover:text-gray-300">
            About
          </a>
        </div>
      </div>
    </div>
  );
}
