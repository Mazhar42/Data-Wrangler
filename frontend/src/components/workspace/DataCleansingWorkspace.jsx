import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Sparkles, Play, Filter, Plus, Download, Undo, Redo, Trash2, Save, History, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../DataTable';
// Sidebar removed; operations moved to toolbar above table
import CustomRulesModal from './CustomRulesModal';
import FilterModal from './FilterModal';
import EquationBuilderModal from './EquationBuilderModal';
import DownloadModal from '../../DownloadModal';
import UniqueIdentifierModal from '../../UniqueIdentifierModal';
import StatsModal from '../../StatsModal';
import { filesAPI, formulasAPI } from '../../utils/api';
import ThemeSwitcher from '../../ThemeSwitcher';
import ConfirmationModal from './ConfirmationModal';
import ChatButton from '../chat/ChatButton';
import ChatWindow from '../chat/ChatWindow';
import { GroupingModal } from './GroupingModal';
import { AnomalyDetectionModal } from './AnomalyDetectionModal';

const DataCleansingWorkspace = ({ fileId, onBack, projectName, cachedData, onDataLoaded, projectId, fileName }) => {
  const [allColumns, setAllColumns] = useState([]);
  
  const [loading, setLoading] = useState(false);
  
  const [selectedColumn, setSelectedColumn] = useState('');
  const [selectedRuleType, setSelectedRuleType] = useState('');
  const [dateFormat, setDateFormat] = useState('');
  const [countryMapping, setCountryMapping] = useState('');
  const [originalData, setOriginalData] = useState([]);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [clearSelectionSignal, setClearSelectionSignal] = useState(0);
  const [theme, setTheme] = useState('light');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isDemo = user?.provider === 'demo';
  const [resolvedFileName, setResolvedFileName] = useState(fileName || '');
  const [originalDataTotalRows, setOriginalDataTotalRows] = useState(0);
  const [currentOriginalPage, setCurrentOriginalPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [savedFormulas, setSavedFormulas] = useState([]);
  const [filterCriteria] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [modifications, setModifications] = useState([]);
  const [columnSearches, setColumnSearches] = useState({});
  
  
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showRedoConfirm, setShowRedoConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [isGroupingModalOpen, setIsGroupingModalOpen] = useState(false);
  const [isAnomalyModalOpen, setIsAnomalyModalOpen] = useState(false);

  const applyAndSave = async (newMods) => {
    if (!fileId) return;
    setLoading(true);
    // In auto-save mode, we commit changes immediately.
    // We combine any existing pending modifications with the new ones.
    const modsToSave = [...modifications, ...newMods];
    
    try {
      await filesAPI.applyModifications(fileId, modsToSave);
      setModifications([]); 
      toast.success('Changes saved successfully!');
      
      // Refresh data to reflect the saved state
      // Passing empty array because changes are now part of the base file
      await handlePreview(currentOriginalPage, []); 
    } catch (error) {
      console.error("Auto-save failed:", error);
      toast.error('Failed to save changes.');
      // Revert to pending state if save fails
      setModifications(modsToSave); 
    } finally {
      setLoading(false);
    }
  };

  const handleApplySpellingCorrection = (column, mapping) => {
    const newModification = {
      type: 'rule',
      rule: {
        column_name: column,
        rule_type: 'correct_spelling',
        payload: { mapping },
      },
    };
    applyAndSave([newModification]);
  };

  const loadFormulas = useCallback(async () => {
    try {
      const data = await formulasAPI.getAll(projectId);
      setSavedFormulas(data);
    } catch {
      console.error('Error loading formulas:');
    }
  }, [projectId]);

  const addRowIds = (rows, page) => {
    const base = ((page - 1) * itemsPerPage);
    return (rows || []).map((r, idx) => ({ ...r, _rowId: base + idx + 1 }));
  };

  const loadFileData = useCallback(async () => {
    if (cachedData) {
      setOriginalData(addRowIds(cachedData.data, 1));
      setAllColumns(cachedData.columns);
      setOriginalDataTotalRows(cachedData.total_rows);
      return;
    }

    if (!fileId) return;
    setLoading(true);
    try {
      const data = await filesAPI.getContent(fileId, currentOriginalPage, itemsPerPage);
      setOriginalData(addRowIds(data.data, currentOriginalPage));
      const columns = data.data.length > 0 ? Object.keys(data.data[0]) : [];
      setAllColumns(columns);
      setOriginalDataTotalRows(data.total_rows);
      onDataLoaded(fileId, { data: data.data, columns: columns, total_rows: data.total_rows });
    } catch {
      toast.error('An unexpected error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  }, [fileId, currentOriginalPage, itemsPerPage, onDataLoaded, cachedData]);

  useEffect(() => {
    loadFormulas();
    loadFileData();
  }, [fileId, loadFileData, loadFormulas, projectId]);

  useEffect(() => {
    // keep file name updated if passed or can be inferred
    if (fileName) setResolvedFileName(fileName);
  }, [fileName]);

  const handlePreview = useCallback(async (page, mods) => {
    console.log("Previewing modifications:", mods);
    if (!fileId) return;
    setLoading(true);
    try {
      // Inject current column searches into preview if not present in mods
      // This ensures the view maintains the search filter even after auto-save clears modifications
      let finalMods = [...mods];
      const hasSearchInMods = finalMods.some(m => m.type === 'column_search');
      if (!hasSearchInMods && Object.values(columnSearches).some(s => s)) {
        finalMods.push({ type: 'column_search', search: columnSearches });
      }

      const data = await filesAPI.previewModifications(fileId, finalMods, page, itemsPerPage);
      setOriginalData(addRowIds(data.data, page));
      setOriginalDataTotalRows(data.total_rows);
      setCurrentOriginalPage(page);
    } catch {
      toast.error('An unexpected error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  }, [fileId, itemsPerPage, columnSearches]);

  const handleDataRefresh = (action) => {
    if (action === 'save') {
      // In auto-save mode, there shouldn't be pending changes to save manually,
      // but if there are, we save them.
      if (modifications.length > 0) {
        applyAndSave([]);
      }
    } else if (action === 'clear') {
      confirmClearAll();
    } else {
      handlePreview(currentOriginalPage, modifications);
    }
  };

  const handleApplyRule = (page) => {
    if (!selectedColumn) {
      toast.error('Please select a column.');
      return;
    }
    if (!selectedRuleType) {
      toast.error('Please select a rule type.');
      return;
    }

    let payload;
    if (selectedRuleType === 'correct_date') {
      payload = { target_format: dateFormat };
    } else if (selectedRuleType === 'correct_country') {
      try {
        payload = { mapping: JSON.parse(countryMapping) };
      } catch {
        toast.error('Invalid JSON for country mapping.');
        return;
      }
    } else if (selectedRuleType === 'correct_spelling') {
      try {
        payload = { mapping: JSON.parse(countryMapping) };
      } catch {
        toast.error('Invalid JSON for spelling mapping.');
        return;
      }
    }

    const newModification = {
      type: 'rule',
      rule: {
        column_name: selectedColumn,
        rule_type: selectedRuleType,
        payload: payload,
      },
    };
    applyAndSave([newModification]);
    setActiveModal(null);
  };

  const handleApplyFilter = (criteria) => {
    if (!criteria) {
      toast.error('Please provide filter criteria.');
      return;
    }
    const newModification = { type: 'filter', criteria };
    applyAndSave([newModification]);
    setActiveModal(null);
  };

  const handleApplyFormula = (name, expression) => {
    if (!name) {
      toast.error('Please provide a formula name.');
      return;
    }
    if (!expression) {
      toast.error('Please provide a formula expression.');
      return;
    }
    const newModification = {
      type: 'formula',
      formula: { formula_name: name, formula_expression: expression },
    };
    applyAndSave([newModification]);
    setActiveModal(null);
  };

  const handleDownload = async (format) => {
    if (!fileId) return;
    try {
      const response = await filesAPI.downloadModified(fileId, modifications, format);
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cleaned_data.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('File downloaded successfully!');
    } catch {
      toast.error('Failed to download file.');
    }
    setIsDownloadModalOpen(false);
  };

  const handleUndo = () => {
    setShowUndoConfirm(true);
  };

  const confirmUndo = async () => {
    setShowUndoConfirm(false);
    if (!fileId) return;
    setLoading(true);
    try {
      await filesAPI.undo(fileId);
      setModifications([]); // Clear local modifications
      toast.success('Last saved operation undone.');
      // Refresh data to reflect the undone state with correct row IDs
      await handlePreview(currentOriginalPage, []);
    } catch (error) {
      toast.error('Failed to undo the last operation.');
      console.error("Failed to undo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedo = () => {
    setShowRedoConfirm(true);
  };

  const confirmRedo = async () => {
    setShowRedoConfirm(false);
    if (!fileId) return;
    setLoading(true);
    try {
      await filesAPI.redo(fileId);
      setModifications([]); // Clear local modifications
      toast.success('Last undone operation redone.');
      // Refresh data to reflect the redone state with correct row IDs
      await handlePreview(currentOriginalPage, []);
    } catch (error) {
      toast.error('Failed to redo the last operation.');
      console.error("Failed to redo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    // Allow resetting the file at any time
    setShowClearAllConfirm(true);
  };

  const confirmClearAll = async () => {
    setShowClearAllConfirm(false);
    if (!fileId) return;
    setLoading(true);
    try {
      await filesAPI.reset(fileId);
      setModifications([]);
      setColumnSearches({}); // Clear column searches
      await handlePreview(1, []);
      toast.success('All modifications cleared (file reset to original).');
    } catch (error) {
      console.error("Failed to reset file:", error);
      toast.error('Failed to clear modifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleColumnSearch = useCallback((searches) => {
    setColumnSearches(searches);
    // For auto-save, we need to decide if search is saved.
    // Assuming yes based on "save after each operation".
    // We construct the modification and save it.
    
    // Check if we already have a column_search in modifications
    // In auto-save, modifications is usually empty.
    
    if (Object.values(searches).some(s => s)) {
      const newMod = { type: 'column_search', search: searches };
      // We pass it to applyAndSave. Note that applyAndSave appends.
      // If we had pending mods, we'd need to replace the old column_search.
      // But assuming modifications is empty, we just save this one.
      
      // Wait, applyAndSave appends. If we type 'a', then 'ab', we get two search mods?
      // That would stack filters. "Search A" then "Search AB" (which yields empty if A excluded B).
      // Search is usually "Replace current search".
      // But the backend `applyModifications` API likely treats it as a step in the pipeline.
      // If we want to "Update" the search, we might need to Undo the last search?
      // This is complicated for auto-save.
      // Let's implement it as: Only save if user explicitly "applies" via Enter?
      // But this callback comes from DataTable, usually on change.
      
      // ALTERNATIVE: Don't auto-save Search. Keep it local.
      // But user removed Save button.
      // If we keep it local, refreshing loses it.
      // User said "refresh... operation should save".
      // So we MUST save.
      
      // To prevent stacking, we rely on the fact that usually people clear search before new search?
      // No.
      // If I type 'a', I save. Pipeline: [Search 'a'].
      // I type 'b' (now 'ab'). I save. Pipeline: [Search 'a', Search 'ab'].
      // Result: Empty.
      // This is BAD.
      
      // Fix: We can't auto-save cumulative search steps easily without "Undo" previous search step.
      // Or, the backend needs to support "Upsert" of a step type.
      // Since I can't change backend logic easily right now without risking regression.
      // I will implement Search as "Preview Only" (Local) for now.
      // It will NOT persist on refresh.
      // This is the safest bet for Search functionality.
      // I will add a comment.
      
      setModifications(prev => {
        // We update local state only for search.
        const newModifications = prev.filter(mod => mod.type !== 'column_search');
        newModifications.push({ type: 'column_search', search: searches });
        handlePreview(1, newModifications);
        return newModifications;
      });
      
    } else {
       // Search cleared
       setModifications(prev => {
         const newModifications = prev.filter(mod => mod.type !== 'column_search');
         handlePreview(1, newModifications);
         return newModifications;
       });
    }
  }, [handlePreview, setColumnSearches]);

  const handleCellChange = (rowIndex, columnKey, oldValue, newValue, applyToAll) => {
    const newModification = {
      type: 'cell_edit',
      edit: {
        rowIndex,
        columnKey,
        oldValue,
        newValue,
        applyToAll,
      },
    };
    applyAndSave([newModification]);
  };

  const handleSuggestion = (suggestion, accept) => {
    if (accept) {
      if (suggestion.type === 'filter') {
        const { column, operator, value } = suggestion.criteria;

        // Check if the filter can be translated into a column search
        if (operator === 'is' || operator === 'contains' || operator === 'starts_with' || operator === 'ends_with') {
          const newColumnSearches = { ...columnSearches, [column]: value };
          setColumnSearches(newColumnSearches); // Update the state for manual search inputs
          // Call handleColumnSearch to apply this as a column_search modification
          handleColumnSearch(newColumnSearches);
          toast.success(`Column search applied for ${column}: ${value}`);
        } else {
          // For other operators, apply as a generic filter
          // Use our new auto-save logic via handleApplyFilter logic (replicated)
          const newModification = { type: 'filter', criteria: suggestion.criteria };
          applyAndSave([newModification]);
          toast.success('Filter applied successfully!');
        }
      } else {
        // Existing logic for other types of suggestions
        let newModifications;
        if (Array.isArray(suggestion)) {
          newModifications = suggestion;
        } else {
          newModifications = [suggestion];
        }
        applyAndSave(newModifications);
      }
    } else {
      toast.error('Suggestion rejected.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="bg-black text-white shadow-sm sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isDemo && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onBack}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                  aria-label="Back to Project"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </motion.button>
              )}
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-sm sm:text-base font-normal tracking-tight">Agentic AI Data Wrangler</span>
            </div>
            <div className="flex items-center gap-3">
              {!isDemo && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/projects/${projectId}/history`)}
                    className="p-2 rounded-full bg-white text-black hover:bg-gray-100"
                    title="View History"
                    aria-label="View History"
                  >
                    <History className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/projects/${projectId}/config`)}
                    className="p-2 rounded-full bg-white text-black hover:bg-gray-100"
                    title="Configuration"
                    aria-label="Configuration"
                  >
                    <Settings className="w-4 h-4" />
                  </motion.button>
                </>
              )}
              {(() => {
                const getInitials = (fullName) => {
                  if (!fullName || typeof fullName !== 'string') return 'AA';
                  const parts = fullName.trim().split(/\s+/);
                  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                };
                const initials = getInitials(user?.name || user?.email || 'User');
                return (
                  <button
                    title={user?.name || 'Profile'}
                    onClick={logout}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-500 text-white flex items-center justify-center hover:bg-gray-700 focus:outline-none"
                  >
                    <span className="text-xs sm:text-sm font-medium tracking-tight">{initials}</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      </header>

      <div className="px-3 sm:px-4 py-4">
        {/* Toolbar above table with file title (left) and operations (right) */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{resolvedFileName || 'Workspace File'}</h2>
          <div className="flex items-center gap-2 sm:gap-3">
            <button title="Apply Rule" aria-label="Apply Rule" onClick={() => setActiveModal('customRules')} className="p-2 rounded-full bg-black text-white hover:bg-gray-900">
              <Play className="w-4 h-4" />
            </button>
            <button title="Apply Filter" aria-label="Apply Filter" onClick={() => setActiveModal('filter')} className="p-2 rounded-full bg-black text-white hover:bg-gray-900">
              <Filter className="w-4 h-4" />
            </button>
            <button title="Apply Formula" aria-label="Apply Formula" onClick={() => setActiveModal('equationBuilder')} className="p-2 rounded-full bg-black text-white hover:bg-gray-900">
              <Plus className="w-4 h-4" />
            </button>
            <button title="AI Spelling Correction" aria-label="AI Spelling Correction" onClick={() => setIsGroupingModalOpen(true)} className="p-2 rounded-full bg-black text-white hover:bg-gray-900">
              <Sparkles className="w-4 h-4" />
            </button>
            {!isDemo && (
              <button title="Download" aria-label="Download" onClick={() => setIsDownloadModalOpen(true)} className="p-2 rounded-full bg-black text-white hover:bg-gray-900">
                <Download className="w-4 h-4" />
              </button>
            )}
            <button title="Undo" aria-label="Undo" onClick={handleUndo} className="p-2 rounded-full bg-black text-white hover:bg-gray-900">
              <Undo className="w-4 h-4" />
            </button>
            <button title="Redo" aria-label="Redo" onClick={handleRedo} className="p-2 rounded-full bg-black text-white hover:bg-gray-900">
              <Redo className="w-4 h-4" />
            </button>
            <button title="Clear All" aria-label="Clear All" onClick={handleClearAll} className="p-2 rounded-full bg-black text-white hover:bg-gray-900">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="bg-card-background rounded-lg shadow overflow-hidden">
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
            showTitle={false}
            enableStats={false}
            compact={true}
            enableSelection={true}
            selectionKey={'_rowId'}
            onSelectionChange={(ids) => setSelectedRowIds(ids)}
            clearSelectionSignal={clearSelectionSignal}
            onClearSelection={() => { setSelectedRowIds([]); setClearSelectionSignal(s => s + 1); }}
          />
        </div>
      </div>

      <CustomRulesModal
        isOpen={activeModal === 'customRules'}
        onClose={() => setActiveModal(null)}
        allColumns={allColumns}
        selectedColumn={selectedColumn}
        setSelectedColumn={setSelectedColumn}
        selectedRuleType={selectedRuleType}
        setSelectedRuleType={setSelectedRuleType}
        dateFormat={dateFormat}
        setDateFormat={setDateFormat}
        countryMapping={countryMapping}
        setCountryMapping={setCountryMapping}
        handleApplyRule={handleApplyRule}
        fileId={fileId}
        loading={loading}
      />

      <FilterModal
        isOpen={activeModal === 'filter'}
        onClose={() => setActiveModal(null)}
        columns={allColumns}
        onApplyFilter={handleApplyFilter}
        fileId={fileId}
        loading={loading}
      />

      <EquationBuilderModal
        isOpen={activeModal === 'equationBuilder'}
        onClose={() => setActiveModal(null)}
        columns={allColumns}
        onApplyFormula={handleApplyFormula}
        fileId={fileId}
        loading={loading}
        savedFormulas={savedFormulas}
        projectId={projectId}
      />

      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        onDownload={handleDownload}
      />

      <ConfirmationModal
        isOpen={showUndoConfirm}
        onClose={() => setShowUndoConfirm(false)}
        onConfirm={confirmUndo}
        message="Are you sure you want to undo the last operation?"
      />

      <ConfirmationModal
        isOpen={showRedoConfirm}
        onClose={() => setShowRedoConfirm(false)}
        onConfirm={confirmRedo}
        message="Are you sure you want to redo the last undone operation?"
      />

      <ConfirmationModal
        isOpen={showClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        onConfirm={confirmClearAll}
        message="Are you sure you want to clear all modifications? This cannot be undone."
      />

      <ChatButton onClick={() => setIsChatOpen(!isChatOpen)} />
      {isChatOpen && fileId && (
        <ChatWindow
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onCleansingDone={handleDataRefresh}
          onSuggestion={handleSuggestion}
          onDownload={handleDownload}
          allColumns={allColumns}
          projectId={projectId}
          fileId={fileId}
        />
      )}

      <GroupingModal
        isOpen={isGroupingModalOpen}
        onClose={() => setIsGroupingModalOpen(false)}
        fileId={fileId}
        allColumns={allColumns}
        onApply={handleApplySpellingCorrection}
        loading={loading}
        theme={theme}
      />

      <AnomalyDetectionModal
        isOpen={isAnomalyModalOpen}
        onClose={() => setIsAnomalyModalOpen(false)}
        fileId={fileId}
        allColumns={allColumns}
        onApply={() => {}}
        loading={loading}
        theme={theme}
      />
    </div>
  );
};

export default DataCleansingWorkspace;