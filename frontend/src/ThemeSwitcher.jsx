import React from 'react';

const ThemeSwitcher = ({ theme, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="bg-button-background text-button-text px-4 py-2 rounded-full flex items-center justify-center"
    >
      <div className="w-6 h-6 relative">
        <svg
          className={`absolute top-0 left-0 w-full h-full transition-opacity duration-300 ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
        <svg
          className={`absolute top-0 left-0 w-full h-full transition-opacity duration-300 ${theme === 'light' ? 'opacity-100' : 'opacity-0'}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </div>
    </button>
  );
};

export default ThemeSwitcher;
