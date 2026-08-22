import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { BusinessSettings, User } from './types';
import { Navbar } from './components/common/Navbar';
import { Sidebar, NavModule } from './components/common/Sidebar';
import { ToastContainer, ToastMessage } from './components/common/Toast';

// Vyapar Module Views
import { DashboardView } from './components/dashboard/DashboardView';
import { GoogleSheetPnLView } from './components/reports/GoogleSheetPnLView';
import { ProductsView } from './components/products/ProductsView';
import { SalesView } from './components/sales/SalesView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { CustomersView } from './components/parties/CustomersView';
import { SuppliersView } from './components/parties/SuppliersView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { RojmelView } from './components/accounting/RojmelView';
import { OrderPlannerView } from './components/orders/OrderPlannerView';
import { ReportsView } from './components/reports/ReportsView';
import { BackupRestoreView } from './components/settings/BackupRestoreView';
import { SettingsView } from './components/settings/SettingsView';
import { TodoView } from './components/todos/TodoView';
import { AttendanceView } from './components/attendance/AttendanceView';
import { useProductivityReminder, playNotificationChime } from './hooks/useProductivityReminder';
import { AdvanceOrder, TodoItem } from './types';
import { TaskReminderModal } from './components/todos/TaskReminderModal';

// Quick Action Modals
import { NewSaleModal } from './components/sales/NewSaleModal';
import { NewPurchaseModal } from './components/purchases/NewPurchaseModal';
import { ExpenseModal } from './components/expenses/ExpenseModal';
import { PaymentModal } from './components/parties/PaymentModal';
import { LoginModal } from './components/auth/LoginModal';
import { CustomerOrderPortal } from './components/public/CustomerOrderPortal';
import { VoiceAssistantModal } from './components/common/VoiceAssistantModal';
import { InvoicePrintModal } from './components/sales/InvoicePrintModal';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { MobileMoreDrawer } from './components/common/MobileMoreDrawer';
import { hasModuleAccess } from './utils/permissionUtils';
import { Sparkles } from 'lucide-react';

export function App() {
  // Check if current URL is for public customer self-ordering
  const urlParams = new URLSearchParams(window.location.search);
  const isPublicOrderPage = urlParams.get('page') === 'order' || 
    window.location.pathname === '/order' || 
    window.location.pathname === '/book' || 
    window.location.hash === '#order';

  if (isPublicOrderPage) {
    return <CustomerOrderPortal outletParam={urlParams.get('outlet') || undefined} />;
  }

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('matuki_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [activeModule, setActiveModule] = useState<NavModule>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('matuki_theme') as 'light' | 'dark') || 'light';
  });

  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('matuki_privacy_mode') === 'true';
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [toCollectAmount, setToCollectAmount] = useState<number>(0);
  const [toPayAmount, setToPayAmount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [todoCount, setTodoCount] = useState<number>(0);

  // Quick Action Modals
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [convertingAdvanceOrder, setConvertingAdvanceOrder] = useState<AdvanceOrder | null>(null);
  const [isQuickPurchaseOpen, setIsQuickPurchaseOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isQuickPaymentInOpen, setIsQuickPaymentInOpen] = useState(false);
  const [isQuickPaymentOutOpen, setIsQuickPaymentOutOpen] = useState(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [activeTaskAlert, setActiveTaskAlert] = useState<TodoItem | null>(null);
  const [quickPrintSaleId, setQuickPrintSaleId] = useState<number | null>(null);
  const [quickAutoTriggerPrint, setQuickAutoTriggerPrint] = useState<boolean>(true);

  const handleConvertToSale = (order: AdvanceOrder) => {
    setConvertingAdvanceOrder(order);
    setIsQuickSaleOpen(true);
  };

  const handleGlobalSearch = (query: string) => {
    if (!query) return;
    const clean = query.trim();
    setGlobalSearchQuery(clean);
    
    // Check if query is likely a customer/party or sweet
    const partyKeywords = ['ભાઈ', 'શેઠ', 'લાલ', 'પટેલ', 'શાહ', 'દવે', 'કુંવર', 'કંપની', 'ટ્રેડર્સ', 'કેટરર્સ', 'માલ', 'bhai', 'seth', 'traders', 'caterers'];
    const isParty = partyKeywords.some(k => clean.toLowerCase().includes(k));
    
    if (isParty) {
      setActiveModule('customers');
      addToast('info', `🔍 Searching Customer / Party: "${clean}"`);
    } else {
      setActiveModule('products');
      addToast('info', `🔍 Searching Sweet / Item: "${clean}"`);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('matuki_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isPrivacyMode) {
      document.documentElement.setAttribute('data-privacy', 'true');
    } else {
      document.documentElement.removeAttribute('data-privacy');
    }
  }, [isPrivacyMode]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const togglePrivacyMode = () => {
    setIsPrivacyMode(prev => {
      const next = !prev;
      localStorage.setItem('matuki_privacy_mode', String(next));
      if (next) {
        document.documentElement.setAttribute('data-privacy', 'true');
        addToast('info', '👁️ Privacy Mode ON: Dashboard figures blurred');
      } else {
        document.documentElement.removeAttribute('data-privacy');
        addToast('info', '👁️ Privacy Mode OFF: Normal figures visible');
      }
      return next;
    });
  };

  // Keyboard shortcut Alt + H for instant Boss Privacy Mode toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        togglePrivacyMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loadInitialData = async () => {
    try {
      const sett = await api.getSettings();
      setSettings(sett);
      
      const metrics = await api.getDashboardMetrics();
      if (metrics?.financial_kpis) {
        setToCollectAmount(metrics.financial_kpis.total_receivable || 0);
        setToPayAmount(metrics.financial_kpis.total_payable || 0);
      }
      
      const inv = await api.getInventorySummary();
      setLowStockCount(inv?.total_low_stock || 0);

      const todoSumm = await api.getTodoSummary(currentUser?.id);
      setTodoCount(todoSumm?.pending || 0);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  // Auto-sync user permissions from server to keep mobile clients up-to-date
  useEffect(() => {
    if (currentUser?.id) {
      api.getUsers().then(users => {
        const fresh = users.find((u: any) => u.id === currentUser.id);
        if (fresh) {
          setCurrentUser(fresh);
          localStorage.setItem('matuki_user', JSON.stringify(fresh));
        }
      }).catch(() => {});
    }
  }, [currentUser?.id]);

  // If current active module is restricted for this user, redirect to first allowed module
  useEffect(() => {
    if (currentUser && !hasModuleAccess(currentUser, activeModule)) {
      const allModules: NavModule[] = [
        'products', 'advance_orders', 'todos', 'attendance', 'sales', 'purchases',
        'customers', 'suppliers', 'expenses', 'rojmel', 'dashboard', 'reports', 'settings'
      ];
      const firstAllowed = allModules.find(m => hasModuleAccess(currentUser, m));
      if (firstAllowed) {
        setActiveModule(firstAllowed);
      }
    }
  }, [currentUser, activeModule]);

  // Mount Audio, Toast & Global Pop-up Productivity Reminder
  const { snoozeTask, dismissTask, markCompleted } = useProductivityReminder(
    currentUser?.id,
    (type, msg) => {
      addToast(type === 'success' ? 'success' : 'info', msg);
      // Refresh pending count
      api.getTodoSummary(currentUser?.id).then(res => setTodoCount(res?.pending || 0)).catch(() => {});
    },
    (task) => {
      setActiveTaskAlert(task);
    }
  );

  const handleCompleteTaskAlert = async (taskId: number) => {
    // 1. Instantly close modal and prevent re-alerting in 0ms
    setActiveTaskAlert(null);
    markCompleted(taskId);
    playNotificationChime('COMPLETED');
    addToast('success', '✅ કાર્ય પૂર્ણ થયું (Task Marked Done)!');

    try {
      await api.updateTodo(taskId, { status: 'COMPLETED' });
      const res = await api.getTodoSummary(currentUser?.id);
      setTodoCount(res?.pending || 0);
    } catch (e: any) {
      console.error('Failed to complete task:', e);
    }
  };

  const handleSnoozeTaskAlert = (taskId: number, minutes: number) => {
    setActiveTaskAlert(null);
    snoozeTask(taskId, minutes);
    addToast('info', `⏰ કાર્ય ૧૦ મિનિટ માટે Snooze કરવામાં આવ્યું (Snoozed for ${minutes} mins).`);
  };

  const handleDismissTaskAlert = (taskId: number) => {
    setActiveTaskAlert(null);
    dismissTask(taskId);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Global Vyapar Keyboard Shortcuts (F2 / Alt+S for Sale, Alt+P for Purchase, Alt+R for Payment In, Alt+E for Expense)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputOrModal = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT' ||
        Boolean(activeEl.closest('[style*="position: fixed"], [style*="position:fixed"]'))
      );
      if (isInputOrModal) return;

      if (e.key === 'F2' || (e.altKey && e.key.toLowerCase() === 's')) {
        e.preventDefault();
        setConvertingAdvanceOrder(null);
        setIsQuickSaleOpen(true);
      } else if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsQuickPurchaseOpen(true);
      } else if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setIsQuickPaymentInOpen(true);
      } else if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsQuickExpenseOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('matuki_user');
    addToast('info', 'Logged out successfully.');
  };

  if (!currentUser) {
    return (
      <>
        <LoginModal
          settings={settings}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            localStorage.setItem('matuki_user', JSON.stringify(user));
            addToast('success', `Welcome back, ${user.full_name || user.username}!`);
            loadInitialData();
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      {/* Top Professional Vyapar Header */}
      <Navbar
        settings={settings}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={toggleTheme}
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={togglePrivacyMode}
        onOpenNewSale={() => {
          setConvertingAdvanceOrder(null);
          setIsQuickSaleOpen(true);
        }}
        onOpenNewPurchase={() => setIsQuickPurchaseOpen(true)}
        onOpenNewExpense={() => setIsQuickExpenseOpen(true)}
        onOpenPaymentIn={() => setIsQuickPaymentInOpen(true)}
        onOpenPaymentOut={() => setIsQuickPaymentOutOpen(true)}
        onOpenGoogleSheetPnL={() => setActiveModule('google_sheet_pnl')}
        onOpenSettings={() => setActiveModule('settings')}
        onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
        onGlobalSearch={handleGlobalSearch}
        onLogout={handleLogout}
      />

      {/* Main Workspace Layout (Sidebar + Fluid Content) */}
      <div className="main-layout" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          activeModule={activeModule}
          onSelectModule={(mod) => setActiveModule(mod)}
          currentUser={currentUser}
          toCollectAmount={toCollectAmount}
          toPayAmount={toPayAmount}
          lowStockCount={lowStockCount}
          todoCount={todoCount}
        />

        <main style={{
          flex: 1,
          height: 'calc(100vh - 52px)',
          overflowY: 'auto',
          padding: '14px 18px',
          background: 'var(--bg-app)'
        }}>
          {!hasModuleAccess(currentUser, activeModule) ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '380px',
              padding: '30px 20px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              margin: '20px auto',
              maxWidth: '500px'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔒</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                Access Restricted (મર્યાદિત પરવાનગી)
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
                તમને <strong>{activeModule}</strong> વિભાગ જોવાની પરવાનગી નથી.
              </p>
            </div>
          ) : (
            <>
              {activeModule === 'dashboard' && (
                <DashboardView
                  settings={settings}
                  currentUser={currentUser}
                  isPrivacyMode={isPrivacyMode}
                  onNavigate={(mod) => setActiveModule(mod)}
                  onOpenNewSale={() => {
                    setConvertingAdvanceOrder(null);
                    setIsQuickSaleOpen(true);
                  }}
                  onConvertToSale={handleConvertToSale}
                />
              )}

          {activeModule === 'advance_orders' && (
            <OrderPlannerView
              settings={settings}
              currentUser={currentUser}
              onConvertToSale={handleConvertToSale}
              onNavigate={(mod) => setActiveModule(mod)}
            />
          )}

          {activeModule === 'google_sheet_pnl' && (
            <GoogleSheetPnLView settings={settings} />
          )}

          {activeModule === 'todos' && (
            <TodoView currentUser={currentUser} settings={settings} />
          )}

          {activeModule === 'attendance' && (
            <AttendanceView />
          )}

          {activeModule === 'customers' && (
            <CustomersView initialSearch={globalSearchQuery} currentUser={currentUser} />
          )}

          {activeModule === 'suppliers' && (
            <SuppliersView initialSearch={globalSearchQuery} currentUser={currentUser} />
          )}

          {activeModule === 'products' && (
            <ProductsView initialSearch={globalSearchQuery} currentUser={currentUser} />
          )}

          {activeModule === 'sales' && (
            <SalesView currentUser={currentUser} />
          )}

          {activeModule === 'purchases' && (
            <PurchasesView currentUser={currentUser} />
          )}

          {activeModule === 'expenses' && (
            <ExpensesView currentUser={currentUser} />
          )}

          {activeModule === 'rojmel' && (
            <RojmelView settings={settings} currentUser={currentUser} />
          )}

          {activeModule === 'reports' && (
            <ReportsView settings={settings} />
          )}

          {activeModule === 'backup' && (
            <BackupRestoreView />
          )}

          {activeModule === 'settings' && (
            <SettingsView onSettingsUpdated={loadInitialData} />
          )}
          </>
          )}
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar (Visible on screens <= 768px) */}
      <MobileBottomNav
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        onOpenNewSale={() => {
          setConvertingAdvanceOrder(null);
          setIsQuickSaleOpen(true);
        }}
        onToggleMoreDrawer={() => setIsMobileMoreOpen(true)}
        currentUser={currentUser}
        toCollectCount={toCollectAmount > 0 ? 1 : 0}
      />

      {/* Mobile Slide-Up App Drawer */}
      <MobileMoreDrawer
        isOpen={isMobileMoreOpen}
        onClose={() => setIsMobileMoreOpen(false)}
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        currentUser={currentUser}
        settings={settings}
        theme={theme}
        onToggleTheme={toggleTheme}
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={togglePrivacyMode}
        onLogout={handleLogout}
      />

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
        onNavigate={(mod: any) => {
          setActiveModule(mod as NavModule);
          addToast('info', `Navigated to ${mod}`);
        }}
        onOpenNewSale={() => {
          setConvertingAdvanceOrder(null);
          setIsQuickSaleOpen(true);
        }}
        onOpenNewPurchase={() => setIsQuickPurchaseOpen(true)}
        onOpenNewExpense={() => setIsQuickExpenseOpen(true)}
        onOpenPaymentIn={() => setIsQuickPaymentInOpen(true)}
        onOpenPaymentOut={() => setIsQuickPaymentOutOpen(true)}
        onGlobalSearch={handleGlobalSearch}
      />

      {/* Quick Action Modals */}
      {isQuickSaleOpen && (
        <NewSaleModal
          isOpen={isQuickSaleOpen}
          initialOrder={convertingAdvanceOrder}
          onClose={() => {
            setIsQuickSaleOpen(false);
            setConvertingAdvanceOrder(null);
          }}
          onSuccess={(newSale, shouldPrint = true) => {
            setIsQuickSaleOpen(false);
            setConvertingAdvanceOrder(null);
            addToast('success', 'Sale invoice created successfully!');
            loadInitialData();
            const saleObj = (newSale as any)?.data || newSale;
            const sid = saleObj?.id || (saleObj as any)?.insertId;
            if (sid && shouldPrint) {
              setQuickPrintSaleId(sid);
              setQuickAutoTriggerPrint(true);
            }
          }}
        />
      )}

      {/* Global Invoice Print Modal for Quick Sale & Dashboard Sale */}
      {quickPrintSaleId && (
        <InvoicePrintModal
          isOpen={!!quickPrintSaleId}
          saleId={quickPrintSaleId}
          autoPrint={quickAutoTriggerPrint}
          onClose={() => {
            setQuickPrintSaleId(null);
            setQuickAutoTriggerPrint(false);
          }}
        />
      )}

      {isQuickPurchaseOpen && (
        <NewPurchaseModal
          isOpen={isQuickPurchaseOpen}
          onClose={() => setIsQuickPurchaseOpen(false)}
          onSuccess={() => {
            setIsQuickPurchaseOpen(false);
            addToast('success', 'Purchase bill recorded successfully!');
            loadInitialData();
          }}
        />
      )}

      {isQuickExpenseOpen && (
        <ExpenseModal
          isOpen={isQuickExpenseOpen}
          onClose={() => setIsQuickExpenseOpen(false)}
          onSuccess={() => {
            setIsQuickExpenseOpen(false);
            addToast('success', 'Expense voucher saved!');
            loadInitialData();
          }}
        />
      )}

      {isQuickPaymentInOpen && (
        <PaymentModal
          isOpen={isQuickPaymentInOpen}
          partyType="CUSTOMER"
          onClose={() => setIsQuickPaymentInOpen(false)}
          onSuccess={() => {
            setIsQuickPaymentInOpen(false);
            addToast('success', 'Payment In (Receipt) recorded!');
            loadInitialData();
          }}
        />
      )}

      {isQuickPaymentOutOpen && (
        <PaymentModal
          isOpen={isQuickPaymentOutOpen}
          partyType="SUPPLIER"
          onClose={() => setIsQuickPaymentOutOpen(false)}
          onSuccess={() => {
            setIsQuickPaymentOutOpen(false);
            addToast('success', 'Payment Out recorded!');
            loadInitialData();
          }}
        />
      )}

      {/* Global Scheduled Task Pop-up Modal (Floats over ANY active screen without losing work) */}
      {activeTaskAlert && (
        <TaskReminderModal
          task={activeTaskAlert}
          onClose={() => handleDismissTaskAlert(activeTaskAlert.id)}
          onComplete={handleCompleteTaskAlert}
          onSnooze={handleSnoozeTaskAlert}
        />
      )}

      {/* Toast Layer */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;
