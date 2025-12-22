import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { filesAPI } from '../../utils/api';

// This comment is to force a re-build

export const GroupingModal = ({ isOpen, onClose, fileId, allColumns, onApply, loading, theme }) => {
  const [selectedColumn, setSelectedColumn] = useState('');
  const [groups, setGroups] = useState([]);
  const [correctedValues, setCorrectedValues] = useState({});
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [threshold, setThreshold] = useState(85); // New state for threshold
  const isDark = theme === 'dark';

  useEffect(() => {
    if (selectedColumn) {
      setSuggestionsLoaded(false);
      const fetchGroups = async () => {
        try {
          let data;
          if (selectedColumn.toLowerCase().includes('country')) {
            data = await filesAPI.getCountrySuggestions(fileId, selectedColumn);
          } else {
            data = await filesAPI.getGroupSuggestions(fileId, selectedColumn, threshold);
          }
          setGroups(data.groups);
          // Initialize corrected values with the suggested corrected name for each group
          const initialCorrections = {};
          data.groups.forEach((group_obj, index) => {
            initialCorrections[index] = group_obj.suggested_corrected_name || group_obj.original_values[0];
          });
          setCorrectedValues(initialCorrections);
        } catch (error) {
          toast.error('Failed to fetch AI suggestions.');
          console.error(error);
        } finally {
          setSuggestionsLoaded(true);
        }
      };
      fetchGroups();
    }
  }, [selectedColumn, fileId, threshold]);

  const handleApply = () => {
    const mapping = {};
    groups.forEach((group, index) => {
      const correctValue = correctedValues[index];
      group.original_values.forEach(originalValue => {
        if (originalValue !== correctValue) {
          mapping[originalValue] = correctValue;
        }
      });
    });
    onApply(selectedColumn, mapping);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`bg-white ${isDark ? 'dark:bg-gray-800' : ''} rounded-lg shadow-2xl p-6 w-full max-w-2xl transform transition-all`}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Spelling Correction</h2>
        <div className="mb-4">
          <label htmlFor="column-select" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Select Column</label>
          <select
            id="column-select"
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base rounded-md ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}`}
          >
            <option value="">-- Select a column --</option>
            {allColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="threshold-slider" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Similarity Threshold: {threshold}%</label>
          <input
            type="range"
            id="threshold-slider"
            min="50"
            max="100"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>

        {loading && <p className={`${isDark ? 'text-white' : 'text-black'}`}>Loading suggestions...</p>}

        {!loading && suggestionsLoaded && groups.length === 0 && (
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-4 text-center`}>
            No suggestions found for this column.
          </p>
        )}

        {groups.length > 0 && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {groups.map((group_obj, index) => (
              <div key={index} className={`p-4 border rounded-md ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                <div className="mb-2">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Correct Value</label>
                  <input
                    type="text"
                    value={correctedValues[index] || ''}
                    onChange={(e) => setCorrectedValues({...correctedValues, [index]: e.target.value})}
                    className={`mt-1 block w-full text-sm rounded-md ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-black'}`}
                  />
                </div>
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Suggestions to be replaced:</p>
                <div className="flex flex-wrap gap-2">
                  {group_obj.original_values.map(item => (
                    <span key={item} className={`px-2 py-1 text-xs rounded-full ${isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'}`}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-4">
          <button onClick={onClose} className={`px-4 py-2 text-sm font-medium rounded-md ${isDark ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Cancel</button>
          <button onClick={handleApply} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Apply Corrections</button>
        </div>
      </motion.div>
    </div>
  );
}