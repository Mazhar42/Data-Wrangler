import React, { useState } from 'react';

const UniqueIdentifierModal = ({ isOpen, onClose, columns, data, onRemoveDuplicates }) => {
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [duplicates, setDuplicates] = useState(null);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (col) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleCheckDuplicates = () => {
    setChecking(true);
    setTimeout(() => {
      // Find duplicates based on selected columns
      const seen = new Set();
      const dups = [];
      data.forEach((row, idx) => {
        const key = selectedColumns.map(col => row[col]).join('||');
        if (seen.has(key)) {
          dups.push(idx);
        } else {
          seen.add(key);
        }
      });
      setDuplicates(dups);
      setChecking(false);
    }, 300); // Simulate async
  };

  const handleRemove = () => {
    setRemoving(true);
    setTimeout(() => {
      onRemoveDuplicates(selectedColumns);
      setRemoving(false);
      setDuplicates(null);
      setSelectedColumns([]);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-4">Unique Identifier</h2>
        <p className="mb-4">Select columns that together form a unique identifier (primary key).</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {columns.map(col => (
            <button
              key={col}
              className={`px-3 py-1 rounded border ${selectedColumns.includes(col) ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
              onClick={() => handleSelect(col)}
            >
              {col}
            </button>
          ))}
        </div>
        <button
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mb-4"
          onClick={handleCheckDuplicates}
          disabled={selectedColumns.length === 0 || checking}
        >
          {checking ? 'Checking...' : 'Check for Duplicates'}
        </button>
        {duplicates && (
          <div className="mb-4 text-red-600 font-semibold">
            {duplicates.length > 0
              ? `${duplicates.length} duplicate row(s) found.`
              : 'No duplicates found!'}
          </div>
        )}
        {duplicates && duplicates.length > 0 && (
          <button
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            onClick={handleRemove}
            disabled={removing}
          >
            {removing ? 'Removing...' : 'Remove Duplicates'}
          </button>
        )}
        <button
          className="w-full mt-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default UniqueIdentifierModal;
