import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Receipt, 
  Table, 
  ChevronDown, 
  Command, 
  X, 
  Sun, 
  Moon,
  LogOut,
  Smartphone,
  Sparkles,
  ShoppingBag,
  ShoppingCart,
  Wallet,
  Eye,
  EyeOff,
  Mic
} from 'lucide-react';
import { BusinessSettings, User } from '../../types';
import { MobileConnectModal } from './MobileConnectModal';
import { WhatsAppGatewayModal } from './WhatsAppGatewayModal';
import { VoiceSearchButton } from './VoiceSearchButton';
import { hasModuleAccess, canEditModule } from '../../utils/permissionUtils';
import { api } from '../../api/client';

interface NavbarProps {
  settings: BusinessSettings | null;
  currentUser: User | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isPrivacyMode?: boolean;
  onTogglePrivacy?: () => void;
  onOpenNewSale: () => void;
  onOpenNewPurchase: () => void;
  onOpenNewExpense: () => void;
  onOpenPaymentIn: () => void;
  onOpenPaymentOut: () => void;
  onOpenGoogleSheetPnL: () => void;
  onOpenSettings: () => void;
  onOpenVoiceAssistant?: () => void;
  onLogout: () => void;
  onGlobalSearch?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  currentUser,
  theme,
  onToggleTheme,
  isPrivacyMode = false,
  onTogglePrivacy,
  onOpenNewSale,
  onOpenNewPurchase,
  onOpenNewExpense,
  onOpenPaymentIn,
  onOpenPaymentOut,
  onOpenGoogleSheetPnL,
  onOpenSettings,
  onOpenVoiceAssistant,
  onLogout,
  onGlobalSearch
}) => {
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [showMobileConnect, setShowMobileConnect] = useState(false);
  const [showWhatsAppGateway, setShowWhatsAppGateway] = useState(false);
  const [isWAConnected, setIsWAConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    api.getWhatsAppGatewayStatus().then(res => {
      const data = (res as any)?.data || res;
      setIsWAConnected(Boolean(data?.isConnected));
    }).catch(() => {});
  }, []);

  const canEditSales = canEditModule(currentUser, 'sales');
  const canEditPurchases = canEditModule(currentUser, 'purchases');
  const canAccessSheetPnL = hasModuleAccess(currentUser, 'google_sheet_pnl');
  const canAccessSettings = hasModuleAccess(currentUser, 'settings');

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      if (onGlobalSearch) {
        onGlobalSearch(searchQuery.trim());
      }
    }
  };

  return (
    <>
      <header className="navbar-container" style={{
        background: 'var(--bg-header)',
        borderBottom: '1px solid var(--border-color)',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {/* Left: Company Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              cursor: canAccessSettings ? 'pointer' : 'default',
              transition: 'all 0.15s ease'
            }} 
            onClick={() => {
              if (canAccessSettings) onOpenSettings();
            }}
            title={canAccessSettings ? "Click to view company profile & settings" : "Matuki Sweets ERP"}
          >
            <span style={{ fontSize: '1rem' }}>🍬</span>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#1e40af', lineHeight: 1.1 }}>
                {settings?.business_name || 'MATUKI SWEETS'}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#3b82f6', fontWeight: 700 }}>
                {settings?.subtitle || 'Katargam, Surat'}
              </div>
            </div>
            {canAccessSettings && <ChevronDown size={13} color="#2563eb" />}
          </div>

          <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {canEditSales && (
              <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                ⚡ <strong>[F2]</strong> Sale
              </span>
            )}
            {canEditPurchases && (
              <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                📦 <strong>[Alt+P]</strong> Purchase
              </span>
            )}
          </div>
        </div>

        {/* Center: Search Transactions & Status (Desktop only) */}
        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '460px', margin: '0 16px' }}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <input
              type="text"
              className="form-input"
              style={{
                paddingLeft: '30px',
                paddingRight: '36px',
                paddingTop: '5px',
                paddingBottom: '5px',
                fontSize: '0.8rem',
                borderRadius: '20px',
                background: 'var(--bg-card-alt)',
                border: '1px solid var(--border-color)',
                width: '100%'
              }}
              placeholder="Search sweets, parties, bills (or speak)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <div style={{ position: 'absolute', right: '4px' }}>
              <VoiceSearchButton 
                onTranscript={(spoken) => {
                  setSearchQuery(spoken);
                  if (onGlobalSearch) {
                    onGlobalSearch(spoken);
                  }
                }}
                title="🎙️ બોલીને સર્ચ કરો (ગુલાબ જાંબુ / કાજુ કતરી / પાર્ટી)"
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            <span className="badge badge-green" style={{ fontSize: '0.66rem' }}>⚡ OFFLINE</span>
          </div>
        </div>

        {/* Right: Desktop Action Buttons */}
        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Voice Assistant Trigger */}
          {onOpenVoiceAssistant && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={onOpenVoiceAssistant}
              title="🎙️ બોલો અને કામ કરો - ગુજરાતી વોઇસ સહાયક"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #ea580c 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                padding: '5px 10px',
                borderRadius: '6px',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Mic size={14} className="animate-pulse" /> બોલો (Voice)
            </button>
          )}

          {/* Add Sale Button */}
          {canEditSales && (
            <button
              className="btn btn-vyapar-red btn-sm"
              onClick={onOpenNewSale}
              title="Create Sale Bill [F2 or Alt+S]"
              style={{ fontWeight: 800, padding: '5px 12px' }}
            >
              <ShoppingCart size={14} /> + Add Sale
            </button>
          )}

          {/* Add Purchase Button */}
          {canEditPurchases && (
            <button
              className="btn btn-vyapar-blue btn-sm"
              onClick={onOpenNewPurchase}
              title="Record Purchase Bill [Alt+P]"
              style={{ fontWeight: 800, padding: '5px 12px' }}
            >
              <ShoppingBag size={14} /> + Add Purchase
            </button>
          )}

          {/* More Actions Menu */}
          {canEditSales && (
            <button
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                color: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
              }}
              onClick={() => setShowAddMenuModal(true)}
              title="All Transactions Menu (Receipt, Expense, Return)"
            >
              <Plus size={17} />
            </button>
          )}

          {/* WhatsApp Gateway Quick Link */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowWhatsAppGateway(true)}
            title={isWAConnected ? "WhatsApp Web Gateway Connected (1-Click Auto Send Active)" : "Link WhatsApp Web for 1-Click Auto Messaging"}
            style={{
              padding: '4px 9px',
              fontSize: '0.74rem',
              color: isWAConnected ? '#15803d' : '#075e54',
              borderColor: isWAConnected ? '#86efac' : '#bbf7d0',
              background: isWAConnected ? '#f0fdf4' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 800
            }}
          >
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isWAConnected ? '#16a34a' : '#eab308',
              boxShadow: isWAConnected ? '0 0 8px #16a34a' : 'none'
            }} />
            {isWAConnected ? 'WA Linked' : 'Link WA Web'}
          </button>

          {/* Mobile Wi-Fi Connect */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowMobileConnect(true)}
            title="Connect Mobile / Tablet on Local Wi-Fi"
            style={{ padding: '5px 8px', fontSize: '0.74rem', color: '#1e40af', borderColor: '#bfdbfe', background: '#eff6ff', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800 }}
          >
            <Smartphone size={13} color="#2563eb" /> Mobile Wi-Fi
          </button>

          {/* Google Sheet P&L Shortcut */}
          {canAccessSheetPnL && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenGoogleSheetPnL}
              title="Google Sheet Profit & Loss"
              style={{ padding: '5px 9px', fontSize: '0.74rem', color: '#15803d', borderColor: '#bbf7d0', background: '#f0fdf4', fontWeight: 800 }}
            >
              <Table size={13} /> Sheet P&L
            </button>
          )}

          {/* Theme Toggle */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onToggleTheme}
            style={{ padding: '6px', borderRadius: '50%' }}
            title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
          >
            {theme === 'light' ? <Moon size={14} color="#64748b" /> : <Sun size={14} color="#f59e0b" />}
          </button>

          {/* Privacy / Boss Mode Toggle (Eye Option) */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onTogglePrivacy}
            style={{
              padding: '6px',
              borderRadius: '50%',
              background: isPrivacyMode ? '#fee2e2' : undefined,
              borderColor: isPrivacyMode ? '#fca5a5' : undefined,
              color: isPrivacyMode ? '#dc2626' : undefined
            }}
            title={isPrivacyMode ? "Privacy Mode ON (Dashboard Figures Blurred) - Click to Reveal [Alt + H]" : "Privacy Mode OFF - Click to Blur Dashboard Figures [Alt + H]"}
          >
            {isPrivacyMode ? <EyeOff size={14} color="#dc2626" /> : <Eye size={14} color="#64748b" />}
          </button>

          {/* User Profile & Logout Button */}
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-card-alt)',
                border: '1px solid var(--border-color)',
                padding: '3px 9px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: 'var(--text-main)'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: currentUser.role === 'ADMIN' ? '#ea580c' : '#16a34a'
                }} />
                <span>{currentUser.full_name || currentUser.username}</span>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onLogout}
                title="Sign Out / Logout"
                style={{ padding: '4px 6px', fontSize: '0.72rem', color: '#dc2626', borderColor: '#fecaca' }}
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Header Action Controls (Visible only on screens <= 768px) */}
        <div className="mobile-only" style={{ display: 'none', alignItems: 'center', gap: '6px' }}>
          {onOpenVoiceAssistant && (
            <button
              type="button"
              onClick={onOpenVoiceAssistant}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #ea580c 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
                cursor: 'pointer'
              }}
              title="🎙️ વોઇસ સહાયક"
            >
              <Mic size={16} />
            </button>
          )}

          {currentUser && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--bg-card-alt)',
              border: '1px solid var(--border-color)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--text-main)'
            }}>
              <span>{currentUser.username}</span>
            </div>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onLogout}
            style={{ padding: '4px 6px', color: '#dc2626' }}
            title="Logout"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* MORE TRANSACTIONS POPUP MODAL */}
      {showAddMenuModal && (
        <div className="modal-overlay" onClick={() => setShowAddMenuModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '640px', padding: 0, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '12px 18px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                ⚡ Quick Transaction Launcher
              </span>
              <button
                onClick={() => setShowAddMenuModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
              padding: '20px'
            }}>
              {/* Column 1: SALE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#dc2626', letterSpacing: '0.04em', borderBottom: '2px solid #fecaca', paddingBottom: '4px' }}>
                  🛒 SALES
                </div>
                <button
                  className="vyapar-menu-btn"
                  onClick={() => { setShowAddMenuModal(false); onOpenNewSale(); }}
                >
                  <span>• Sale Invoice</span>
                  <kbd>F2 / Alt+S</kbd>
                </button>
                <button
                  className="vyapar-menu-btn"
                  onClick={() => { setShowAddMenuModal(false); onOpenPaymentIn(); }}
                >
                  <span>• Payment In (Receipt)</span>
                  <kbd>Alt+R</kbd>
                </button>
                <button
                  className="vyapar-menu-btn"
                  onClick={() => { setShowAddMenuModal(false); onOpenNewSale(); }}
                >
                  <span>• Sale Return & Vasan</span>
                </button>
              </div>

              {/* Column 2: PURCHASE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0284c7', letterSpacing: '0.04em', borderBottom: '2px solid #bfdbfe', paddingBottom: '4px' }}>
                  📦 PURCHASES
                </div>
                <button
                  className="vyapar-menu-btn"
                  onClick={() => { setShowAddMenuModal(false); onOpenNewPurchase(); }}
                >
                  <span>• Purchase Bill</span>
                  <kbd>Alt+P</kbd>
                </button>
                <button
                  className="vyapar-menu-btn"
                  onClick={() => { setShowAddMenuModal(false); onOpenPaymentOut(); }}
                >
                  <span>• Payment Out</span>
                </button>
                <button
                  className="vyapar-menu-btn"
                  onClick={() => { setShowAddMenuModal(false); onOpenNewPurchase(); }}
                >
                  <span>• Purchase Return</span>
                </button>
              </div>

              {/* Column 3: EXPENSES & P&L */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#059669', letterSpacing: '0.04em', borderBottom: '2px solid #a7f3d0', paddingBottom: '4px' }}>
                  💰 ACCOUNTS & GOALS
                </div>
                <button
                  className="vyapar-menu-btn"
                  onClick={() => { setShowAddMenuModal(false); onOpenNewExpense(); }}
                >
                  <Receipt size={13} color="#059669" />
                  <span>• Expense Voucher</span>
                  <kbd>Alt+E</kbd>
                </button>
                <button
                  className="vyapar-menu-btn"
                  onClick={() => { setShowAddMenuModal(false); onOpenGoogleSheetPnL(); }}
                  style={{ color: '#059669', fontWeight: 800 }}
                >
                  <Table size={13} color="#059669" />
                  <span>• Google Sheet P&L</span>
                </button>
                <button
                  className="vyapar-menu-btn"
                  onClick={() => { setShowAddMenuModal(false); onOpenSettings(); }}
                  style={{ color: '#d97706', fontWeight: 800 }}
                >
                  <span>• 🎯 Sales Goals & Targets</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Connect Local Wi-Fi Modal */}
      {showMobileConnect && (
        <MobileConnectModal
          isOpen={showMobileConnect}
          onClose={() => setShowMobileConnect(false)}
        />
      )}

      {/* WhatsApp Web Gateway Modal */}
      {showWhatsAppGateway && (
        <WhatsAppGatewayModal
          isOpen={showWhatsAppGateway}
          onClose={() => setShowWhatsAppGateway(false)}
          onStatusChange={setIsWAConnected}
        />
      )}
    </>
  );
};
