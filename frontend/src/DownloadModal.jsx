import React, { useState } from 'react';

const DownloadModal = ({ isOpen, onClose, onDownload, theme }) => {
  const [selectedFormat, setSelectedFormat] = useState('xlsx');

  if (!isOpen) {
    return null;
  }

  const handleDownload = () => {
    onDownload(selectedFormat);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className={`p-8 rounded-lg shadow-lg w-1/3 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        <h2 className="text-2xl font-bold mb-4">Download Modified File</h2>
        <p className="mb-4">Select the format you want to download the modified file in.</p>
        <div className="flex flex-col space-y-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="format"
              value="xlsx"
              checked={selectedFormat === 'xlsx'}
              onChange={() => setSelectedFormat('xlsx')}
              className="mr-2"
            />
            XLSX
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="format"
              value="csv"
              checked={selectedFormat === 'csv'}
              onChange={() => setSelectedFormat('csv')}
              className="mr-2"
            />
            CSV
          </label>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;
