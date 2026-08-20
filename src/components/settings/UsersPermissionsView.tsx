import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Shield } from 'lucide-react';
import { api } from '../../api/client';
import { User } from '../../types';
import { formatDate } from '../../utils/formatters';

export const UsersPermissionsView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'CASHIER' | 'PRODUCTION'>('CASHIER');

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !fullName) return;
    try {
      await api.createUser({
        username,
        password,
        full_name: fullName,
        role
      });
      setIsAddOpen(false);
      setUsername('');
      setPassword('');
      setFullName('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '880px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Users & Role-Based Permissions
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            Manage cashier logins, production access & administrative privileges
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <strong style={{ color: '#fbbf24' }}>{u.username}</strong>
                </td>
                <td style={{ color: '#fff' }}>{u.full_name}</td>
                <td>
                  <span className="badge badge-amber">{u.role}</span>
                </td>
                <td>
                  <span className="badge badge-green">ACTIVE</span>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {formatDate((u as any).created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <div className="modal-overlay" onClick={() => setIsAddOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Add New User Account</h2>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Ramesh Cashier"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Login Username *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. cashier2"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    placeholder="Enter secure password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned Role</label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                  >
                    <option value="CASHIER">CASHIER (Sales POS & Customers)</option>
                    <option value="PRODUCTION">PRODUCTION (Manufacturing & Recipes)</option>
                    <option value="MANAGER">MANAGER (Sales, Purchases, Inventory, Reports)</option>
                    <option value="ADMIN">ADMIN (Full Unrestricted Access)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
