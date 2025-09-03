import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';

import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Calendar, 
  Database,
  Settings,
  Download,
  Trash2
} from 'lucide-react';
import { projectsAPI, filesAPI } from '../../utils/api';
import DataCleansingWorkspace from '../workspace/DataCleansingWorkspace';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileDataCache, setFileDataCache] = useState({});

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectsAPI.getById(id);
      setProject(data);
      setError(null);
    } catch (err) {
      setError('Failed to load project');
      console.error('Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleDataLoaded = (fileId, data) => {
    setFileDataCache(prevCache => ({
      ...prevCache,
      [fileId]: data
    }));
  };

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleFileUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await projectsAPI.uploadFile(id, formData);
      
      // Refresh project to get updated file list
      await fetchProject();
      
      // Set the newly uploaded file as active
      setActiveFile(result.file_id);
      setShowUploadModal(false);
      
      return result;
    } catch (err) {
      console.error('Error uploading file:', err);
      throw err;
    }
  };

  const handleFileDelete = async (fileId, filename) => {
    // Show confirmation dialog
    const isConfirmed = window.confirm(
      `Are you sure you want to delete "${filename}"? This action cannot be undone.`
    );
    
    if (isConfirmed) {
      try {
        await filesAPI.deleteFile(fileId);
        fetchProject(); // Refresh the file list
      } catch (error) {
        toast.error('Failed to delete file: ' + error.message);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If a file is selected for processing, show the workspace
  if (activeFile) {
    return (
      <DataCleansingWorkspace 
        fileId={activeFile}
        projectId={id}
        onBack={() => setActiveFile(null)}
        projectName={project?.name}
        cachedData={fileDataCache[activeFile]}
        onDataLoaded={handleDataLoaded}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/dashboard')}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </motion.button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{project?.name}</h1>
                <p className="text-gray-600 mt-1">
                  {project?.description || 'No description provided'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload File
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Files</p>
                <p className="text-2xl font-bold text-gray-900">{project?.files?.length || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(project?.created_at)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mr-4">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(project?.updated_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Files Section */}
        <div className="bg-white rounded-2xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-indigo-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Project Files</h2>
              </div>
              <span className="text-sm text-gray-500">
                {project?.files?.length || 0} files
              </span>
            </div>
          </div>

          <div className="p-6">
            {!project?.files || project.files.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No files uploaded yet</h3>
                <p className="text-gray-600 mb-6">
                  Upload your first CSV or Excel file to start data cleansing operations.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowUploadModal(true)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Upload Your First File
                </motion.button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.files.map((file, index) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
                    onClick={() => setActiveFile(file.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent opening the file
                            handleFileDelete(file.id, file.filename);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">
                      {file.filename}
                    </h4>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Uploaded {formatDate(file.uploaded_at)}</span>
                      <span className="text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to process →
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <FileUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleFileUpload}
        />
      )}
    </div>
  );
};

// Simple upload modal component
const FileUploadModal = ({ onClose, onUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    try {
      await onUpload(selectedFile);
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold mb-6">Upload File</h3>
        
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            Drop your file here or click to browse
          </p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-indigo-200 transition-colors"
          >
            Choose File
          </label>
        </div>

        {selectedFile && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="font-medium">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={uploading}
            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProjectDetail;
