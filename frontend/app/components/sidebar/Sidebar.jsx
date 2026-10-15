//import React, { useState } from 'react';
export default function SideBar({ isOpen }) {
  // State to manage the open/close state of the sidebar

  return (
    <div className="flex">
      {/* Sidebar */}
      <div
        // Conditional class based on isOpen 
        // state to control width and visibility
        className={`bg-gray-800 text-white 
                    fixed right-0 h-screen transition-all 
                    duration-300 z-10 
                    ${isOpen ? 'w-64' : 'w-0 overflow-hidden'
          }`}>
        {/* Sidebar content */}
        <div className="flex flex-col items-center">
          <div className="mt-4">
            <a href="#"
              className="text-white 
                          hover:text-gray-300">
              Home
            </a>
          </div>
          <div className="mt-4">
            <a href="#"
              className="text-white 
                          hover:text-gray-300">
              About
            </a>
          </div>
          {/* Add more sidebar items here */}
        </div>
      </div>
      {/* Main content */}
      <div className={`flex-1 p-4 
                        ${isOpen ? 'ml-64' : 'ml-0'}`}>
      </div>
    </div>
  );
};
