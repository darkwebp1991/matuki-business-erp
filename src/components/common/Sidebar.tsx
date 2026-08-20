import React from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  ShoppingBag,
  Receipt,
  BarChart3,
  DatabaseBackup,
  Settings,
  Table,
  Truck,
  BookOpen,
  Calendar,
  Sparkles,
  Layers,
  PhoneCall,
  CheckSquare
} from 'lucide-react';

import { BusinessSettings, User } from '../../types';

export type NavModule =
  | 'dashboard'
  | 'advance_orders'
  | 'google_sheet_pnl'
  | 'todos'
  | 'attendance'
  | 'customers'
  | 'suppliers'
  | 'products'
  | 'sales'
  | 'purchases'
  | 'expenses'
  | 'rojmel'
  | 'reports'
  | 'backup'
  | 'settings';

interface SidebarProps {
  activeModule: NavModule;
  onSelectModule: (module: NavModule) => void;
  currentUser?: User | null;
  toCollectAmount?: number;
  toPayAmount?: number;
  lowStockCount?: number;
  todoCount?: number;
}

import { hasModuleAccess } from '../../utils/permissionUtils';

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  currentUser,
  toCollectAmount = 0,
  toPayAmount = 0,
  lowStockCount = 0,
  todoCount = 0
}) => {
  const hasAccess = (modId: NavModule) => {
    return hasModuleAccess(currentUser, modId);
  };
  const navItems: Array<{
    id: NavModule;
    label: string;
    icon: React.ReactNode;
    iconColor: string;
    badge?: string | number;
    badgeType?: 'green' | 'red' | 'amber' | 'blue' | 'purple';
    sectionHeader?: string;
  }> = [
    { 
      id: 'dashboard', 
      label: 'Live Dashboard', 
      icon: <LayoutDashboard size={17} />, 
      iconColor: '#38bdf8' 
    },
    { 
      id: 'advance_orders', 
      label: 'Order Planner & WA', 
      icon: <Calendar size={17} />, 
      iconColor: '#4ade80', 
      badge: '📲 ORDERS', 
      badgeType: 'green' 
    },
    { 
      id: 'todos', 
      label: 'Daily To-Do & Tasks', 
      icon: <CheckSquare size={17} />, 
      iconColor: '#a78bfa', 
      badge: todoCount > 0 ? `${todoCount} Due` : undefined, 
      badgeType: 'purple' 
    },
    
    { 
      sectionHeader: 'PARTIES & KHATA', 
      id: 'customers', 
      label: 'Customers Ledger', 
      icon: <Users size={17} />, 
      iconColor: '#60a5fa', 
      badge: toCollectAmount > 0 ? `₹${Math.round(toCollectAmount)}` : undefined, 
      badgeType: 'green' 
    },
    { 
      id: 'suppliers', 
      label: 'Suppliers & Vendors', 
      icon: <Truck size={17} />, 
      iconColor: '#f87171', 
      badge: toPayAmount > 0 ? `₹${Math.round(toPayAmount)}` : undefined, 
      badgeType: 'red' 
    },
    
    { 
      sectionHeader: 'ITEMS & INVENTORY', 
      id: 'products', 
      label: 'Items, Sweets & Stock', 
      icon: <Package size={17} />, 
      iconColor: '#fbbf24', 
      badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined, 
      badgeType: 'red' 
    },

    { 
      sectionHeader: 'TRANSACTIONS & VOUCHERS', 
      id: 'sales', 
      label: 'Sale Invoices', 
      icon: <ShoppingCart size={17} />, 
      iconColor: '#f43f5e' 
    },
    { 
      id: 'purchases', 
      label: 'Purchase Bills', 
      icon: <ShoppingBag size={17} />, 
      iconColor: '#38bdf8' 
    },
    { 
      id: 'expenses', 
      label: 'Expense Vouchers', 
      icon: <Receipt size={17} />, 
      iconColor: '#fb923c' 
    },
    { 
      id: 'rojmel', 
      label: 'Rojmel (Cash & Bank)', 
      icon: <BookOpen size={17} />, 
      iconColor: '#2dd4bf', 
      badge: 'DAYBOOK', 
      badgeType: 'blue' 
    },
    { 
      id: 'reports', 
      label: 'Reports & Analytics', 
      icon: <BarChart3 size={17} />, 
      iconColor: '#c084fc' 
    },

    { 
      sectionHeader: 'SYSTEM & SETTINGS', 
      id: 'backup', 
      label: 'Backup & Restore', 
      icon: <DatabaseBackup size={17} />, 
      iconColor: '#94a3b8' 
    },
    { 
      id: 'settings', 
      label: 'Settings & Config', 
      icon: <Settings size={17} />, 
      iconColor: '#cbd5e1' 
    },

    { 
      sectionHeader: 'ADVANCED & CLOUD HISAB', 
      id: 'google_sheet_pnl', 
      label: 'Google Sheet P&L', 
      icon: <Table size={17} />, 
      iconColor: '#34d399', 
      badge: 'LIVE', 
      badgeType: 'green' 
    },
    { 
      id: 'attendance', 
      label: 'Staff Attendance & Salary', 
      icon: <Users size={17} />, 
      iconColor: '#f59e0b', 
      badge: 'HAJRI', 
      badgeType: 'amber' 
    }
  ];

  const visibleNavItems = navItems.filter(item => hasAccess(item.id));

  return (
    <aside className="desktop-sidebar no-print" style={{
      width: '230px',
      background: 'linear-gradient(180deg, #0f172a 0%, #090e17 100%)',
      color: '#cbd5e1',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 52px)',
      overflowY: 'auto',
      padding: '10px 8px',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      flexShrink: 0,
      userSelect: 'none'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {visibleNavItems.map((item, index) => {
          const isActive = activeModule === item.id;
          return (
            <React.Fragment key={item.id}>
              {item.sectionHeader && (
                <div style={{
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  color: '#64748b',
                  letterSpacing: '0.08em',
                  padding: '12px 10px 4px 10px',
                  marginTop: index === 0 ? 0 : '4px',
                  textTransform: 'uppercase'
                }}>
                  {item.sectionHeader}
                </div>
              )}

              <button
                onClick={() => onSelectModule(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive 
                    ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' 
                    : 'transparent',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.81rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.35)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <span style={{ 
                    color: isActive ? '#ffffff' : item.iconColor, 
                    display: 'flex', 
                    alignItems: 'center',
                    transition: 'transform 0.15s ease'
                  }}>
                    {item.icon}
                  </span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                </div>

                {item.badge && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: item.badgeType === 'green' 
                      ? '#10b981' 
                      : item.badgeType === 'red' 
                      ? '#ef4444' 
                      : item.badgeType === 'purple'
                      ? '#8b5cf6'
                      : '#3b82f6',
                    color: '#ffffff',
                    flexShrink: 0,
                    letterSpacing: '0.02em',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </aside>
  );
};
