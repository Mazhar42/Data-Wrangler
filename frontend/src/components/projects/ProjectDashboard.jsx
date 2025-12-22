import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Sparkles, Settings } from 'lucide-react';
import { projectsAPI } from '../../utils/api';
import DeleteConfirmationModal from '../workspace/DeleteConfirmationModal';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import DataTable from '../../DataTable';

const ProjectDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [columnSearches, setColumnSearches] = useState({ name: '', description: '', files: '', last_updated_at: '', created_at: '', created_by: '', last_updated_by: '' });
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { logout, user } = useAuth();
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  // Selection removed to match DataTable visuals
  const [lastUpdatedByMap, setLastUpdatedByMap] = useState({});
  // Selection state for actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [clearSelectionSignal, setClearSelectionSignal] = useState(0);
  const navigate = useNavigate();
  // Sorting controls
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  const fetchProjects = useCallback(async () => {
    try {
      const data = await projectsAPI.getAll();
      setProjects(data);
      
      // Redirect demo user immediately if they have a project
      if (user?.provider === 'demo' && data.length > 0) {
         navigate(`/projects/${data[0].id}`);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Could not load your projects.');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch last updated by (from project history) for each project
  useEffect(() => {
    const loadLastUpdatedBy = async () => {
      try {
        const entries = await Promise.all(
          projects.map(async (p) => {
            try {
              const history = await (await import('../../utils/api')).historyAPI.getProjectHistory(p.id);
              const lastUpdate = history.find(h => h.operation === 'update_project') || history[0];
              const name = lastUpdate?.user?.name || lastUpdate?.user?.email || '';
              return [p.id, name];
            } catch (e) {
              return [p.id, ''];
            }
          })
        );
        setLastUpdatedByMap(Object.fromEntries(entries));
      } catch (e) {
        // ignore and keep defaults
      }
    };
    if (projects && projects.length > 0) {
      loadLastUpdatedBy();
    } else {
      setLastUpdatedByMap({});
    }
  }, [projects]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const newProject = await projectsAPI.create({
        name: newProjectName,
        description: newProjectDescription,
      });
      setProjects([...projects, newProject]);
      setNewProjectName('');
      setNewProjectDescription('');
      setIsModalOpen(false);
      toast.success('Project created successfully!');
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Could not create the project.');
    }
  };

  const handleDeleteProject = (id) => {
    setProjectToDelete(id);
    setIsDeleteProjectModalOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      if (Array.isArray(projectToDelete)) {
        for (const id of projectToDelete) {
          try { await projectsAPI.delete(id); } catch (e) { /* continue */ }
        }
        setProjects(prev => prev.filter(p => !projectToDelete.includes(p.id)));
        toast.success('Selected projects deleted.');
      } else {
        await projectsAPI.delete(projectToDelete);
        setProjects(projects.filter((p) => p.id !== projectToDelete));
        toast.success('Project deleted.');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Could not delete the project(s).');
    } finally {
      setIsDeleteProjectModalOpen(false);
      setProjectToDelete(null);
      setSelectedIds([]);
      setClearSelectionSignal(s => s + 1);
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editingProject || !editingProject.name.trim()) return;
    try {
      const updated = await projectsAPI.update(editingProject.id, {
        name: editingProject.name,
        description: editingProject.description,
      });
      setProjects(projects.map((p) => (p.id === editingProject.id ? updated : p)));
      setEditingProject(null);
      setIsModalOpen(false);
      toast.success('Project updated.');
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error('Could not update the project.');
    }
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setNewProjectName('');
    setNewProjectDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (project) => {
    setEditingProject({ ...project });
    setIsModalOpen(true);
  };

  // Derived data for DataTable searches
  const filteredProjects = projects.filter((p) => {
    const filesCount = p.files?.length || 0;
    const createdBy = p.owner?.name || p.owner?.email || '';
    const updatedBy = lastUpdatedByMap[p.id] || '';
    const lastUpdatedAt = p.updated_at || '';
    const createdAt = p.created_at || '';
    return (
      (columnSearches.name ? (p.name || '').toLowerCase().includes(columnSearches.name.toLowerCase()) : true) &&
      (columnSearches.description ? (p.description || '').toLowerCase().includes(columnSearches.description.toLowerCase()) : true) &&
      (columnSearches.files ? String(filesCount).includes(columnSearches.files) : true) &&
      (columnSearches.last_updated_at ? String(lastUpdatedAt).toLowerCase().includes(columnSearches.last_updated_at.toLowerCase()) : true) &&
      (columnSearches.created_at ? String(createdAt).toLowerCase().includes(columnSearches.created_at.toLowerCase()) : true) &&
      (columnSearches.created_by ? createdBy.toLowerCase().includes(columnSearches.created_by.toLowerCase()) : true) &&
      (columnSearches.last_updated_by ? updatedBy.toLowerCase().includes(columnSearches.last_updated_by.toLowerCase()) : true)
    );
  });
  // Sort before pagination
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'id':
        return (Number(a.id) - Number(b.id)) * dir;
      case 'name':
        return String(a.name || '').localeCompare(String(b.name || '')) * dir;
      case 'created_at': {
        const av = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bv = b.created_at ? new Date(b.created_at).getTime() : 0;
        return (av - bv) * dir;
      }
      case 'updated_at':
      case 'last_updated_at': {
        const av = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bv = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return (av - bv) * dir;
      }
      default:
        return 0;
    }
  });
  const totalRows = sortedProjects.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProjects = sortedProjects.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const goToPage = (page) => {
    if (!Number.isFinite(page)) return;
    const p = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(p);
  };

  // Inline edit handler for DataTable (name/description only)
  const handleCellChange = async (rowIndex, colKey, oldValue, newValue, applyToAll) => {
    try {
      const targetProjects = applyToAll
        ? paginatedProjects.filter(row => String(row[colKey]) === String(oldValue))
        : [paginatedProjects[rowIndex]];
      for (const proj of targetProjects) {
        if (!proj) continue;
        const payload = {};
        if (colKey === 'name') payload.name = newValue;
        if (colKey === 'description') payload.description = newValue;
        if (Object.keys(payload).length === 0) continue;
        const updated = await projectsAPI.update(proj.id, payload);
        setProjects(prev => prev.map(p => (p.id === proj.id ? updated : p)));
      }
      toast.success(applyToAll ? 'Applied changes.' : 'Updated.');
    } catch (e) {
      console.error('Update failed:', e);
      toast.error('Update failed.');
    }
  };

  const handleColumnSearch = useCallback((searches) => {
    setColumnSearches(prev => {
      const a = JSON.stringify(prev || {});
      const b = JSON.stringify(searches || {});
      return a === b ? prev : (searches || {});
    });
    setCurrentPage(1);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation */}
      <header className="bg-black text-white shadow-sm sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Sparkles className="w-5 h-5 text-white mr-2" />
              <h1 className="text-sm sm:text-base font-normal tracking-tight">Agentic AI Data Wrangler</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                title="Configuration"
                aria-label="Configuration"
                onClick={() => navigate('/config')}
                className="p-2 rounded-full bg-white text-black hover:bg-gray-100"
              >
                <Settings className="w-4 h-4" />
              </button>
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

      {/* Dashboard Title and Actions */}
      <main className="px-3 sm:px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Projects</h2>
          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={openCreateModal}
              className="inline-flex items-center bg-black text-white px-3 py-1 rounded-md shadow-sm text-xs hover:bg-gray-900"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </motion.button>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-700">Sort by</span>
              <select
                value={sortField}
                onChange={(e) => { setSortField(e.target.value); setCurrentPage(1); }}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
              >
                <option value="id">Id</option>
                <option value="name">Name</option>
                <option value="created_at">Created At</option>
                <option value="updated_at">Updated At</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                className="text-xs px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? 'Asc' : 'Desc'}
              </button>
              {Object.values(columnSearches || {}).some(v => v) && (
                <button
                  type="button"
                  onClick={() => { setColumnSearches({ name:'', description:'', files:'', last_updated_at:'', created_at:'', created_by:'', last_updated_by:'' }); setCurrentPage(1); }}
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 border border-gray-300"
                  title="Clear all column searches"
                >
                  Clear searches
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Projects Table using DataTable for exact parity */}
        <DataTable
          title={"Projects"}
          data={paginatedProjects.map(p => ({
            id: p.id,
            name: p.name || '',
            description: p.description || '',
            files: p.files?.length || 0,
            last_updated_at: p.updated_at || '',
            created_at: p.created_at || '',
            created_by: (p.owner?.name || p.owner?.email || ''),
            last_updated_by: (lastUpdatedByMap[p.id] || ''),
          }))}
          theme={"light"}
          totalRows={totalRows}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={goToPage}
          onCellChange={handleCellChange}
          columnSearches={columnSearches}
          onColumnSearch={handleColumnSearch}
          fullHeight={true}
          allColumns={['id','name','description','files','last_updated_at','created_at','created_by','last_updated_by']}
          enableStats={false}
          showTitle={false}
          editable={false}
          compact={true}
          enableSelection={true}
          selectionKey={'id'}
          onSelectionChange={(ids) => setSelectedIds(ids)}
          clearSelectionSignal={clearSelectionSignal}
          onViewSelected={(id) => navigate(`/projects/${id}`)}
          onEditSelected={(id) => { const proj = projects.find(p => p.id === id); if (proj) openEditModal(proj); }}
          onDeleteSelected={(ids) => { if (ids.length === 1) { setProjectToDelete(ids[0]); setIsDeleteProjectModalOpen(true); } else { setProjectToDelete([...ids]); setIsDeleteProjectModalOpen(true); } }}
          onClearSelection={() => { setSelectedIds([]); setClearSelectionSignal(s => s + 1); }}
        />
        
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-6">{editingProject ? 'Edit Project' : 'Create New Project'}</h2>
            <form onSubmit={editingProject ? handleUpdateProject : handleCreateProject}>
              <div className="mb-4">
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  id="projectName"
                  value={editingProject ? editingProject.name : newProjectName}
                  onChange={(e) => editingProject ? setEditingProject({...editingProject, name: e.target.value}) : setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div className="mb-6">
                <label htmlFor="projectDesc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  id="projectDesc"
                  value={editingProject ? editingProject.description : newProjectDescription}
                  onChange={(e) => editingProject ? setEditingProject({...editingProject, description: e.target.value}) : setNewProjectDescription(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{editingProject ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <DeleteConfirmationModal
        isOpen={isDeleteProjectModalOpen}
        onClose={() => setIsDeleteProjectModalOpen(false)}
        onConfirm={confirmDeleteProject}
        message="Are you sure you want to delete this project and all its files? This action cannot be undone."
      />
    </div>
  );
};

export default ProjectDashboard;
