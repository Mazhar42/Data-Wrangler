import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import toast from 'react-hot-toast';

import { 
  Plus, 
  Folder, 
  FileText, 
  Calendar, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Upload,
  Search
} from 'lucide-react';
import { projectsAPI } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import CreateProjectModal from './CreateProjectModal';
import ProjectCard from './ProjectCard';

const ProjectDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsAPI.getAll();
      console.log('Fetched projects:', data);
      setProjects(data);
      setError(null);
    } catch (err) {
      setError('Failed to load projects');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      console.log('Creating project with data:', projectData);
      const newProject = await projectsAPI.create(projectData);
      console.log('Project created successfully:', newProject);
      setProjects(prev => {
        const updatedProjects = [newProject, ...prev];
        console.log('Updated projects list:', updatedProjects);
        return updatedProjects;
      });
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await projectsAPI.delete(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      toast.error('Failed to delete project');
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
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
          <p className="text-gray-600">Loading your projects...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.name?.split(' ')[0] || 'User'}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your data projects and transform your datasets
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Project
            </motion.button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Stats */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm"
              />
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <Folder className="w-4 h-4 mr-2 text-indigo-500" />
                <span className="font-medium">{projects.length}</span>
                <span className="ml-1">Projects</span>
              </div>
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-2 text-green-500" />
                <span className="font-medium">
                  {projects.reduce((acc, p) => acc + (p.files?.length || 0), 0)}
                </span>
                <span className="ml-1">Files</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
          >
            <p className="text-red-600">{error}</p>
          </motion.div>
        )}

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Folder className="w-12 h-12 text-indigo-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {searchTerm ? 'No projects found' : 'No projects yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? `No projects match "${searchTerm}". Try a different search term.`
                  : 'Create your first project to start organizing and processing your data files.'
                }
              </p>
              {!searchTerm && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Create Your First Project
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProjects.map((project) => (
              <motion.div key={project.id} variants={itemVariants}>
                <ProjectCard 
                  project={project} 
                  onDelete={handleDeleteProject}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
};

export default ProjectDashboard;
