import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';


import { 
  Folder, 
  FileText, 
  Calendar, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Upload,
  ExternalLink
} from 'lucide-react';

const ProjectCard = ({ project, onDelete }) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`);
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    // TODO: Implement edit functionality
    setShowMenu(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(project.id);
    setShowMenu(false);
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 overflow-hidden cursor-pointer relative group"
      onClick={handleCardClick}
    >
      {/* Menu Dropdown */}
      {showMenu && (
        <div className="absolute top-12 right-4 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20 min-w-[140px]">
          <button
            onClick={handleEdit}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Edit3 className="w-4 h-4 mr-3" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-3" />
            Delete
          </button>
        </div>
      )}

      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Folder className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                {project.name}
              </h3>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(project.created_at)}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-gray-600 text-sm mt-4 line-clamp-2">
            {project.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="px-6 pb-4">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center text-gray-600">
            <FileText className="w-4 h-4 mr-2 text-blue-500" />
            <span className="font-medium">{project.files?.length || 0}</span>
            <span className="ml-1">files</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Upload className="w-4 h-4 mr-2 text-green-500" />
            <span className="text-xs">
              Updated {formatDate(project.updated_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-500">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
            Active
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="flex items-center text-xs text-indigo-600 font-medium"
          >
            Open project
            <ExternalLink className="w-3 h-3 ml-1" />
          </motion.div>
        </div>
      </div>

      {/* Overlay for click effect */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 0.1 }}
        className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 pointer-events-none"
      />
    </motion.div>
  );
};

export default ProjectCard;
