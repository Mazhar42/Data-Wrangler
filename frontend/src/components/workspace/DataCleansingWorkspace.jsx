import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

import toast from 'react-hot-toast';

import { ArrowLeft, Sparkles } from 'lucide-react';
import DataTable from '../../DataTable';
import EquationBuilder from '../../EquationBuilder';
import Filter from '../../Filter';
import CustomRules from '../../CustomRules';
import ThemeSwitcher from '../../ThemeSwitcher';
import DownloadModal from '../../DownloadModal';
import UniqueIdentifierModal from '../../UniqueIdentifierModal';
import StatsModal from '../../StatsModal';
import { filesAPI, formulasAPI } from '../../utils/api';

const DataCleansingWorkspace = ({ fileId, onBack, projectName, cachedData, onDataLoaded }) => {
  // State management (similar to original App.jsx)
  const [allColumns, setAllColumns] = useState([]);
  const [, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [selectedRuleType, setSelectedRuleType] = useState('');
  const [dateFormat, setDateFormat] = useState('');
  const [countryMapping, setCountryMapping] = useState('');
  const [originalData, setOriginalData] = useState([]);
  const [theme, setTheme] = useState('light');
  const [originalDataTotalRows, setOriginalDataTotalRows] = useState(0);
  const [currentOriginalPage, setCurrentOriginalPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [savedFormulas, setSavedFormulas] = useState([]);
  const [filterCriteria, setFilterCriteria] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [modifications, setModifications] = useState([]);
  const [columnSearches, setColumnSearches] = useState({});
  const [showProcessingComplete, setShowProcessingComplete] = useState(false);
  const [completionTimeoutId, setCompletionTimeoutId] = useState(null);

  const loadFormulas = useCallback(async () => {
    try {
      const data = await formulasAPI.getAll();
      setSavedFormulas(data);
    } catch {
      console.error('Error loading formulas:');
    }
  }, []);

  const loadFileData = useCallback(async () => {
    if (cachedData) {
      setOriginalData(cachedData.originalData);
      setOriginalDataTotalRows(cachedData.originalDataTotalRows);
      setAllColumns(cachedData.allColumns);
      setCurrentOriginalPage(1);
      return;
    }

    try {
      setLoading(true);
      setIsFileProcessing(true);
      
      // Load file content
      const fileData = await filesAPI.getContent(fileId, 1, itemsPerPage);
      const columnsData = await filesAPI.getUniqueColumns(fileId);

      const dataToCache = {
        originalData: fileData.data,
        originalDataTotalRows: fileData.total_rows,
        allColumns: columnsData.all_columns || [],
      };

      onDataLoaded(fileId, dataToCache);

      setOriginalData(dataToCache.originalData);
      setOriginalDataTotalRows(dataToCache.originalDataTotalRows);
      setAllColumns(dataToCache.allColumns);
      setCurrentOriginalPage(1);

      // File processing completed successfully
      setIsFileProcessing(false);
      setShowProcessingComplete(true);
      
      // Clear any existing timeout
      if (completionTimeoutId) {
        clearTimeout(completionTimeoutId);
      }
      
      // Hide the completion message after 2 seconds
      const timeoutId = setTimeout(() => {
        setShowProcessingComplete(false);
        setCompletionTimeoutId(null);
      }, 2000);
      setCompletionTimeoutId(timeoutId);
    } catch {
      setError('Failed to load file data');
      setIsFileProcessing(false);
    } finally {
      setLoading(false);
    }
  }, [fileId, itemsPerPage, cachedData, onDataLoaded, completionTimeoutId]);

  useEffect(() => {
    // Load formulas and file data on component mount
    loadFormulas();
    loadFileData();
  }, [fileId, loadFileData, loadFormulas]); // Add loadFileData to dependencies

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Cleanup function to remove dark class on component unmount
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, [theme]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (completionTimeoutId) {
        clearTimeout(completionTimeoutId);
      }
    };
  }, [completionTimeoutId]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleApplyFilter = async (criteria) => {
    const newModifications = [...modifications, { type: 'filter', criteria }];
    setModifications(newModifications);
    setFilterCriteria(criteria);
    await handlePreview(1, newModifications);
    toast.success('Filter applied!');
  };

  const handleClearModifications = async () => {
    setModifications([]);
    setFilterCriteria(null);
    setColumnSearches({});
    await handlePreview(1, []);
    toast.success('All modifications cleared!');
  };

  const handleDownload = () => {
    setIsDownloadModalOpen(true);
  };

  const handleDownloadFile = async (format) => {
    if (!fileId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await filesAPI.downloadModified(fileId, modifications, format);
      
      // Determine filename from Content-Disposition or fallback
      const disposition = response.headers.get('content-disposition') || '';
      let filename = null;
      const match = disposition.match(/filename="?([^"]+)"?/i);
      if (match && match[1]) {
        filename = match[1];
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      if (!filename) {
        filename = `cleaned_data_${fileId}.${format}`;
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('An unexpected error occurred during download.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = useCallback(async (page, mods) => {
    if (!fileId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await filesAPI.previewModifications(fileId, mods, page, itemsPerPage);
      setOriginalData(data.data);
      setOriginalDataTotalRows(data.total_rows);
      setCurrentOriginalPage(page);
    } catch {
      setError('An unexpected error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  }, [fileId, itemsPerPage]);

  const handleApplyRule = async () => {
    if (!fileId || !selectedColumn || !selectedRuleType) return;

    let payload = {};
    if (selectedRuleType === 'correct_date') {
      payload = { target_format: dateFormat || '%Y-%m-%d' };
    } else if (selectedRuleType === 'correct_country') {
      try {
        payload = { mapping: countryMapping ? JSON.parse(countryMapping) : null };
      } catch {
        setError('Invalid JSON for country mapping.');
        return;
      }
    }

    const rule = {
      column_name: selectedColumn,
      rule_type: selectedRuleType,
      payload: payload,
      active: true,
    };

    const newModifications = [...modifications, { type: 'rule', rule }];
    setModifications(newModifications);
    await handlePreview(1, newModifications);
    toast.success('Rule applied!');
  };

  const handleApplyFormula = async (formulaName, formulaExpression) => {
    if (!fileId) return;

    const formula = {
      formula_name: formulaName,
      formula_expression: formulaExpression,
    };

    const newModifications = [...modifications, { type: 'formula', formula }];
    setModifications(newModifications);
    await handlePreview(1, newModifications);

    // Fetch updated columns after formula application
    try {
      const colsData = await filesAPI.getUniqueColumns(fileId);
      setAllColumns(colsData.all_columns || []);
    } catch {
      // Handle error silently
    }

    toast.success('Formula applied!');
  };

  const handleCellChange = useCallback(async (rowIndex, columnKey, oldValue, newValue, applyToAll) => {
    const newModifications = [...modifications, { 
      type: 'cell_edit', 
      edit: { rowIndex, columnKey, oldValue, newValue, applyToAll } 
    }];
    setModifications(newModifications);
    await handlePreview(currentOriginalPage, newModifications);
  }, [modifications, currentOriginalPage, handlePreview]);

  const handleColumnSearch = useCallback(async (searches) => {
    setColumnSearches(searches);
    setModifications(prevModifications => {
        const searchModifications = Object.entries(searches)
            .filter(([, searchTerm]) => searchTerm)
            .map(([column, searchTerm]) => ({ type: 'column_search', search: { column, searchTerm } }));

        const otherModifications = prevModifications.filter(m => m.type !== 'column_search');
        const newModifications = [...otherModifications, ...searchModifications];
        
        handlePreview(1, newModifications);
        return newModifications;
    });
  }, [handlePreview]);

  const handleRemoveDuplicates = (selectedColumns) => {
    if (!selectedColumns || selectedColumns.length === 0) return;
    // Remove duplicates from originalData
    const seen = new Set();
    const filtered = originalData.filter(row => {
      const key = selectedColumns.map(col => row[col]).join('||');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setOriginalData(filtered);
  };

  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </motion.button>
              
              <div className="flex items-center">
                <Sparkles className="w-8 h-8 text-indigo-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Data Cleansing</h1>
                  <p className="text-sm text-gray-600">
                    Project: {projectName}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleClearModifications}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => handlePreview(1, modifications)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Download
              </button>
              <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Action Buttons */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveModal('filter')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Filter
            </button>
            <button
              onClick={() => setActiveModal('equation')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Add Formula
            </button>
            <button
              onClick={() => setActiveModal('rules')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Apply Rules
            </button>
            <button
              onClick={() => setActiveModal('uniqueIdentifier')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Remove Duplicates
            </button>
            {/* <button
              onClick={() => setIsStatsModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              View Stats
            </button> */}
          </div>
        </div>

        {/* Processing Status */}
        {isFileProcessing && (
          <div className="p-4 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg" role="alert">
            <span className="font-medium">Processing file...</span> Please wait while the full file is being processed in the background.
          </div>
        )}
        
        {showProcessingComplete && !isFileProcessing && (
          <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
            <span className="font-medium">Processing complete!</span>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <DataTable
            data={originalData}
            theme={theme}
            totalRows={originalDataTotalRows}
            currentPage={currentOriginalPage}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => handlePreview(page, modifications)}
            filterCriteria={filterCriteria}
            onCellChange={handleCellChange}
            columnSearches={columnSearches}
            onColumnSearch={handleColumnSearch}
            fullHeight={false}
            fileId={fileId}
            allColumns={allColumns}
          />
        </div>
      </div>

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 overflow-y-auto h-full w-full flex items-center justify-center z-50 backdrop-blur-sm">
          <div className={`p-8 w-1/2 max-w-2xl shadow-2xl rounded-xl transition-all ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            {activeModal === 'filter' && (
              <Filter
                columns={allColumns}
                onApplyFilter={(criteria) => {
                  handleApplyFilter(criteria);
                  setActiveModal(null);
                }}
                fileId={fileId}
                loading={loading}
              />
            )}
            {activeModal === 'equation' && (
              <EquationBuilder
                columns={allColumns}
                onApplyFormula={(...args) => {
                  handleApplyFormula(...args);
                  setActiveModal(null);
                }}
                fileId={fileId}
                loading={loading}
                savedFormulas={savedFormulas}
              />
            )}
            {activeModal === 'rules' && (
              <CustomRules
                allColumns={allColumns}
                selectedColumn={selectedColumn}
                setSelectedColumn={setSelectedColumn}
                selectedRuleType={selectedRuleType}
                setSelectedRuleType={setSelectedRuleType}
                dateFormat={dateFormat}
                setDateFormat={setDateFormat}
                countryMapping={countryMapping}
                setCountryMapping={setCountryMapping}
                handleApplyRule={() => {
                  handleApplyRule();
                  setActiveModal(null);
                }}
                fileId={fileId}
                loading={loading}
              />
            )}
            {activeModal === 'uniqueIdentifier' && (
              <UniqueIdentifierModal
                isOpen={activeModal === 'uniqueIdentifier'}
                onClose={() => setActiveModal(null)}
                columns={allColumns}
                data={originalData}
                onRemoveDuplicates={handleRemoveDuplicates}
              />
            )}
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setActiveModal(null)} 
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        onDownload={handleDownloadFile}
        theme={theme}
      />

      {isStatsModalOpen && (
        <StatsModal
          fileId={fileId}
          columns={allColumns}
          theme={theme}
          onClose={() => setIsStatsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DataCleansingWorkspace;
