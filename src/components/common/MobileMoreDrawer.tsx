import React from 'react';
import { 
  X, 
  Calendar, 
  Truck, 
  ShoppingBag, 
  Receipt, 
  BookOpen, 
  BarChart3, 
  FileSpreadsheet, 
  Clock, 
  CheckSquare, 
  Settings, 
  Database, 
  Smartphone,
  LogOut,
  Moon,
  Sun,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { NavModule } from './Sidebar';
import { User, BusinessSettings } from '../../types';
import { hasModuleAccess } from '../../utils/permissionUtils';

interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule: NavModule;
  onSelectModule: (mod: NavModule) => void;
  currentUser?: User | null;
  settings?: BusinessSettings | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  onLogout: () => void;
}

export const MobileMoreDrawer: React.FC<MobileMoreDrawerProps> = ({
  isOpen,
  onClose,
  activeModule,
  onSelectModule,
  currentUser,
  settings,
  theme,
  onToggleTheme,
  isPrivacyMode,
  onTogglePrivacy,
  onLogout
}) => {
  if (!isOpen) return null;

  const handleNav = (mod: NavModule) => {
    onSelectModule(mod);
    onClose();
  };

  const allDrawerItems: Array<{ id: NavModule; label: string; guLabel: string; icon: any; color: string; badge?: string }> = [
    { id: 'advance_orders', label: 'Advance Orders', guLabel: 'એડવાન્સ કેટરર્સ ઓર્ડર', icon: Calendar, color: '#f59e0b' },
    { id: 'sales', label: 'Sales Invoices', guLabel: 'સેલ્સ બિલિંગ રજિસ્ટર', icon: ShoppingBag, color: '#16a34a' },
    { id: 'purchases', label: 'Purchases (Kharidi)', guLabel: 'માલ ખરીદી & બિલ', icon: Truck, color: '#2563eb' },
    { id: 'suppliers', label: 'Suppliers / Vendors', guLabel: 'વેપારીઓ & સપ્લાયર', icon: Truck, color: '#7c3aed' },
    { id: 'expenses', label: 'Expenses (Kharch)', guLabel: 'રોજના ખર્ચા', icon: Receipt, color: '#dc2626' },
    { id: 'rojmel', label: 'Rojmel (Daybook)', guLabel: 'આજનો રોજમેળ & ગલ્લો', icon: BookOpen, color: '#d97706' },
    { id: 'attendance', label: 'Staff Hajri & Salary', guLabel: 'કારીગર હાજરી & પગાર', icon: Clock, color: '#0891b2' },
    { id: 'google_sheet_pnl', label: '3-Branch Stock Audit', guLabel: '૩ શાખા સ્ટોક & P&L', icon: FileSpreadsheet, color: '#10b981' },
    { id: 'reports', label: 'Reports & Analytics', guLabel: 'બિઝનેસ રિપોર્ટ્સ', icon: BarChart3, color: '#6366f1' },
    { id: 'todos', label: 'Daily Task Checklist', guLabel: 'રોજિંદા કામ લિસ્ટ', icon: CheckSquare, color: '#059669' },
    { id: 'settings', label: 'Settings & Profile', guLabel: 'સિસ્ટમ સેટિંગ્સ & PIN', icon: Settings, color: '#64748b' },
    { id: 'backup', label: 'Backup & Restore', guLabel: 'ડેટાબેઝ બેકઅપ', icon: Database, color: '#475569' }
  ];

  const allowedItems = allDrawerItems.filter(item => hasModuleAccess(currentUser, item.id));

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 100000,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease-out'
    }} onClick={onClose}>
      
      <div
        style={{
          background: 'var(--bg-card)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          padding: '20px 18px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.25)',
          overflowY: 'auto',
          border: '1.5px solid var(--border-color)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)' }}>
              {settings?.business_name || 'MATUKI BUSINESS ERP'}
            </h3>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              All Modules & Mobile Actions ({currentUser?.full_name || currentUser?.username || 'Staff'})
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-card-alt)',
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Grid of All Available Modules */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          marginBottom: '20px'
        }}>
          {allowedItems.map(item => {
            const Icon = item.icon;
            const isSelected = activeModule === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                style={{
                  background: isSelected ? 'rgba(211, 47, 47, 0.08)' : 'var(--bg-card-alt)',
                  border: `1.5px solid ${isSelected ? '#d32f2f' : 'var(--border-color)'}`,
                  borderRadius: '12px',
                  padding: '12px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `${item.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: item.color
                }}>
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: isSelected ? '#d32f2f' : 'var(--text-main)', lineHeight: '1.2' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.1' }}>
                    {item.guLabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Mobile Quick Toggles & User Info */}
        <div style={{
          background: 'var(--bg-card-alt)',
          borderRadius: '12px',
          padding: '12px 14px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onToggleTheme}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem' }}
            >
              {theme === 'dark' ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>

            <button
              type="button"
              onClick={onTogglePrivacy}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem' }}
            >
              {isPrivacyMode ? <EyeOff size={14} color="#f59e0b" /> : <Eye size={14} />}
              {isPrivacyMode ? 'Privacy ON' : 'Privacy OFF'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="btn btn-danger btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 800 }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
};
