import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

const StatsModal = ({ fileId, columns, theme, onClose }) => {
  const [stats, setStats] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const handleGetStats = async () => {
    if (selectedColumns.length === 0) {
      toast.error('Please select at least one column.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/stats/${fileId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ column_names: selectedColumns }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Error fetching stats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClickOutside = useCallback((event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 bg-gray bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div ref={modalRef} className={`p-8 w-1/2 max-w-2xl shadow-2xl rounded-xl transition-all ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}> 
        <h2 className="text-xl font-semibold mb-4">Column Statistics</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="columns" className="block text-sm font-medium text-gray-700">Select Columns</label>
            <select
              multiple
              id="columns"
              value={selectedColumns}
              onChange={(e) => setSelectedColumns(Array.from(e.target.selectedOptions, option => option.value))}
              className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${isDark ? 'text-white' : 'text-black'}`}>
              {columns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
          <div>
            <button
              onClick={handleGetStats}
              className={`w-full bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 disabled:bg-gray-400 ${loading ? 'cursor-not-allowed' : ''}`}
              disabled={loading}>
              {loading ? 'Calculating...' : 'Get Stats'}
            </button>
          </div>
        </div>
        {stats && (
          <div className="mt-6">
            <h3 className="font-bold mb-2">Results</h3>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Column
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sum
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(stats).map(([col, stat]) => (
                  <tr key={col}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{col}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{stat.sum.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{stat.avg.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;