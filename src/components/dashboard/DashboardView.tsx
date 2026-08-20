import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft,
  Wallet,
  Layers,
  Printer,
  Calendar,
  Sparkles,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  Target
} from 'lucide-react';
import { api } from '../../api/client';
import { NavModule } from '../common/Sidebar';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { InvoicePrintModal } from '../sales/InvoicePrintModal';
import { DashboardOrderWidget } from './DashboardOrderWidget';
import { GoalWidget } from './GoalWidget';
import { DashboardTaskWidget } from './DashboardTaskWidget';
import { PriceRevealAnimation } from '../common/PriceRevealAnimation';
import { AdvanceOrder, BusinessSettings, User } from '../../types';
import { hasModuleAccess, canEditModule } from '../../utils/permissionUtils';

interface DashboardViewProps {
  settings?: BusinessSettings | null;
  currentUser?: User | null;
  isPrivacyMode?: boolean;
  onNavigate: (module: NavModule) => void;
  onOpenNewSale?: () => void;
  onConvertToSale?: (order: AdvanceOrder) => void;
}

const MOTIVATING_QUOTES = [
  { quote: "If you always put the customer first, success will follow.", author: "Ray Kroc" },
  { quote: "If you want to walk far, walk together with your team and parties.", author: "Ratan Tata" },
  { quote: "Convert every difficulty and peak rush into a grand opportunity.", author: "Dhirubhai Ambani" },
  { quote: "Quality is remembered long after the price is forgotten.", author: "Guccio Gucci" },
  { quote: "Trust is the currency of commerce. Keep your word with customers.", author: "Vyapar Niti" },
  { quote: "A satisfied customer is the best business strategy of all.", author: "Michael LeBoeuf" },
  { quote: "It takes discipline and dedication to build a generational sweet enterprise.", author: "Business Wisdom" },
  { quote: "The secret to getting ahead is getting started.", author: "Mark Twain" },
  { quote: "Customer loyalty is earned with honest billing and consistent taste.", author: "Matuki Principle" }
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  settings,
  currentUser,
  isPrivacyMode = false,
  onNavigate,
  onConvertToSale
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printSaleId, setPrintSaleId] = useState<number | null>(null);

  // 15-Minute Rotating Motivational Quote State
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * MOTIVATING_QUOTES.length));
  const [fadeQuote, setFadeQuote] = useState(true);

  useEffect(() => {
    // 15 minutes = 900,000 ms
    const interval = setInterval(() => {
      setFadeQuote(false);
      setTimeout(() => {
        setQuoteIndex(prev => (prev + 1) % MOTIVATING_QUOTES.length);
        setFadeQuote(true);
      }, 250);
    }, 900000);

    return () => clearInterval(interval);
  }, []);

  const handleNextQuote = () => {
    setFadeQuote(false);
    setTimeout(() => {
      setQuoteIndex(prev => (prev + 1) % MOTIVATING_QUOTES.length);
      setFadeQuote(true);
    }, 150);
  };

  const fetchMetrics = (isSilent = false) => {
    if (!isSilent && !data) setLoading(true);
    api.getDashboardMetrics()
      .then((newData) => {
        setData(newData);
      })
      .catch(console.error)
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  useEffect(() => {
    fetchMetrics(false);

    // 1. Instant Real-Time SSE Listener (Pushes updates from this or ANY OTHER PC in 0.05s)
    const unsubscribe = api.subscribeToEvents((event) => {
      if (event?.type === 'DATA_CHANGED') {
        fetchMetrics(true);
      }
    });

    // 2. 3-Second Background Heartbeat Fallback (Guarantees multi-PC sync even if network blips)
    const syncInterval = setInterval(() => {
      fetchMetrics(true);
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(syncInterval);
    };
  }, []);

  if (loading || !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Loading business metrics & cashbook...
      </div>
    );
  }

  const { financial_kpis, recent_sales } = data;
  const currentQuote = MOTIVATING_QUOTES[quoteIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Welcome Header + Integrated Compact Goal & Rotating Quote Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#ffffff',
        borderRadius: '12px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 3px 12px rgba(15, 23, 42, 0.15)'
      }}>
        {/* Left: Greeting + Embedded Rotating Quote */}
        <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
              Welcome back, {settings?.business_name || 'MATUKI SWEETS'}!
            </h2>
            <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '1px 7px', borderRadius: '10px', fontWeight: 800, border: '1px solid rgba(52, 211, 153, 0.3)' }}>
              🟢 Live
            </span>
          </div>

          {/* Integrated Motivational Quote Line */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.76rem',
            color: '#fde68a',
            opacity: fadeQuote ? 1 : 0,
            transition: 'opacity 0.25s ease'
          }}>
            <span style={{ fontStyle: 'italic', lineHeight: 1.2 }}>
              ✨ "{currentQuote.quote}" — <strong>{currentQuote.author}</strong>
            </span>
            <button
              onClick={handleNextQuote}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fde68a',
                padding: '2px 4px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              title="Next Motivational Quote"
            >
              <RefreshCw size={10} />
            </button>
          </div>
        </div>

        {/* Right: Task Progress & Live Goal Tracker Widgets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <DashboardTaskWidget onNavigateToTodos={() => onNavigate('todos')} />
          <GoalWidget />
        </div>
      </div>

      {/* 4 Glowing Financial Status Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px'
      }}>
        {/* You'll Receive (To Collect) */}
        <div
          className="vyapar-card"
          style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
            border: '1.5px solid #bbf7d0',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onClick={() => onNavigate('customers')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              You'll Receive (To Collect)
            </span>
            <div style={{ background: '#dcfce7', padding: '5px', borderRadius: '8px', color: '#15803d', display: 'flex' }}>
              <ArrowDownLeft size={15} />
            </div>
          </div>
          <div className="privacy-blur" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#15803d', fontFamily: 'var(--font-mono)', marginTop: '4px', lineHeight: 1.1 }}>
            <PriceRevealAnimation value={financial_kpis?.total_receivable || 0} color="#15803d" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>
              Customer Pending Balances
            </span>
            <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px' }}>
              View Debtors <ArrowRight size={10} />
            </span>
          </div>
        </div>

        {/* You'll Pay (To Pay) */}
        <div
          className="vyapar-card"
          style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)',
            border: '1.5px solid #fecaca',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onClick={() => onNavigate('suppliers')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              You'll Pay (To Pay)
            </span>
            <div style={{ background: '#fee2e2', padding: '5px', borderRadius: '8px', color: '#dc2626', display: 'flex' }}>
              <ArrowUpRight size={15} />
            </div>
          </div>
          <div className="privacy-blur" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#dc2626', fontFamily: 'var(--font-mono)', marginTop: '4px', lineHeight: 1.1 }}>
            <PriceRevealAnimation value={financial_kpis?.total_payable || 0} color="#dc2626" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: '#991b1b', fontWeight: 600 }}>
              Supplier Invoices Due
            </span>
            <span style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px' }}>
              View Creditors <ArrowRight size={10} />
            </span>
          </div>
        </div>

        {/* Cash In Hand */}
        <div
          className="vyapar-card"
          style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
            border: '1.5px solid #fde68a',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onClick={() => onNavigate('expenses')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cash In Hand
            </span>
            <div style={{ background: '#fef3c7', padding: '5px', borderRadius: '8px', color: '#d97706', display: 'flex' }}>
              <Wallet size={15} />
            </div>
          </div>
          <div className="privacy-blur" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#b45309', fontFamily: 'var(--font-mono)', marginTop: '4px', lineHeight: 1.1 }}>
            <PriceRevealAnimation value={financial_kpis?.cash_in_hand || 0} color="#b45309" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 600 }}>
              Daily Cashbook Drawer
            </span>
            <span style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px' }}>
              Daybook <ArrowRight size={10} />
            </span>
          </div>
        </div>

        {/* Stock Valuation */}
        <div
          className="vyapar-card"
          style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
            border: '1.5px solid #bfdbfe',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onClick={() => onNavigate('products')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Stock Valuation
            </span>
            <div style={{ background: '#dbeafe', padding: '5px', borderRadius: '8px', color: '#2563eb', display: 'flex' }}>
              <Layers size={15} />
            </div>
          </div>
          <div className="privacy-blur" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1e40af', fontFamily: 'var(--font-mono)', marginTop: '4px', lineHeight: 1.1 }}>
            <PriceRevealAnimation value={financial_kpis?.stock_valuation || 0} color="#1e40af" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 600 }}>
              Live Inventory Value
            </span>
            <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px' }}>
              View Stock <ArrowRight size={10} />
            </span>
          </div>
        </div>
      </div>

      {/* Advance Orders & Daily Dispatch Matrix Widget */}
      <DashboardOrderWidget
        settings={settings}
        onConvertToSale={(order) => {
          if (onConvertToSale) {
            onConvertToSale(order);
          } else {
            onNavigate('sales');
          }
        }}
        onNavigateToPlanner={() => onNavigate('advance_orders')}
      />

      {/* Recent Sales Register Card */}
      <div className="vyapar-card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
              Recent Sale Invoices
            </h3>
            <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
              {recent_sales?.length || 0} Bills Logged
            </span>
          </div>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ fontWeight: 800, fontSize: '0.78rem', color: '#2563eb' }} 
            onClick={() => onNavigate('sales')}
          >
            View Full Sales Register →
          </button>
        </div>

        <div className="table-container" style={{ maxHeight: '220px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr>
                <th>Date</th>
                <th>Invoice #</th>
                <th>Party / Customer</th>
                <th style={{ textAlign: 'right' }}>Grand Total</th>
                <th style={{ textAlign: 'right' }}>Paid Amount</th>
                <th style={{ textAlign: 'right' }}>Due Balance</th>
                <th style={{ textAlign: 'center' }}>Mode</th>
                <th style={{ textAlign: 'center', width: '80px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recent_sales?.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No recent sales found. Click "+ Add Sale" in the top bar to create your first bill!
                  </td>
                </tr>
              ) : (
                recent_sales?.map((s: any) => (
                  <tr key={s.id}>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {formatDate(s.date)}
                    </td>
                    <td className="font-mono" style={{ fontWeight: 800, color: '#dc2626' }}>
                      {s.invoice_no}
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-main)' }}>{s.customer_name}</strong>
                    </td>
                    <td className="font-mono privacy-blur" style={{ fontWeight: 900, textAlign: 'right', color: '#0f172a' }}>
                      {formatCurrency(s.grand_total)}
                    </td>
                    <td className="font-mono privacy-blur" style={{ color: '#059669', textAlign: 'right', fontWeight: 800 }}>
                      {formatCurrency(s.paid_amount)}
                    </td>
                    <td className="font-mono privacy-blur" style={{ color: s.due_amount > 0 ? '#dc2626' : '#64748b', textAlign: 'right', fontWeight: 800 }}>
                      {formatCurrency(s.due_amount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-blue">
                        {s.payment_mode}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrintSaleId(s.id);
                        }}
                        title={`Print Invoice ${s.invoice_no}`}
                      >
                        <Printer size={12} color="#2563eb" /> Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Print Modal */}
      {printSaleId && (
        <InvoicePrintModal
          isOpen={!!printSaleId}
          saleId={printSaleId}
          onClose={() => setPrintSaleId(null)}
          autoPrint={false}
        />
      )}
    </div>
  );
};
