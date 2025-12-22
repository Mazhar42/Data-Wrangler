import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../utils/api';

export default function GroupAdmin() {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [filters, setFilters] = useState({ name: '', label: '', extra1: '', extra2: '', extra3: '', extra4: '' });
  const [allUsers, setAllUsers] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [g, u] = await Promise.all([
          adminAPI.listGroups(),
          adminAPI.listUsers(),
        ]);
        setGroups(Array.isArray(g) ? g : []);
        setAllUsers(Array.isArray(u) ? u : []);
      } catch (e) {
        setGroups([]); setAllUsers([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      if (!selectedGroup) { setUsers([]); return; }
      try {
        const data = await adminAPI.listGroupUsers(selectedGroup.id);
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        setUsers([]);
      }
    };
    loadUsers();
  }, [selectedGroup]);

  const filteredGroups = useMemo(() => {
    // Since backend provides only name/description, we map description to "label" and extras to empty strings
    return groups.filter(g =>
      (g.name || '').toLowerCase().includes(filters.name.toLowerCase()) &&
      (g.description || '').toLowerCase().includes(filters.label.toLowerCase())
    );
  }, [groups, filters]);

  const exportCSV = () => {
    const headers = ['Name','Label','Extra Info 1 (Number)','Extra Info 2 (Number)','Extra Info 3 (Text)','Extra Info 4 (Text)'];
    const rows = groups.map(g => [g.name, g.description || '', '', '', '', '']);
    const csv = [headers.join(','), ...rows.map(r => r.map(x => `"${String(x).replace(/"/g,'\"')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_groups.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const created = await adminAPI.createGroup({ name: newGroupName });
      setGroups(prev => [created, ...prev]);
      setNewGroupName('');
    } catch {}
  };

  const assignUserToSelectedGroup = async (userId) => {
    if (!selectedGroup) return;
    try {
      await adminAPI.assignGroupToUser(userId, selectedGroup.id);
      const data = await adminAPI.listGroupUsers(selectedGroup.id);
      setUsers(Array.isArray(data) ? data : []);
    } catch {}
  };

  const removeUserFromSelectedGroup = async (userId) => {
    if (!selectedGroup) return;
    try {
      await adminAPI.removeGroupFromUser(userId, selectedGroup.id);
      const data = await adminAPI.listGroupUsers(selectedGroup.id);
      setUsers(Array.isArray(data) ? data : []);
    } catch {}
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">User Group Admin</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Groups table */}
        <div className="lg:col-span-2 border rounded-md">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <span className="font-medium">Groups</span>
              <input className="border rounded px-2 py-1" placeholder="New group name" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} />
              <button className="bg-[#1F3B6B] text-white px-3 py-1 rounded" onClick={addGroup}>Add Group</button>
            </div>
            <div className="flex items-center gap-2">
              <button className="border px-3 py-1 rounded" onClick={exportCSV}>Export</button>
              <span className="text-xs text-gray-500">{filteredGroups.length} rows</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Label</th>
                  <th className="px-3 py-2 text-left">Extra Info 1 (Number)</th>
                  <th className="px-3 py-2 text-left">Extra Info 2 (Number)</th>
                  <th className="px-3 py-2 text-left">Extra Info 3 (Text)</th>
                  <th className="px-3 py-2 text-left">Extra Info 4 (Text)</th>
                </tr>
                <tr>
                  <th className="px-3 py-2"><input className="border rounded px-2 py-1 w-full" placeholder="Search..." value={filters.name} onChange={e=>setFilters(f=>({...f,name:e.target.value}))} /></th>
                  <th className="px-3 py-2"><input className="border rounded px-2 py-1 w-full" placeholder="Search..." value={filters.label} onChange={e=>setFilters(f=>({...f,label:e.target.value}))} /></th>
                  <th className="px-3 py-2"><input className="border rounded px-2 py-1 w-full" placeholder="Search..." value={filters.extra1} onChange={e=>setFilters(f=>({...f,extra1:e.target.value}))} /></th>
                  <th className="px-3 py-2"><input className="border rounded px-2 py-1 w-full" placeholder="Search..." value={filters.extra2} onChange={e=>setFilters(f=>({...f,extra2:e.target.value}))} /></th>
                  <th className="px-3 py-2"><input className="border rounded px-2 py-1 w-full" placeholder="Search..." value={filters.extra3} onChange={e=>setFilters(f=>({...f,extra3:e.target.value}))} /></th>
                  <th className="px-3 py-2"><input className="border rounded px-2 py-1 w-full" placeholder="Search..." value={filters.extra4} onChange={e=>setFilters(f=>({...f,extra4:e.target.value}))} /></th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map(g => (
                  <tr key={g.id} className={`cursor-pointer ${selectedGroup?.id===g.id?'bg-blue-50':''}`} onClick={()=>setSelectedGroup(g)}>
                    <td className="px-3 py-2">{g.name}</td>
                    <td className="px-3 py-2">{g.description || ''}</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                ))}
                {filteredGroups.length===0 && (
                  <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={6}>No groups</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel: Users in selected group */}
        <div className="border rounded-md">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="font-medium">Users</div>
            <div className="flex items-center gap-2">
              {selectedGroup && (
                <select className="border rounded px-2 py-1" onChange={(e)=>{const val=e.target.value; if(val){assignUserToSelectedGroup(Number(val)); e.target.value='';}}} defaultValue="">
                  <option value="">Add user...</option>
                  {allUsers.map(u => (<option key={u.id} value={u.id}>{u.name || u.email}</option>))}
                </select>
              )}
            </div>
          </div>
          <div className="p-3">
            {!selectedGroup && (
              <p className="text-sm text-gray-500">No data to display. Please select a group from the table on the left.</p>
            )}
            {selectedGroup && (
              <ul className="space-y-2">
                {users.map(u => (
                  <li key={u.id} className="flex items-center justify-between border rounded px-2 py-1">
                    <span>{u.name || u.email}</span>
                    <button className="text-red-600 text-xs" onClick={()=>removeUserFromSelectedGroup(u.id)}>Remove</button>
                  </li>
                ))}
                {users.length===0 && (
                  <p className="text-xs text-gray-500">No users in this group.</p>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}