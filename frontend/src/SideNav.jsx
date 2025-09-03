import React from 'react';
import { Link } from 'react-router-dom';

const SideNav = ({ setActiveModal, handleDownload, fileId, theme }) => {
  const isDark = theme === 'dark';
  return (
    <div className="bg-header-background w-64 h-full p-4 flex flex-col space-y-3">
      <button onClick={() => setActiveModal('upload')} className={`flex items-center text-text-primary ${isDark ? 'hover:bg-gray-700' : 'hover:bg-blue-50'} p-3 rounded-lg transition-colors`}>
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <span className="text-sm font-medium">Upload File</span>
      </button>

      <button onClick={() => setActiveModal('uniqueIdentifier')} className={`flex items-center text-text-primary ${isDark ? 'hover:bg-gray-700' : 'hover:bg-pink-50'} p-3 rounded-lg transition-colors`}>
        <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-sm font-medium">Unique Identifier</span>
      </button>
      
      <button onClick={() => setActiveModal('filter')} className={`flex items-center text-text-primary ${isDark ? 'hover:bg-gray-700' : 'hover:bg-purple-50'} p-3 rounded-lg transition-colors`}>
        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <span className="text-sm font-medium">Filter Data</span>
      </button>
      
      <button onClick={() => setActiveModal('equation')} className={`flex items-center text-text-primary ${isDark ? 'hover:bg-gray-700' : 'hover:bg-green-50'} p-3 rounded-lg transition-colors`}>
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-sm font-medium">Equation Builder</span>
      </button>
      
      <button onClick={() => setActiveModal('rules')} className={`flex items-center text-text-primary ${isDark ? 'hover:bg-gray-700' : 'hover:bg-orange-50'} p-3 rounded-lg transition-colors`}>
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <span className="text-sm font-medium">Custom Rules</span>
      </button>

      <Link to="/history" className={`flex items-center text-text-primary ${isDark ? 'hover:bg-gray-700' : 'hover:bg-yellow-50'} p-3 rounded-lg transition-colors`}>
        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-sm font-medium">History Log</span>
      </Link>

      <button onClick={handleDownload} disabled={!fileId} className={`flex items-center text-text-primary ${isDark ? 'hover:bg-gray-700' : 'hover:bg-teal-50'} p-3 rounded-lg transition-colors disabled:opacity-50 ${!fileId ? 'disabled:hover:bg-transparent' : ''}`}>
        <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <span className="text-sm font-medium">Download</span>
      </button>

    </div>
  );
}

export default SideNav;
