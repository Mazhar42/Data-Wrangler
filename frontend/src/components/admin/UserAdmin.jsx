import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../utils/api';

export default function UserAdmin() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [tab, setTab] = useState('business_roles');
  const [filters, setFilters] = useState({ login: '', email: '', first: '', last: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const [u, r, g] = await Promise.all([
          adminAPI.listUsers(),
          adminAPI.listRoles(),
          adminAPI.listGroups(),
        ]);
        setUsers(Array.isArray(u) ? u : []);
        setRoles(Array.isArray(r) ? r : []);
        setGroups(Array.isArray(g) ? g : []);
      } catch (e) {
        setUsers([]); setRoles([]); setGroups([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadAssignments = async () => {
      if (!selectedUser) { setUserRoles([]); setUserGroups([]); return; }
      try {
        const [ur, ug] = await Promise.all([
          adminAPI.listUserRoles(selectedUser.id),
          adminAPI.listUserGroups(selectedUser.id),
        ]);
        setUserRoles(Array.isArray(ur) ? ur : []);
        setUserGroups(Array.isArray(ug) ? ug : []);
      } catch (e) {
        setUserRoles([]); setUserGroups([]);
      }
    };
    loadAssignments();
  }, [selectedUser]);

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(filters.login.toLowerCase()) &&
      (u.email || '').toLowerCase().includes(filters.email.toLowerCase()) &&
      (u.name || '').toLowerCase().includes(filters.first.toLowerCase()) &&
      (u.name || '').toLowerCase().includes(filters.last.toLowerCase())
    );
  }, [users, filters]);

  const assignRole = async (roleId) => {
    if (!selectedUser) return;
    await adminAPI.assignRoleToUser(selectedUser.id, roleId);
    const ur = await adminAPI.listUserRoles(selectedUser.id);
    setUserRoles(Array.isArray(ur) ? ur : []);
  };
  const removeRole = async (roleId) => {
    if (!selectedUser) return;
    await adminAPI.removeRoleFromUser(selectedUser.id, roleId);
    const ur = await adminAPI.listUserRoles(selectedUser.id);
    setUserRoles(Array.isArray(ur) ? ur : []);
  };
  const assignGroup = async (groupId) => {
    if (!selectedUser) return;
    await adminAPI.assignGroupToUser(selectedUser.id, groupId);
    const ug = await adminAPI.listUserGroups(selectedUser.id);
    setUserGroups(Array.isArray(ug) ? ug : []);
  };
  const removeGroup = async (groupId) => {
    if (!selectedUser) return;
    await adminAPI.removeGroupFromUser(selectedUser.id, groupId);
    const ug = await adminAPI.listUserGroups(selectedUser.id);
    setUserGroups(Array.isArray(ug) ? ug : []);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">User Admin</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Users table */}
        <div className="lg:col-span-2 border rounded-md">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="font-medium">Users</div>
            <div className="text-xs text-gray-500">{filteredUsers.length} rows</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Login Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">First Name</th>
                  <th className="px-3 py-2 text-left">Last Name</th>
                </tr>
                <tr>
                  <th className="px-3 py-2"><input className="border rounded px-2 py-1 w-full" placeholder="Search..." value={filters.login} onChange={e=>setFilters(f=>({...f,login:e.target.value}))} /></th>
                  <th className="px-3 py-2"><input className="border rounded px-2 py-1 w-full" placeholder="Search..." value={filters.email} onChange={e=>setFilters(f=>({...f,email:e.target.value}))} /></th>
                  <th className="px-3 py-2"><input className="border rounded px-2 py-1 w-full" placeholder="Search..." value={filters.first} onChange={e=>setFilters(f=>({...f,first:e.target.value}))} /></th>
                  <th className="px-3 py-2"><input className="border rounded px-2 py-1 w-full" placeholder="Search..." value={filters.last} onChange={e=>setFilters(f=>({...f,last:e.target.value}))} /></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className={`cursor-pointer ${selectedUser?.id===u.id?'bg-blue-50':''}`} onClick={()=>setSelectedUser(u)}>
                    <td className="px-3 py-2">{u.name || u.email}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.name?.split(' ')[0] || ''}</td>
                    <td className="px-3 py-2">{u.name?.split(' ').slice(1).join(' ') || ''}</td>
                  </tr>
                ))}
                {filteredUsers.length===0 && (
                  <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={4}>No users</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel */}
        <div className="border rounded-md">
          <div className="p-3 border-b flex gap-2">
            {[
              {k:'business_roles', t:'Business Roles'},
              {k:'user_roles', t:'User Roles'},
              {k:'user_groups', t:'User Groups'}
            ].map(x => (
              <button key={x.k} onClick={()=>setTab(x.k)} className={`px-3 py-1.5 rounded ${tab===x.k?'bg-[#1F3B6B] text-white':'bg-gray-100 text-gray-700'}`}>{x.t}</button>
            ))}
          </div>
          <div className="p-3">
            {!selectedUser && (
              <p className="text-sm text-gray-500">Select a user from the table on the left.</p>
            )}

            {selectedUser && tab==='user_roles' && (
              <div>
                <div className="flex gap-2 mb-3">
                  <select className="border rounded px-2 py-1" onChange={(e)=>assignRole(Number(e.target.value))} value="">
                    <option value="">Assign role...</option>
                    {roles.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
                  </select>
                </div>
                <ul className="space-y-2">
                  {userRoles.map(r => (
                    <li key={r.id} className="flex items-center justify-between border rounded px-2 py-1">
                      <span>{r.name}</span>
                      <button onClick={()=>removeRole(r.id)} className="text-red-600 text-xs">Remove</button>
                    </li>
                  ))}
                  {userRoles.length===0 && <p className="text-xs text-gray-500">No roles assigned.</p>}
                </ul>
              </div>
            )}

            {selectedUser && tab==='user_groups' && (
              <div>
                <div className="flex gap-2 mb-3">
                  <select className="border rounded px-2 py-1" onChange={(e)=>assignGroup(Number(e.target.value))} value="">
                    <option value="">Assign group...</option>
                    {groups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                  </select>
                </div>
                <ul className="space-y-2">
                  {userGroups.map(g => (
                    <li key={g.id} className="flex items-center justify-between border rounded px-2 py-1">
                      <span>{g.name}</span>
                      <button onClick={()=>removeGroup(g.id)} className="text-red-600 text-xs">Remove</button>
                    </li>
                  ))}
                  {userGroups.length===0 && <p className="text-xs text-gray-500">No groups assigned.</p>}
                </ul>
              </div>
            )}

            {selectedUser && tab==='business_roles' && (
              <p className="text-sm text-gray-500">Display or manage business-specific role mappings here. We can extend this tab to show domain-specific roles or computed permissions.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}