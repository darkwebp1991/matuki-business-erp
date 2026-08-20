import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Key, ShieldCheck, UserCheck, UserX, X, Lock, Shield, Check, AlertCircle, Eye, Edit3, Award, Ban } from 'lucide-react';
import { api } from '../../api/client';
import { User, ModuleAccessLevel } from '../../types';
import { formatDate } from '../../utils/formatters';

interface UserManagementTabProps {
  currentUser?: User | null;
}

export const MODULE_PERMISSIONS_LIST = [
  { key: 'dashboard', label: 'Dashboard & KPIs', desc: 'View live sales, receivables & financial counters', icon: '📊', group: 'Main' },
  { key: 'sales', label: 'Sales & Counter Billing', desc: 'Create sales bills, WhatsApp invoices & print', icon: '🛒', group: 'Billing' },
  { key: 'advance_orders', label: 'Advance Orders & Bookings', desc: 'Catering orders, delivery booking & dispatch', icon: '📋', group: 'Billing' },
  { key: 'customers', label: 'Customers & Parties', desc: 'Customer khata, ledgers & payment collection', icon: '👥', group: 'Parties' },
  { key: 'suppliers', label: 'Suppliers & Vendors', desc: 'Vendor directory, khareedi hisab & bank details', icon: '🏢', group: 'Parties' },
  { key: 'products', label: 'Items & Sweets Master', desc: 'View stock, recipe batch calculator, pricing & products', icon: '🍬', group: 'Inventory' },
  { key: 'purchases', label: 'Purchases & Kharidi Bills', desc: 'Record incoming stock & supplier bills', icon: '📦', group: 'Inventory' },
  { key: 'expenses', label: 'Expenses & Kharch', desc: 'Record daily factory, shop & operating expenses', icon: '💸', group: 'Accounts' },
  { key: 'rojmel', label: 'Daily Daybook (Rojmel)', desc: 'Cash drawer closing, bank ledger & daybook', icon: '📖', group: 'Accounts' },
  { key: 'reports', label: 'Reports & Analytics', desc: 'GST reports, sales graphs & item analytics', icon: '📊', group: 'Reports' },
  { key: 'google_sheet_pnl', label: 'Google Sheet P&L & Stock', desc: '3-Branch P&L statement & stock audit verification', icon: '📈', group: 'Reports' },
  { key: 'attendance', label: 'Staff Attendance & Salary', desc: 'Clock-in/out hajri, advances & monthly salaries', icon: '🕒', group: 'Staff' },
  { key: 'todos', label: 'Daily Task Planner', desc: 'Daily work checklist & task reminders', icon: '✅', group: 'Staff' },
  { key: 'settings', label: 'Settings & Master PIN', desc: 'Firm profile, UPI QR, prefixes & user permissions', icon: '⚙️', group: 'Admin' },
  { key: 'backup', label: 'Backup & Clean Reset', desc: 'Offline SQLite backup, restore & reset tools', icon: '💾', group: 'Admin' }
];

export const ROLE_PRESETS: Record<string, Record<string, ModuleAccessLevel>> = {
  ADMIN: {
    dashboard: 'FULL', sales: 'FULL', advance_orders: 'FULL', customers: 'FULL', suppliers: 'FULL',
    products: 'FULL', purchases: 'FULL', expenses: 'FULL', rojmel: 'FULL', reports: 'FULL',
    google_sheet_pnl: 'FULL', attendance: 'FULL', todos: 'FULL', settings: 'FULL', backup: 'FULL'
  },
  MANAGER: {
    dashboard: 'FULL', sales: 'FULL', advance_orders: 'FULL', customers: 'FULL', suppliers: 'FULL',
    products: 'FULL', purchases: 'FULL', expenses: 'FULL', rojmel: 'FULL', reports: 'FULL',
    google_sheet_pnl: 'FULL', attendance: 'FULL', todos: 'FULL', settings: 'NONE', backup: 'NONE'
  },
  CASHIER: {
    dashboard: 'VIEW', sales: 'FULL', advance_orders: 'FULL', customers: 'EDIT', suppliers: 'NONE',
    products: 'VIEW', purchases: 'NONE', expenses: 'VIEW', rojmel: 'VIEW', reports: 'NONE',
    google_sheet_pnl: 'NONE', attendance: 'VIEW', todos: 'EDIT', settings: 'NONE', backup: 'NONE'
  },
  STOREKEEPER: {
    dashboard: 'VIEW', sales: 'NONE', advance_orders: 'VIEW', customers: 'NONE', suppliers: 'VIEW',
    products: 'VIEW', purchases: 'VIEW', expenses: 'NONE', rojmel: 'NONE', reports: 'NONE',
    google_sheet_pnl: 'VIEW', attendance: 'VIEW', todos: 'EDIT', settings: 'NONE', backup: 'NONE'
  },
  PRODUCTION: {
    dashboard: 'VIEW', sales: 'NONE', advance_orders: 'VIEW', customers: 'NONE', suppliers: 'NONE',
    products: 'VIEW', purchases: 'NONE', expenses: 'NONE', rojmel: 'NONE', reports: 'NONE',
    google_sheet_pnl: 'VIEW', attendance: 'VIEW', todos: 'EDIT', settings: 'NONE', backup: 'NONE'
  },
  ACCOUNTANT: {
    dashboard: 'FULL', sales: 'VIEW', advance_orders: 'VIEW', customers: 'FULL', suppliers: 'FULL',
    products: 'VIEW', purchases: 'FULL', expenses: 'FULL', rojmel: 'FULL', reports: 'FULL',
    google_sheet_pnl: 'FULL', attendance: 'FULL', todos: 'EDIT', settings: 'NONE', backup: 'VIEW'
  },
  DELIVERY_STAFF: {
    dashboard: 'VIEW', sales: 'NONE', advance_orders: 'VIEW', customers: 'VIEW', suppliers: 'NONE',
    products: 'NONE', purchases: 'NONE', expenses: 'NONE', rojmel: 'NONE', reports: 'NONE',
    google_sheet_pnl: 'NONE', attendance: 'VIEW', todos: 'EDIT', settings: 'NONE', backup: 'NONE'
  }
};

export const UserManagementTab: React.FC<UserManagementTabProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('CASHIER');
  const [mobile, setMobile] = useState('');
  const [active, setActive] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, ModuleAccessLevel>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers();
      const list = Array.isArray(res) ? res : (res as any).data || [];
      setUsers(list);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setPassword('');
    setRole('CASHIER');
    setMobile('');
    setActive(true);
    setPermissions(ROLE_PRESETS.CASHIER || {});
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setFullName(u.full_name || '');
    setPassword('');
    setRole(u.role);
    setMobile(u.mobile || '');
    setActive(Boolean(u.active));

    // Normalize existing permissions
    const existingPerms: Record<string, ModuleAccessLevel> = {};
    const raw = u.permissions || {};
    for (const m of MODULE_PERMISSIONS_LIST) {
      const val = raw[m.key];
      if (val === 'FULL' || val === true) existingPerms[m.key] = 'FULL';
      else if (val === 'EDIT') existingPerms[m.key] = 'EDIT';
      else if (val === 'VIEW') existingPerms[m.key] = 'VIEW';
      else existingPerms[m.key] = 'NONE';
    }
    setPermissions(existingPerms);
    setError(null);
    setIsModalOpen(true);
  };

  const applyRolePreset = (presetName: string) => {
    setRole(presetName);
    if (ROLE_PRESETS[presetName]) {
      setPermissions({ ...ROLE_PRESETS[presetName] });
    }
  };

  const setModulePermissionLevel = (moduleKey: string, level: ModuleAccessLevel) => {
    setPermissions(prev => ({
      ...prev,
      [moduleKey]: level
    }));
  };

  const handleSetAllLevel = (level: ModuleAccessLevel) => {
    const updated: Record<string, ModuleAccessLevel> = {};
    MODULE_PERMISSIONS_LIST.forEach(m => {
      updated[m.key] = level;
    });
    setPermissions(updated);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!editingUser && !password.trim()) {
      setError('Password is required for new user');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: any = {
        username: username.toLowerCase().trim(),
        full_name: fullName.trim() || username.trim(),
        role,
        mobile: mobile.trim(),
        active: active ? 1 : 0,
        permissions
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      if (editingUser) {
        await api.updateUser(editingUser.id, payload);
      } else {
        await api.createUser(payload);
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: number, uName: string) => {
    if (id === 1 || uName.toLowerCase() === 'admin') {
      alert('Master admin account cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user @${uName}? This cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteUser(id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header & Add Action */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-card)',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} color="#0284c7" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)' }}>
              Team Members & 3-Tier Permissions (સ્ટાફ યુઝર્સ & પરમિશન)
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Control exact functional access (❌ NONE, 👁️ VIEW Only, ✏️ EDIT, 👑 FULL) for Cashiers, Storekeepers, Karigars & Managers.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-vyapar-red"
          onClick={handleOpenAdd}
          style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
        >
          <Plus size={16} /> + Add Team Member
        </button>
      </div>

      {/* Users Table */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card-alt)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 800 }}>USER</th>
              <th style={{ padding: '12px 16px', fontWeight: 800 }}>ROLE & MOBILE</th>
              <th style={{ padding: '12px 16px', fontWeight: 800 }}>MODULE ACCESS BREAKDOWN</th>
              <th style={{ padding: '12px 16px', fontWeight: 800, textAlign: 'center' }}>STATUS</th>
              <th style={{ padding: '12px 16px', fontWeight: 800, textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading staff users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No additional staff users configured yet.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isMasterAdmin = u.id === 1 || u.username === 'admin';
                const perms = u.permissions || {};
                const fullCount = Object.values(perms).filter(v => v === 'FULL' || v === true).length;
                const editCount = Object.values(perms).filter(v => v === 'EDIT').length;
                const viewCount = Object.values(perms).filter(v => v === 'VIEW').length;

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: isMasterAdmin ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '0.9rem'
                        }}>
                          {u.full_name?.charAt(0).toUpperCase() || u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                            {u.full_name || u.username} {isMasterAdmin && <span title="Master Superadmin">👑</span>}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${
                        u.role === 'ADMIN' ? 'badge-orange' :
                        u.role === 'MANAGER' ? 'badge-blue' :
                        u.role === 'STOREKEEPER' ? 'badge-yellow' :
                        u.role === 'PRODUCTION' ? 'badge-purple' : 'badge-green'
                      }`} style={{ fontWeight: 800 }}>
                        {u.role}
                      </span>
                      {u.mobile && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>📞 {u.mobile}</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isMasterAdmin ? (
                        <span className="badge badge-green">👑 Full Unrestricted Access (All 15 Modules)</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {fullCount > 0 && (
                            <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                              👑 {fullCount} Full
                            </span>
                          )}
                          {editCount > 0 && (
                            <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                              ✏️ {editCount} Edit
                            </span>
                          )}
                          {viewCount > 0 && (
                            <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                              👁️ {viewCount} View Only
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {u.active ? (
                        <span className="badge badge-green">Active</span>
                      ) : (
                        <span className="badge badge-red">Disabled</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(u)}
                          title="Edit User & Permissions"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        {!isMasterAdmin && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Add / Edit User */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            maxWidth: '740px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
            border: '1px solid var(--border-color)'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              padding: '16px 20px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  {editingUser ? `Edit User & Permissions: @${editingUser.username}` : 'Add New Team Member / Persona'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveUser} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              {/* User Identity Fields Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 800 }}>
                    Username <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. store1, karigar, cashier"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={Boolean(editingUser)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 800 }}>
                    Full Name (સ્ટાફનું નામ)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Mukesh Bhai (Store)"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 800 }}>
                    Password {editingUser ? '(Leave blank to keep current)' : <span style={{ color: '#dc2626' }}>*</span>}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder={editingUser ? '••••••••' : 'Enter login password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingUser}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 800 }}>
                    Mobile No
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </div>
              </div>

              {/* Role Preset Quick Selector */}
              <div style={{ background: 'var(--bg-card-alt)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 800, margin: 0 }}>
                    ⚡ 1-Click Role Presets (ઝડપી રોલ સેટ કરો):
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.keys(ROLE_PRESETS).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => applyRolePreset(r)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: '1px solid',
                        background: role === r ? '#2563eb' : 'var(--bg-card)',
                        color: role === r ? '#ffffff' : 'var(--text-main)',
                        borderColor: role === r ? '#2563eb' : 'var(--border-color)'
                      }}
                    >
                      {r === 'ADMIN' && '👑 '}
                      {r === 'CASHIER' && '🛒 '}
                      {r === 'STOREKEEPER' && '📦 '}
                      {r === 'PRODUCTION' && '👨‍🍳 '}
                      {r === 'MANAGER' && '👔 '}
                      {r === 'ACCOUNTANT' && '📊 '}
                      {r === 'DELIVERY_STAFF' && '🚚 '}
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3-TIER PERMISSION MATRIX TABLE */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-main)' }}>
                      🔐 3-Tier Module Permissions (NONE ❌ / VIEW 👁️ / EDIT ✏️ / FULL 👑)
                    </h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Set individual access for Storekeeper, Karigar, Cashier, or Admin
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleSetAllLevel('FULL')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.66rem', padding: '2px 6px' }}
                    >
                      All Full
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllLevel('VIEW')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.66rem', padding: '2px 6px' }}
                    >
                      All View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllLevel('NONE')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.66rem', padding: '2px 6px' }}
                    >
                      All None
                    </button>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '2px'
                }}>
                  {MODULE_PERMISSIONS_LIST.map((m) => {
                    const currentLevel = permissions[m.key] || 'NONE';

                    return (
                      <div
                        key={m.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: currentLevel === 'FULL' ? 'rgba(34, 197, 94, 0.05)' : currentLevel === 'EDIT' ? 'rgba(59, 130, 246, 0.05)' : currentLevel === 'VIEW' ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-card-alt)',
                          border: `1px solid ${currentLevel === 'FULL' ? '#86efac' : currentLevel === 'EDIT' ? '#93c5fd' : currentLevel === 'VIEW' ? '#fde68a' : 'var(--border-color)'}`,
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '1.1rem' }}>{m.icon}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                              {m.label}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {m.desc}
                            </div>
                          </div>
                        </div>

                        {/* 4-Option Segmented Selector */}
                        <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '2px', gap: '2px' }}>
                          <button
                            type="button"
                            onClick={() => setModulePermissionLevel(m.key, 'NONE')}
                            style={{
                              border: 'none',
                              background: currentLevel === 'NONE' ? '#ef4444' : 'transparent',
                              color: currentLevel === 'NONE' ? '#fff' : 'var(--text-secondary)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            ❌ None
                          </button>
                          <button
                            type="button"
                            onClick={() => setModulePermissionLevel(m.key, 'VIEW')}
                            style={{
                              border: 'none',
                              background: currentLevel === 'VIEW' ? '#f59e0b' : 'transparent',
                              color: currentLevel === 'VIEW' ? '#fff' : 'var(--text-secondary)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            title="Can only view items, live stock & recipe batch calculator"
                          >
                            👁️ View Only
                          </button>
                          <button
                            type="button"
                            onClick={() => setModulePermissionLevel(m.key, 'EDIT')}
                            style={{
                              border: 'none',
                              background: currentLevel === 'EDIT' ? '#3b82f6' : 'transparent',
                              color: currentLevel === 'EDIT' ? '#fff' : 'var(--text-secondary)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            title="Can view, create and modify records (no delete)"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setModulePermissionLevel(m.key, 'FULL')}
                            style={{
                              border: 'none',
                              background: currentLevel === 'FULL' ? '#22c55e' : 'transparent',
                              color: currentLevel === 'FULL' ? '#fff' : 'var(--text-secondary)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            title="Full administrative access"
                          >
                            👑 Full
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="user-active"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                />
                <label htmlFor="user-active" style={{ fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                  User Account Active (Enable login for this staff member)
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-vyapar-red"
                  disabled={saving}
                  style={{ fontWeight: 800 }}
                >
                  {saving ? 'Saving...' : editingUser ? 'Update User & Permissions' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
