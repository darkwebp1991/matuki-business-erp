import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Menu,
  Sparkles
} from 'lucide-react';
import { NavModule } from './Sidebar';
import { User } from '../../types';
import { hasModuleAccess } from '../../utils/permissionUtils';

interface MobileBottomNavProps {
  activeModule: NavModule;
  onSelectModule: (mod: NavModule) => void;
  onOpenNewSale: () => void;
  onToggleMoreDrawer: () => void;
  currentUser?: User | null;
  toCollectCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeModule,
  onSelectModule,
  onOpenNewSale,
  onToggleMoreDrawer,
  currentUser,
  toCollectCount = 0
}) => {
  const canAccessDashboard = hasModuleAccess(currentUser, 'dashboard');
  const canAccessSales = hasModuleAccess(currentUser, 'sales');
  const canAccessProducts = hasModuleAccess(currentUser, 'products');
  const canAccessCustomers = hasModuleAccess(currentUser, 'customers');

  return (
    <nav className="mobile-bottom-nav no-print" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '58px',
      background: 'var(--bg-card)',
      borderTop: '1.5px solid var(--border-color)',
      display: 'none', // Controlled via CSS media query @media (max-width: 768px) { display: flex; }
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 9995,
      boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.1)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)'
    }}>
      {/* 1. Dashboard */}
      {canAccessDashboard && (
        <button
          type="button"
          className={`mobile-nav-item ${activeModule === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSelectModule('dashboard')}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            color: activeModule === 'dashboard' ? '#d32f2f' : 'var(--text-secondary)',
            cursor: 'pointer',
            flex: 1,
            height: '100%'
          }}
        >
          <LayoutDashboard size={19} />
          <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>Home</span>
        </button>
      )}

      {/* 2. Products / Sweets / Recipes */}
      {canAccessProducts && (
        <button
          type="button"
          className={`mobile-nav-item ${activeModule === 'products' ? 'active' : ''}`}
          onClick={() => onSelectModule('products')}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            color: activeModule === 'products' ? '#d32f2f' : 'var(--text-secondary)',
            cursor: 'pointer',
            flex: 1,
            height: '100%'
          }}
        >
          <Package size={19} />
          <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>Sweets</span>
        </button>
      )}

      {/* 3. Center Quick Sale Billing Button */}
      {canAccessSales && (
        <button
          type="button"
          onClick={onOpenNewSale}
          style={{
            background: 'linear-gradient(135deg, #d32f2f 0%, #b91c1c 100%)',
            color: '#ffffff',
            border: '3px solid var(--bg-card)',
            borderRadius: '50%',
            width: '46px',
            height: '46px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(211, 47, 47, 0.45)',
            transform: 'translateY(-12px)',
            cursor: 'pointer',
            flexShrink: 0
          }}
          title="નવું બિલ બનાવો (Quick Sale Bill)"
        >
          <ShoppingCart size={21} color="#ffffff" />
        </button>
      )}

      {/* 4. Parties / Customers Khata */}
      {canAccessCustomers && (
        <button
          type="button"
          className={`mobile-nav-item ${activeModule === 'customers' ? 'active' : ''}`}
          onClick={() => onSelectModule('customers')}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            color: activeModule === 'customers' ? '#d32f2f' : 'var(--text-secondary)',
            cursor: 'pointer',
            flex: 1,
            height: '100%',
            position: 'relative'
          }}
        >
          <Users size={19} />
          <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>Parties</span>
          {toCollectCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '18px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#dc2626'
            }} />
          )}
        </button>
      )}

      {/* 5. More Menu Drawer Toggle */}
      <button
        type="button"
        className="mobile-nav-item"
        onClick={onToggleMoreDrawer}
        style={{
          background: 'transparent',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          flex: 1,
          height: '100%'
        }}
      >
        <Menu size={19} />
        <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>More</span>
      </button>
    </nav>
  );
};
