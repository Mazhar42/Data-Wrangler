import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileText, Trash2, ArrowLeft, History, Sparkles, Settings } from 'lucide-react';
import { projectsAPI, filesAPI } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import DataCleansingWorkspace from '../workspace/DataCleansingWorkspace';
import DataTable from '../../DataTable';
import toast from 'react-hot-toast';
import DeleteConfirmationModal from '../workspace/DeleteConfirmationModal';

const ProjectDetail = () => {
  const { id, fileId } = useParams();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [project, setProject] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeFileId, setActiveFileId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cachedData, setCachedData] = useState({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  // Table state mirroring dashboard functionality
  const [columnSearches, setColumnSearches] = useState({});
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [clearSelectionSignal, setClearSelectionSignal] = useState(0);
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc');

  const fetchProject = useCallback(async () => {
    try {
      const data = await projectsAPI.getById(id);
      setProject(data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      toast.error('Could not load project details.');
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Initialize workspace view from URL param so refresh persists current file
  useEffect(() => {
    if (fileId) {
      setActiveFileId(fileId);
    }
  }, [fileId]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      await projectsAPI.uploadFile(id, formData);
      fetchProject(); // Refresh project data to show new file
      setSelectedFile(null);
      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error('File upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = (fileId) => {
    setFilesToDelete([fileId]);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (filesToDelete && filesToDelete.length > 0) {
      try {
        for (const fid of filesToDelete) {
          await filesAPI.deleteFile(fid);
        }
        toast.success(filesToDelete.length === 1 ? 'File deleted.' : 'Files deleted.');
        await fetchProject(); // Refresh
      } catch (error) {
        console.error('Failed to delete file(s):', error);
        toast.error('Could not delete file(s).');
      }
    }
    setIsDeleteModalOpen(false);
    setFilesToDelete([]);
    // Clear selection in table if any
    setSelectedIds([]);
    setClearSelectionSignal(s => s + 1);
  };


  const handleDataLoaded = useCallback((fileId, data) => {
    setCachedData(prev => ({ ...prev, [fileId]: data }));
  }, []);

  if (activeFileId) {
    return (
      <DataCleansingWorkspace
        fileId={activeFileId}
        onBack={() => { setActiveFileId(null); navigate(`/projects/${id}`); }}
        projectName={project?.name}
        fileName={(() => {
          const files = project?.files || [];
          const f = files.find((x) => String(x.id) === String(activeFileId));
          return f?.filename || '';
        })()}
        cachedData={cachedData[activeFileId]}
        onDataLoaded={handleDataLoaded}
        projectId={id}
      />
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isDemo = user?.provider === 'demo';

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-black text-white shadow-sm sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isDemo && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/dashboard')}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                  aria-label="Back to Dashboard"
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
                    onClick={() => navigate(`/projects/${id}/history`)}
                    className="p-2 rounded-full bg-white text-black hover:bg-gray-100"
                    title="View History"
                    aria-label="View History"
                  >
                    <History className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/projects/${id}/config`)}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section header with right-aligned Upload button */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            {isDemo ? "Demo Workspace" : project.name}
          </h2>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center bg-black text-white px-3 py-1 rounded-md shadow-sm text-xs hover:bg-gray-900"
            >
              <Upload className="w-4 h-4 mr-2" /> Upload File
            </motion.button>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-700">Sort by</span>
              <select
                value={sortField}
                onChange={(e) => { setSortField(e.target.value); setCurrentPage(1); }}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
              >
                <option value="id">Id</option>
                <option value="filename">File Name</option>
                <option value="uploaded_at">Uploaded At</option>
                <option value="updated_at">Updated At</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          {project.files.length === 0 ? (
            <p className="text-gray-600">No files uploaded yet.</p>
          ) : (
            (() => {
              // Prepare table data with pagination and search mirroring dashboard behavior
              const files = Array.isArray(project.files) ? project.files : [];
              const filtered = files.filter((f) => {
                if (!columnSearches || Object.keys(columnSearches).length === 0) return true;
                return Object.entries(columnSearches).every(([key, val]) => {
                  if (!val) return true;
                  const v = f[key];
                  return String(v ?? '').toLowerCase().includes(String(val).toLowerCase());
                });
              });
              // Apply sorting
              const sorted = [...filtered].sort((a, b) => {
                const dir = sortOrder === 'asc' ? 1 : -1;
                const av = a[sortField];
                const bv = b[sortField];
                if (av == null && bv == null) return 0;
                if (av == null) return -1 * dir;
                if (bv == null) return 1 * dir;
                // date-safe compare
                if (['uploaded_at','updated_at'].includes(sortField)) {
                  const ad = Date.parse(av);
                  const bd = Date.parse(bv);
                  if (!isNaN(ad) && !isNaN(bd)) return (ad - bd) * dir;
                }
                return String(av).localeCompare(String(bv)) * dir;
              });
              const totalRows = sorted.length;
              const start = (currentPage - 1) * itemsPerPage;
              const end = start + itemsPerPage;
              const pageData = sorted.slice(start, end);

              const handlePageChange = (page) => {
                const totalPages = Math.max(1, Math.ceil(totalRows / itemsPerPage));
                const p = Math.min(Math.max(1, page), totalPages);
                setCurrentPage(p);
              };

              const handleColumnSearch = (searches) => {
                setColumnSearches(prev => {
                  const a = JSON.stringify(prev || {});
                  const b = JSON.stringify(searches || {});
                  return a === b ? prev : (searches || {});
                });
                setCurrentPage(1);
              };

              return (
                <DataTable
                  title={''}
                  data={pageData}
                  totalRows={totalRows}
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  columnSearches={columnSearches}
                  onColumnSearch={handleColumnSearch}
                  allColumns={['id', 'filename', 'uploaded_at', 'uploaded_by', 'updated_at', 'updated_by']}
                  enableSelection={true}
                  selectionKey={'id'}
                  onSelectionChange={(ids) => setSelectedIds(ids)}
                  clearSelectionSignal={clearSelectionSignal}
                  onViewSelected={(fid) => navigate(`/projects/${id}/files/${fid}`)}
                  onEditSelected={undefined}
                  onDeleteSelected={(ids) => { setFilesToDelete(ids); setIsDeleteModalOpen(true); }}
                  onClearSelection={() => { setSelectedIds([]); setClearSelectionSignal(s => s + 1); }}
                  linkColumns={['id', 'filename']}
                  getRowLink={(row) => `/projects/${id}/files/${row.id}`}
                  showTitle={false}
                  compact={true}
                  enableStats={false}
                />
              );
            })()
          )}
        </div>
      </main>
  <DeleteConfirmationModal
    isOpen={isDeleteModalOpen}
    onClose={() => setIsDeleteModalOpen(false)}
    onConfirm={confirmDelete}
    message="Are you sure you want to delete this file? This action cannot be undone."
  />
  {/* Upload Modal */}
  {isUploadModalOpen && (
    <div className="fixed inset-0 bg-gray bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-20">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6">Upload New File</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleUpload(); setIsUploadModalOpen(false); }}>
          <div className="mb-4">
            <label htmlFor="modalFileInput" className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input
              type="file"
              id="modalFileInput"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={() => { setSelectedFile(null); setIsUploadModalOpen(false); }} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={!selectedFile || loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300">Upload</button>
          </div>
        </form>
      </div>
    </div>
  )}
    </div>
  );
};

export default ProjectDetail;
