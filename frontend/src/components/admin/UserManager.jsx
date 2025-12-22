import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { adminAPI } from '../../utils/api';

export default function UserManager() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [newRole, setNewRole] = useState('');
  const [newGroup, setNewGroup] = useState('');

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
      } catch (err) {
        // Gracefully handle 401/403 or other errors
        setUsers([]);
        setRoles([]);
        setGroups([]);
      }
    };
    load();
  }, []);

  const createRole = async () => {
    if (!newRole.trim()) return;
    try {
      const data = await adminAPI.createRole({ name: newRole });
      setRoles(prev => [...prev, data]);
    } catch {}
    setNewRole('');
  };

  const createGroup = async () => {
    if (!newGroup.trim()) return;
    try {
      const data = await adminAPI.createGroup({ name: newGroup });
      setGroups(prev => [...prev, data]);
    } catch {}
    setNewGroup('');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">User Manager</h1>
      <div className="flex gap-2 mb-6">
        {['users','groups','roles'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md ${tab===t ? 'bg-[#1F3B6B] text-white' : 'bg-gray-100 text-gray-700'}`}>{t[0].toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {tab === 'users' && (
        <div>
          <h2 className="text-lg font-medium mb-2">Users</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {users.map(u => (
              <motion.div key={u.id} className="border rounded-md p-3" initial={{opacity:0, y:10}} animate={{opacity:1,y:0}}>
                <div className="font-medium">{u.name || u.email}</div>
                <div className="text-sm text-gray-600">{u.email}</div>
                <div className="text-xs text-gray-500">Provider: {u.provider}</div>
              </motion.div>
            ))}
            {users.length===0 && <p className="text-sm text-gray-500">No users yet.</p>}
          </div>
        </div>
      )}

      {tab === 'groups' && (
        <div>
          <h2 className="text-lg font-medium mb-2">Groups</h2>
          <div className="flex gap-2 mb-3">
            <input className="border rounded-md px-2 py-1" placeholder="New group name" value={newGroup} onChange={e=>setNewGroup(e.target.value)} />
            <button onClick={createGroup} className="bg-[#1F3B6B] text-white px-3 py-1.5 rounded-md">Create</button>
          </div>
          <ul className="space-y-2">
            {groups.map(g => (<li key={g.id} className="border rounded-md p-2">{g.name}</li>))}
            {groups.length===0 && <p className="text-sm text-gray-500">No groups yet.</p>}
          </ul>
        </div>
      )}

      {tab === 'roles' && (
        <div>
          <h2 className="text-lg font-medium mb-2">Roles</h2>
          <div className="flex gap-2 mb-3">
            <input className="border rounded-md px-2 py-1" placeholder="New role name" value={newRole} onChange={e=>setNewRole(e.target.value)} />
            <button onClick={createRole} className="bg-[#1F3B6B] text-white px-3 py-1.5 rounded-md">Create</button>
          </div>
          <ul className="space-y-2">
            {roles.map(r => (<li key={r.id} className="border rounded-md p-2">{r.name}</li>))}
            {roles.length===0 && <p className="text-sm text-gray-500">No roles yet.</p>}
          </ul>
        </div>
      )}
    </div>
  );
}