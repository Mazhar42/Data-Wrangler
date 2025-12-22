import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { filesAPI } from '../../utils/api';

export const AnomalyDetectionModal = ({ isOpen, onClose, fileId, allColumns, loading, theme }) => {
  const [selectedColumn, setSelectedColumn] = useState('');
  const [detectionType, setDetectionType] = useState('general');
  const [anomalies, setAnomalies] = useState([]);
  const [nearDuplicates, setNearDuplicates] = useState([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (selectedColumn && detectionType) {
      setSuggestionsLoaded(false);
      const fetchAnomalies = async () => {
        try {
          const data = await filesAPI.detectAnomalies(fileId, selectedColumn, detectionType);
          setAnomalies(data.anomalies);
          setNearDuplicates(data.near_duplicates);
        } catch (error) {
          toast.error('Failed to detect anomalies.');
          console.error(error);
        } finally {
          setSuggestionsLoaded(true);
        }
      };
      fetchAnomalies();
    }
  }, [selectedColumn, detectionType, fileId]);

  const handleApply = () => {
    // Logic to apply corrections based on user selection
    // This will be more complex, involving mapping selected anomalies/duplicates to corrected values
    // For now, just close the modal
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
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Anomaly Detection</h2>
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
          <label htmlFor="detection-type-select" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Detection Type</label>
          <select
            id="detection-type-select"
            value={detectionType}
            onChange={(e) => setDetectionType(e.target.value)}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base rounded-md ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}`}
          >
            <option value="general">General (Near Duplicates)</option>
            <option value="country">Country Affiliation</option>
            {/* Add more types as needed */}
          </select>
        </div>

        {loading && <p className={`${isDark ? 'text-white' : 'text-black'}`}>Detecting anomalies...</p>}

        {!loading && suggestionsLoaded && anomalies.length === 0 && nearDuplicates.length === 0 && (
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-4 text-center`}>
            No anomalies or near-duplicates found for this selection.
          </p>
        )}

        {anomalies.length > 0 && (
          <div className="mt-4">
            <h3 className={`text-md font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Detected Anomalies:</h3>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border rounded-md ${isDark ? 'border-gray-600' : 'border-gray-200'}">
              {anomalies.map((anomaly, index) => (
                <span key={index} className={`px-2 py-1 text-xs rounded-full ${isDark ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800'}`}>
                  {anomaly}
                </span>
              ))}
            </div>
          </div>
        )}

        {nearDuplicates.length > 0 && (
          <div className="mt-4">
            <h3 className={`text-md font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Detected Near-Duplicates:</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {nearDuplicates.map((group, groupIndex) => (
                <div key={groupIndex} className={`p-3 border rounded-md ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                  <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Group {groupIndex + 1}:</p>
                  <div className="flex flex-wrap gap-2">
                    {group.map((item, itemIndex) => (
                      <span key={itemIndex} className={`px-2 py-1 text-xs rounded-full ${isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'}`}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-4">
          <button onClick={onClose} className={`px-4 py-2 text-sm font-medium rounded-md ${isDark ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Cancel</button>
          <button onClick={handleApply} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Apply Corrections (Coming Soon)</button>
        </div>
      </motion.div>
    </div>
  );
};