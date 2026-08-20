import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Sparkles, 
  Truck, 
  MapPin, 
  Plus, 
  CheckCircle,
  Building,
  Star,
  Trash2,
  Hash,
  Receipt,
  FileText,
  CreditCard,
  ShoppingBag,
  QrCode,
  MessageSquare,
  Upload,
  RotateCcw,
  Copy,
  Check,
  Smartphone,
  Target,
  Calculator,
  Search,
  Globe
} from 'lucide-react';
import { api } from '../../api/client';
import { BusinessSettings, Driver, DeliveryLocation } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { WhatsAppGatewayModal } from '../common/WhatsAppGatewayModal';
import { UserManagementTab } from './UserManagementTab';
import { VasanMasterModal } from './VasanMasterModal';
import { Box, Users } from 'lucide-react';

const DEFAULT_POLITE = `Namaste {customer_name} ji 🙏,
Greetings from *{business_name}*.

This is a gentle reminder that your current outstanding ledger balance as of {date} is *{balance}*.

━━━━━━━━━━━━━━━━━━━━
💳 *Official PhonePe UPI ID:* \`{upi_id}\`
📲 *1-Click Pay Link:* {pay_link}
📷 *Payment QR Code:* Attached PhonePe QR Code
━━━━━━━━━━━━━━━━━━━━

Kindly arrange the payment via PhonePe, GPay, Paytm or Cash at your earliest convenience. If you have already paid, please ignore this message.

Thank you!
*{business_name}*`;

const DEFAULT_WEEKLY = `Hello {customer_name} ji,
Hope you are doing well!

This is our weekly account reconciliation update from *{business_name}*.
• *Customer:* {customer_name}
• *Pending Balance Due:* {balance}
• *As of Date:* {date}

━━━━━━━━━━━━━━━━━━━━
💳 *PhonePe UPI ID:* \`{upi_id}\`
📲 *Pay via UPI Link:* {pay_link}
━━━━━━━━━━━━━━━━━━━━

Please review and arrange the settlement. Let us know if you need invoice copies.

Thank you!
*{business_name}*`;

const DEFAULT_URGENT = `URGENT: Payment Reminder ⚠️

Dear {customer_name},
Your account with *{business_name}* has a pending overdue balance of *{balance}* since {date}.

━━━━━━━━━━━━━━━━━━━━
💳 *UPI ID:* \`{upi_id}\`
📲 *Pay Now:* {pay_link}
━━━━━━━━━━━━━━━━━━━━

Kindly clear this payment today to avoid any interruption in raw material/sweets supply or booking.

Thank you!
*{business_name}*`;

const DEFAULT_DISPATCH = `Dear {customer_name} ji,
Your order from *{business_name}* has been dispatched! 🚚

• *Invoice #:* {invoice_no}
• *Amount:* {grand_total}
• *Balance Due:* {due_amount}
• *Delivery Venue:* {venue}
• *Driver / Rixa:* {driver_name} ({driver_mobile})

━━━━━━━━━━━━━━━━━━━━
💳 *UPI ID:* \`{upi_id}\`
📲 *Pay Link:* {pay_link}
━━━━━━━━━━━━━━━━━━━━

Thank you!
*{business_name}*`;

interface SettingsViewProps {
  onSettingsUpdated: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSettingsUpdated }) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'NUMBERING' | 'PAYMENT_REMINDERS' | 'DRIVERS' | 'VENUES' | 'GOALS' | 'USERS' | 'VASAN_MASTER'>('GENERAL');
  const [selectedTemplateTab, setSelectedTemplateTab] = useState<'POLITE' | 'WEEKLY' | 'URGENT' | 'DISPATCH'>('POLITE');
  const [isVasanModalOpen, setIsVasanModalOpen] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [showWAGatewayModal, setShowWAGatewayModal] = useState(false);
  const [waGatewayStatus, setWaGatewayStatus] = useState<any>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  // Sales Goals State
  const [goalsYear, setGoalsYear] = useState('2026');
  const [goalsAnnualTarget, setGoalsAnnualTarget] = useState(5000000);
  const [goalsMonthlyMap, setGoalsMonthlyMap] = useState<{ [key: string]: number }>({});
  const [goalsNotes, setGoalsNotes] = useState('Annual Business Growth Goal');
  const [goalsLiveSummary, setGoalsLiveSummary] = useState<any>(null);

  // New Driver Form State
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverMobile, setNewDriverMobile] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState('');
  const [newDriverFixedRent, setNewDriverFixedRent] = useState(150);

  // New Venue Form State (With Customer Charge & Driver Rent per Venue)
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [newVenueLandmark, setNewVenueLandmark] = useState('');
  const [newVenueGoogleMapLink, setNewVenueGoogleMapLink] = useState('');
  const [newVenueCustomerCharge, setNewVenueCustomerCharge] = useState<number>(0);
  const [newVenueDriverRent, setNewVenueDriverRent] = useState<number>(0);
  const [editingVenueId, setEditingVenueId] = useState<number | null>(null);
  const [venueAreaFilter, setVenueAreaFilter] = useState('ALL');
  const [venueSearch, setVenueSearch] = useState('');

  const loadData = () => {
    Promise.all([
      api.getSettings(),
      api.getDrivers(),
      api.getDeliveryLocations()
    ]).then(([sett, drvs, locs]) => {
      setSettings(sett);
      setDrivers(drvs);
      setLocations(locs);
      setLoading(false);
      api.getWhatsAppGatewayStatus().then(res => {
        setWaGatewayStatus((res as any)?.data || res);
      }).catch(() => {});
      api.getGoals(goalsYear).then(res => {
        const g = (res as any)?.data || res;
        if (g) {
          setGoalsLiveSummary(g);
          setGoalsAnnualTarget(g.annual_target);
          const map: { [key: string]: number } = {};
          if (g.monthly_breakdown) {
            g.monthly_breakdown.forEach((m: any) => { map[String(m.month_num)] = m.target; });
          }
          setGoalsMonthlyMap(map);
          setGoalsNotes(g.notes || '');
        }
      }).catch(() => {});
    }).catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGoalYearChange = (newYear: string) => {
    setGoalsYear(newYear);
    api.getGoals(newYear).then(res => {
      const g = (res as any)?.data || res;
      if (g) {
        setGoalsLiveSummary(g);
        setGoalsAnnualTarget(g.annual_target);
        const map: { [key: string]: number } = {};
        if (g.monthly_breakdown) {
          g.monthly_breakdown.forEach((m: any) => { map[String(m.month_num)] = m.target; });
        }
        setGoalsMonthlyMap(map);
        setGoalsNotes(g.notes || '');
      }
    }).catch(() => {});
  };

  const handleSaveGoalsFromSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await api.saveGoals({
        year: goalsYear,
        annual_target: goalsAnnualTarget,
        monthly_targets: goalsMonthlyMap,
        notes: goalsNotes
      });
      setGoalsLiveSummary((updated as any)?.data || updated);
      setSuccessMsg(`Sales Goals for ${goalsYear} saved successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save goals');
    } finally {
      setSaving(false);
    }
  };

  const handleMonthTargetChange = (monthNum: number, value: string) => {
    const val = Number(value) || 0;
    setGoalsMonthlyMap(prev => ({
      ...prev,
      [String(monthNum)]: val
    }));
  };

  const handleAutoSplitGoals = () => {
    const avg = Math.round(goalsAnnualTarget / 12);
    const newMap: { [key: string]: number } = {};
    for (let i = 1; i <= 12; i++) newMap[String(i)] = avg;
    setGoalsMonthlyMap(newMap);
  };

  const handleSyncGoalsFromMonths = () => {
    const sum = Object.values(goalsMonthlyMap).reduce((s, v) => s + (Number(v) || 0), 0);
    setGoalsAnnualTarget(sum);
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    try {
      setQrUploading(true);
      setError('');
      setSuccessMsg('');

      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await api.uploadQRImage(base64Data, settings?.upi_id);
          if (settings) {
            setSettings({
              ...settings,
              upi_qr_image: res.url
            });
          }
          setSuccessMsg('New Payment QR Image uploaded and updated successfully!');
          onSettingsUpdated();
        } catch (err: any) {
          setError(err.message || 'Failed to upload QR image');
        } finally {
          setQrUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Error reading image file');
      setQrUploading(false);
    }
  };

  const getRenderedPreview = (rawTemplate: string) => {
    const custName = 'Pareshbhai (Surat)';
    const balanceStr = '₹14,500.00';
    const dateStr = '13-Aug-2026';
    const uId = settings?.upi_id || 'Q070321548@ybl';
    const bName = settings?.business_name || 'MATUKI SWEETS';
    const pLink = `upi://pay?pa=${uId}&pn=${encodeURIComponent(bName)}&am=14500.00&cu=INR`;

    return (rawTemplate || '')
      .replace(/\{customer_name\}/g, custName)
      .replace(/\{balance\}/g, balanceStr)
      .replace(/\{date\}/g, dateStr)
      .replace(/\{upi_id\}/g, uId)
      .replace(/\{business_name\}/g, bName)
      .replace(/\{pay_link\}/g, pLink);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      setError('');
      setSuccessMsg('');
      await api.updateSettings(settings);
      setSuccessMsg('Business settings updated successfully!');
      onSettingsUpdated();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName) return;

    try {
      setSaving(true);
      await api.createDriver({
        name: newDriverName,
        mobile: newDriverMobile,
        vehicle_no: newDriverVehicle,
        default_rent: newDriverFixedRent
      });
      setNewDriverName('');
      setNewDriverMobile('');
      setNewDriverVehicle('');
      setNewDriverFixedRent(150);
      loadData();
      setSuccessMsg('New Rickshaw Driver added successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to add driver');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefaultDriver = async (driverId: number) => {
    try {
      await api.setDefaultDriver(driverId);
      localStorage.setItem('matuki_default_driver_id', String(driverId));
      loadData();
      setSuccessMsg('Default Rickshaw Driver updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert('Failed to set default driver: ' + err.message);
    }
  };

  const handleAddOrUpdateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenueName || !newVenueAddress) return;

    try {
      setSaving(true);
      if (editingVenueId) {
        await api.updateDeliveryLocation(editingVenueId, {
          venue_name: newVenueName,
          address: newVenueAddress,
          area_landmark: newVenueLandmark,
          customer_charge: newVenueCustomerCharge,
          driver_rent: newVenueDriverRent,
          google_map_link: newVenueGoogleMapLink
        });
        setSuccessMsg(`Venue "${newVenueName}" updated successfully!`);
      } else {
        await api.createDeliveryLocation({
          venue_name: newVenueName,
          address: newVenueAddress,
          area_landmark: newVenueLandmark,
          customer_charge: newVenueCustomerCharge,
          driver_rent: newVenueDriverRent,
          google_map_link: newVenueGoogleMapLink
        });
        setSuccessMsg(`New Delivery Venue "${newVenueName}" added successfully!`);
      }
      setNewVenueName('');
      setNewVenueAddress('');
      setNewVenueLandmark('');
      setNewVenueGoogleMapLink('');
      setNewVenueCustomerCharge(0);
      setNewVenueDriverRent(0);
      setEditingVenueId(null);
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save venue');
    } finally {
      setSaving(false);
    }
  };

  const handleEditVenue = (loc: DeliveryLocation) => {
    setEditingVenueId(loc.id);
    setNewVenueName(loc.venue_name);
    setNewVenueLandmark(loc.area_landmark || '');
    setNewVenueAddress(loc.address);
    setNewVenueGoogleMapLink(loc.google_map_link || '');
    setNewVenueCustomerCharge(loc.customer_charge || 0);
    setNewVenueDriverRent(loc.driver_rent || 0);
  };

  const handleDeleteVenue = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to remove Venue "${name}"?`)) {
      try {
        await api.deleteDeliveryLocation(id);
        loadData();
        setSuccessMsg(`Venue "${name}" removed`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err: any) {
        alert(err.message || 'Failed to delete venue');
      }
    }
  };

  const handleSeedDemo = async () => {
    if (window.confirm('Reset & load complete demonstration dataset (Sweets, Caterers, Rickshaw Drivers, Delivery Venues)?')) {
      try {
        setSaving(true);
        await api.seedDemoData();
        alert('Demo dataset loaded successfully!');
        window.location.reload();
      } catch (err: any) {
        alert(err.message || 'Failed to seed demo data');
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading || !settings) {
    return <div style={{ padding: '30px', color: 'var(--text-secondary)' }}>Loading settings...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '960px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Master Settings & Wholesale Configuration
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            Manage Business Profile, Rickshaw Drivers, and Delivery Venues & Rates
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={handleSeedDemo}>
          <Sparkles size={14} color="#f59e0b" />
          Reload Sweets Demo Data
        </button>
      </div>

      {/* Settings Navigation Tabs (Clean 3 Tabs: Profile, Drivers, Venues & Rates) */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'GENERAL' ? 'btn-vyapar-red' : 'btn-secondary'}`}
          onClick={() => setActiveTab('GENERAL')}
        >
          <Building size={14} /> 1. Store Profile & Rules
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'NUMBERING' ? 'btn-vyapar-red' : 'btn-secondary'}`}
          onClick={() => setActiveTab('NUMBERING')}
        >
          <Hash size={14} /> 2. Voucher & Bill Series Numbering
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'DRIVERS' ? 'btn-vyapar-red' : 'btn-secondary'}`}
          onClick={() => setActiveTab('DRIVERS')}
        >
          <Truck size={14} /> 3. Rickshaw Drivers ({drivers.length})
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'VENUES' ? 'btn-vyapar-red' : 'btn-secondary'}`}
          onClick={() => setActiveTab('VENUES')}
        >
          <MapPin size={14} /> 4. Delivery Venues & Rates ({locations.length})
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'PAYMENT_REMINDERS' ? 'btn-vyapar-red' : 'btn-secondary'}`}
          onClick={() => setActiveTab('PAYMENT_REMINDERS')}
          style={{
            background: activeTab === 'PAYMENT_REMINDERS' ? undefined : '#f0fdf4',
            color: activeTab === 'PAYMENT_REMINDERS' ? undefined : '#15803d',
            borderColor: activeTab === 'PAYMENT_REMINDERS' ? undefined : '#86efac',
            fontWeight: 700
          }}
        >
          <QrCode size={14} /> 5. WhatsApp Reminders & UPI QR
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'GOALS' ? 'btn-vyapar-red' : 'btn-secondary'}`}
          onClick={() => setActiveTab('GOALS')}
          style={{
            background: activeTab === 'GOALS' ? undefined : '#fffbeb',
            color: activeTab === 'GOALS' ? undefined : '#b45309',
            borderColor: activeTab === 'GOALS' ? undefined : '#fde68a',
            fontWeight: 800
          }}
        >
          <Target size={14} /> 6. Sales Targets & Goals ({goalsYear})
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'VASAN_MASTER' ? 'btn-vyapar-red' : 'btn-secondary'}`}
          onClick={() => {
            setActiveTab('VASAN_MASTER');
            setIsVasanModalOpen(true);
          }}
          style={{
            background: activeTab === 'VASAN_MASTER' ? undefined : '#f0fdf4',
            color: activeTab === 'VASAN_MASTER' ? undefined : '#15803d',
            borderColor: activeTab === 'VASAN_MASTER' ? undefined : '#86efac',
            fontWeight: 800
          }}
        >
          <Box size={14} /> 7. Vasan Master & Rates
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'USERS' ? 'btn-vyapar-red' : 'btn-secondary'}`}
          onClick={() => setActiveTab('USERS')}
          style={{
            background: activeTab === 'USERS' ? undefined : '#eff6ff',
            color: activeTab === 'USERS' ? undefined : '#1e40af',
            borderColor: activeTab === 'USERS' ? undefined : '#bfdbfe',
            fontWeight: 800
          }}
        >
          <Users size={14} /> 8. Team Members & Logins
        </button>
      </div>

      {successMsg && (
        <div style={{ padding: '10px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius-sm)', color: '#15803d', fontSize: '0.85rem', fontWeight: 600 }}>
          ✓ {successMsg}
        </div>
      )}

      {/* TAB 1: GENERAL PROFILE */}
      {activeTab === 'GENERAL' && (
        <>
        <form onSubmit={handleSaveSettings} className="vyapar-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', margin: 0 }}>
            Store Identity
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Business Name *</label>
              <input
                type="text"
                required
                className="form-input"
                value={settings.business_name}
                onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subtitle / Area</label>
              <input
                type="text"
                className="form-input"
                value={settings.subtitle}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Shop & Factory Address</label>
              <input
                type="text"
                className="form-input"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Support Mobile Number</label>
              <input
                type="text"
                className="form-input"
                value={settings.mobile}
                onChange={(e) => setSettings({ ...settings, mobile: e.target.value })}
              />
            </div>
          </div>

          <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', margin: '10px 0 0 0' }}>
            Accounting & Bill Settings
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Sales Invoice Prefix</label>
              <input
                type="text"
                className="form-input"
                value={settings.invoice_prefix}
                onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Active Financial Year</label>
              <input
                type="text"
                className="form-input"
                value={settings.financial_year}
                onChange={(e) => setSettings({ ...settings, financial_year: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Default Invoice Footer Terms & Conditions</label>
              <textarea
                className="form-textarea"
                style={{ height: '70px' }}
                value={settings.invoice_terms}
                onChange={(e) => setSettings({ ...settings, invoice_terms: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button type="submit" className="btn btn-vyapar-red" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Store Profile'}
            </button>
          </div>
        </form>

        {/* Clear Trial Data Maintenance Card */}
        <div className="vyapar-card" style={{
          padding: '16px',
          background: '#ffffff',
          border: '1.5px solid #fed7aa',
          marginTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={18} color="#ea580c" />
              <strong style={{ fontSize: '0.92rem', color: '#9a3412' }}>
                Clear Trial Transactions & Prepare for LIVE Business
              </strong>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '4px 0 0' }}>
              Clears all test sale bills, test purchases, and payment receipts while keeping your Customers, Items, Recipes, and Drivers intact.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-vyapar-red btn-sm"
            style={{ fontWeight: 800, fontSize: '0.8rem' }}
            onClick={() => setIsConfirmResetOpen(true)}
            disabled={resetting}
          >
            <Trash2 size={13} /> {resetting ? 'Resetting...' : '🧹 Clear Trial Data & Start LIVE'}
          </button>
        </div>

        <ConfirmDialog
          isOpen={isConfirmResetOpen}
          title="🧹 Clear All Trial Transactions & Start LIVE Business?"
          message={`This will clear all trial Sales Bills, Purchases, Payment Receipts, Ledger Entries, and Vasan records.\n\n✓ Your Customers, Suppliers, Products, Recipes, Drivers, and Settings will be 100% PRESERVED.\n✓ Bill invoice numbering will restart from #001.\n🛡️ An automatic safety backup will be saved first.\n\nAre you sure you want to proceed?`}
          confirmText="Yes, Clear Trial Data & Start LIVE"
          cancelText="Cancel"
          isDangerous={true}
          onConfirm={async () => {
            try {
              setResetting(true);
              setIsConfirmResetOpen(false);
              const res = await api.resetTrialTransactions();
              alert(`🎉 ${res.message}\n\n🛡️ Safety backup saved: ${res.backup_file || 'Saved'}`);
              window.location.reload();
            } catch (err: any) {
              alert('Reset failed: ' + err.message);
            } finally {
              setResetting(false);
            }
          }}
          onClose={() => setIsConfirmResetOpen(false)}
        />
        </>
      )}

      {/* TAB 2: VOUCHER & DOCUMENT NUMBERING SERIES */}
      {activeTab === 'NUMBERING' && (
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Informational Guidance Alert */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{ background: '#d32f2f', color: '#fff', padding: '6px', borderRadius: '6px' }}>
              <Hash size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                Physical Voucher Book & Document Numbering Settings
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                Set starting sequence numbers for printed voucher books (e.g. Payment-Out, Invoices, Advance Orders). Next voucher numbers will auto-increment from this sequence.
              </p>
            </div>
          </div>

          {/* 8 Document Types Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            
            {/* 1. SALE INVOICE */}
            <div className="vyapar-card" style={{ padding: '16px', borderTop: '3px solid #d32f2f' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingBag size={15} color="#d32f2f" /> Sale Invoice
                </strong>
                <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                  Next: {(settings.invoice_prefix ?? 'MS/26-27/') + String(settings.sale_start_seq || 1).padStart(3, '0')}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Prefix Code</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="MS/26-27/"
                    value={settings.invoice_prefix ?? ''}
                    onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Starting Sequence No</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input font-mono"
                    placeholder="1001"
                    value={settings.sale_start_seq ?? 1}
                    onChange={(e) => setSettings({ ...settings, sale_start_seq: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            {/* 2. PAYMENT-OUT (VOUCHER BOOK) */}
            <div className="vyapar-card" style={{ padding: '16px', borderTop: '3px solid #ea580c', background: '#fffbeb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Receipt size={15} color="#ea580c" /> Payment Out Voucher
                </strong>
                <span style={{ fontSize: '0.72rem', background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                  Next: {(settings.payment_out_prefix ?? 'PAY-') + String(settings.payment_out_start_seq || 1).padStart(3, '0')}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem', color: '#9a3412' }}>Prefix (e.g. PAY- or PV-)</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="PAY- or PV-"
                    value={settings.payment_out_prefix ?? ''}
                    onChange={(e) => setSettings({ ...settings, payment_out_prefix: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem', color: '#9a3412', fontWeight: 800 }}>Voucher Starting No *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input font-mono"
                    style={{ borderColor: '#f97316', fontWeight: 800 }}
                    placeholder="701"
                    value={settings.payment_out_start_seq ?? 1}
                    onChange={(e) => setSettings({ ...settings, payment_out_start_seq: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            {/* 3. PAYMENT-IN (RECEIPT) */}
            <div className="vyapar-card" style={{ padding: '16px', borderTop: '3px solid #16a34a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={15} color="#16a34a" /> Payment In (Receipt)
                </strong>
                <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                  Next: {(settings.payment_in_prefix ?? 'RCT-') + String(settings.payment_in_start_seq || 1).padStart(3, '0')}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Prefix Code</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="RCT-"
                    value={settings.payment_in_prefix ?? ''}
                    onChange={(e) => setSettings({ ...settings, payment_in_prefix: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Starting Sequence No</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input font-mono"
                    placeholder="501"
                    value={settings.payment_in_start_seq ?? 1}
                    onChange={(e) => setSettings({ ...settings, payment_in_start_seq: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            {/* 4. EXPENSE VOUCHER */}
            <div className="vyapar-card" style={{ padding: '16px', borderTop: '3px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Receipt size={15} color="#0284c7" /> Expense Voucher
                </strong>
                <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                  Next: {(settings.expense_prefix ?? 'EXP-') + String(settings.expense_start_seq || 1).padStart(3, '0')}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Prefix</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="EXP-"
                    value={settings.expense_prefix ?? ''}
                    onChange={(e) => setSettings({ ...settings, expense_prefix: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Starting Sequence No</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input font-mono"
                    placeholder="201"
                    value={settings.expense_start_seq ?? 1}
                    onChange={(e) => setSettings({ ...settings, expense_start_seq: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            {/* 5. SALE RETURN */}
            <div className="vyapar-card" style={{ padding: '16px', borderTop: '3px solid #e11d48' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={15} color="#e11d48" /> Sale Return (Credit Note)
                </strong>
                <span style={{ fontSize: '0.72rem', background: '#ffe4e6', color: '#be123c', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                  Next: {(settings.sale_return_prefix ?? 'SR/26-27/') + String(settings.sale_return_start_seq || 1).padStart(3, '0')}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Prefix</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="SR/26-27/"
                    value={settings.sale_return_prefix ?? ''}
                    onChange={(e) => setSettings({ ...settings, sale_return_prefix: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Starting Sequence No</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input font-mono"
                    placeholder="101"
                    value={settings.sale_return_start_seq ?? 1}
                    onChange={(e) => setSettings({ ...settings, sale_return_start_seq: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            {/* 6. PURCHASE BILL */}
            <div className="vyapar-card" style={{ padding: '16px', borderTop: '3px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingBag size={15} color="#2563eb" /> Purchase Bill
                </strong>
                <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                  Next: {(settings.purchase_prefix ?? 'PO/26-27/') + String(settings.purchase_start_seq || 1).padStart(3, '0')}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Prefix</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="PO/26-27/"
                    value={settings.purchase_prefix ?? ''}
                    onChange={(e) => setSettings({ ...settings, purchase_prefix: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Starting Sequence No</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input font-mono"
                    placeholder="101"
                    value={settings.purchase_start_seq ?? 1}
                    onChange={(e) => setSettings({ ...settings, purchase_start_seq: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            {/* 7. PURCHASE RETURN */}
            <div className="vyapar-card" style={{ padding: '16px', borderTop: '3px solid #7c3aed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={15} color="#7c3aed" /> Purchase Return (Debit Note)
                </strong>
                <span style={{ fontSize: '0.72rem', background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                  Next: {(settings.purchase_return_prefix ?? 'PR/26-27/') + String(settings.purchase_return_start_seq || 1).padStart(3, '0')}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Prefix</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="PR/26-27/"
                    value={settings.purchase_return_prefix ?? ''}
                    onChange={(e) => setSettings({ ...settings, purchase_return_prefix: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Starting Sequence No</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input font-mono"
                    placeholder="101"
                    value={settings.purchase_return_start_seq ?? 1}
                    onChange={(e) => setSettings({ ...settings, purchase_return_start_seq: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            {/* 8. ADVANCE ORDER */}
            <div className="vyapar-card" style={{ padding: '16px', borderTop: '3px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={15} color="#f59e0b" /> Advance Order Booking
                </strong>
                <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                  Next: {(settings.advance_order_prefix ?? 'ORD-') + String(settings.advance_order_start_seq || 1).padStart(3, '0')}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Prefix</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="ORD-"
                    value={settings.advance_order_prefix ?? ''}
                    onChange={(e) => setSettings({ ...settings, advance_order_prefix: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Starting Sequence No</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input font-mono"
                    placeholder="101"
                    value={settings.advance_order_start_seq ?? 1}
                    onChange={(e) => setSettings({ ...settings, advance_order_start_seq: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button type="submit" className="btn btn-vyapar-red" style={{ padding: '8px 24px', fontWeight: 800 }} disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : '💾 Save Voucher Numbering Settings'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: PAYMENT REMINDERS & UPI QR */}
      {activeTab === 'PAYMENT_REMINDERS' && (
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Top Card: WhatsApp Web Device Link Status */}
          <div style={{
            background: waGatewayStatus?.isConnected ? '#f0fdf4' : '#fffbeb',
            border: `1.5px solid ${waGatewayStatus?.isConnected ? '#86efac' : '#fde68a'}`,
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: waGatewayStatus?.isConnected ? '#dcfce7' : '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Smartphone size={20} color={waGatewayStatus?.isConnected ? '#16a34a' : '#d97706'} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: waGatewayStatus?.isConnected ? '#15803d' : '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>WhatsApp Web Background Gateway:</span>
                  <span className={`badge ${waGatewayStatus?.isConnected ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.66rem' }}>
                    {waGatewayStatus?.isConnected ? `ONLINE (${waGatewayStatus.phone || 'Linked'})` : 'OFFLINE / NOT LINKED'}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>
                  {waGatewayStatus?.isConnected 
                    ? '⚡ 1-Click automated background messaging is active for all Sales Bills, Orders, and Ugharani Reminders.'
                    : 'Scan your WhatsApp Web QR code once to enable 1-click automatic background messaging with PhonePe QR attached!'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowWAGatewayModal(true)}
              className={`btn btn-sm ${waGatewayStatus?.isConnected ? 'btn-secondary' : 'btn-vyapar-green'}`}
              style={{ padding: '6px 14px', fontSize: '0.76rem', fontWeight: 800 }}
            >
              <QrCode size={13} /> {waGatewayStatus?.isConnected ? 'Manage WhatsApp Link' : '📲 Scan QR to Link WhatsApp'}
            </button>
          </div>

          {/* Main 2-Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px' }}>
            
            {/* Left Card: PhonePe UPI & QR Code Manager */}
            <div className="vyapar-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '3px solid #16a34a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={18} color="#16a34a" />
                <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Official Payment QR & UPI ID
                </h3>
              </div>

              {/* UPI ID Field */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Official Merchant UPI ID *
                </label>
                <input
                  type="text"
                  required
                  className="form-input font-mono"
                  placeholder="e.g. Q070321548@ybl"
                  value={settings.upi_id ?? 'Q070321548@ybl'}
                  onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                  style={{ fontWeight: 700, color: '#1e40af' }}
                />
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  Used in 1-click payment links & WhatsApp text reminders.
                </span>
              </div>

              {/* Current QR Code Image Preview */}
              <div style={{
                border: '1.5px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>
                  Current Active QR Code
                </span>
                <img
                  src={settings.upi_qr_image || '/payment_qr.png'}
                  alt="Payment QR"
                  style={{
                    width: '140px',
                    height: '200px',
                    objectFit: 'contain',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700 }}>
                  ✓ Live on All WhatsApp Reminders & Invoices
                </span>
              </div>

              {/* Upload New QR Button & File Input */}
              <div>
                <label
                  className="btn btn-vyapar-blue btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    cursor: qrUploading ? 'not-allowed' : 'pointer',
                    padding: '8px'
                  }}
                >
                  <Upload size={14} />
                  {qrUploading ? 'Uploading New QR...' : '📁 Upload / Change QR Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQRUpload}
                    disabled={qrUploading}
                    style={{ display: 'none' }}
                  />
                </label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <a
                    href={settings.upi_qr_image || '/payment_qr.png'}
                    download="Matuki_Payment_QR.png"
                    style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                  >
                    📥 Download QR
                  </a>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, upi_qr_image: '/payment_qr.png' })}
                    style={{ fontSize: '0.7rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Reset default QR
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1e40af', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                💡 <strong>Easy Update:</strong> Whenever you change your PhonePe/GPay QR image here, it immediately updates across the whole ERP system.
              </div>
            </div>

            {/* Right Card: Customizable WhatsApp Reminder Templates */}
            <div className="vyapar-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '3px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={16} color="#2563eb" />
                    Customize WhatsApp Message Templates
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Edit the exact wording sent to customers when requesting payment.
                  </span>
                </div>
              </div>

              {/* Template Selector Sub-tabs */}
              <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedTemplateTab === 'POLITE' ? 'btn-vyapar-red' : 'btn-secondary'}`}
                  onClick={() => setSelectedTemplateTab('POLITE')}
                  style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                >
                  🤝 1. Polite Reminder
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedTemplateTab === 'WEEKLY' ? 'btn-vyapar-red' : 'btn-secondary'}`}
                  onClick={() => setSelectedTemplateTab('WEEKLY')}
                  style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                >
                  📅 2. Weekly Statement
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedTemplateTab === 'URGENT' ? 'btn-vyapar-red' : 'btn-secondary'}`}
                  onClick={() => setSelectedTemplateTab('URGENT')}
                  style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                >
                  🚨 3. Overdue Urgent
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedTemplateTab === 'DISPATCH' ? 'btn-vyapar-red' : 'btn-secondary'}`}
                  onClick={() => setSelectedTemplateTab('DISPATCH')}
                  style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                >
                  🚚 4. Dispatch Clearance
                </button>
              </div>

              {/* Variable Placeholders Cheat-Sheet Bar */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Click to Copy Dynamic Tags:
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { tag: '{customer_name}', desc: 'Customer Name' },
                    { tag: '{balance}', desc: 'Balance Amount (₹)' },
                    { tag: '{date}', desc: 'Date' },
                    { tag: '{upi_id}', desc: 'UPI ID' },
                    { tag: '{business_name}', desc: 'Business Name' },
                    { tag: '{pay_link}', desc: '1-Click Pay Link' }
                  ].map(({ tag, desc }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(tag);
                        setCopiedTag(tag);
                        setTimeout(() => setCopiedTag(null), 2000);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.68rem',
                        fontFamily: 'monospace',
                        background: '#ffffff',
                        borderColor: copiedTag === tag ? '#16a34a' : '#cbd5e1',
                        color: copiedTag === tag ? '#16a34a' : '#0f172a'
                      }}
                      title={`Click to copy ${desc}`}
                    >
                      {copiedTag === tag ? <Check size={10} /> : <Copy size={10} />}
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Editor & Live Preview Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '12px' }}>
                {/* Editor Textarea */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ fontWeight: 700, margin: 0, fontSize: '0.76rem' }}>
                      Message Template Editor
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedTemplateTab === 'POLITE') setSettings({ ...settings, template_polite: DEFAULT_POLITE });
                        if (selectedTemplateTab === 'WEEKLY') setSettings({ ...settings, template_weekly: DEFAULT_WEEKLY });
                        if (selectedTemplateTab === 'URGENT') setSettings({ ...settings, template_urgent: DEFAULT_URGENT });
                        if (selectedTemplateTab === 'DISPATCH') setSettings({ ...settings, template_dispatch: DEFAULT_DISPATCH });
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.68rem', padding: '2px 6px', color: '#dc2626' }}
                    >
                      <RotateCcw size={10} /> Reset Default
                    </button>
                  </div>

                  <textarea
                    rows={12}
                    className="form-input font-mono"
                    style={{ fontSize: '0.78rem', lineHeight: '1.4', resize: 'vertical' }}
                    value={
                      selectedTemplateTab === 'POLITE' ? (settings.template_polite ?? DEFAULT_POLITE) :
                      selectedTemplateTab === 'WEEKLY' ? (settings.template_weekly ?? DEFAULT_WEEKLY) :
                      selectedTemplateTab === 'URGENT' ? (settings.template_urgent ?? DEFAULT_URGENT) :
                      (settings.template_dispatch ?? DEFAULT_DISPATCH)
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (selectedTemplateTab === 'POLITE') setSettings({ ...settings, template_polite: val });
                      if (selectedTemplateTab === 'WEEKLY') setSettings({ ...settings, template_weekly: val });
                      if (selectedTemplateTab === 'URGENT') setSettings({ ...settings, template_urgent: val });
                      if (selectedTemplateTab === 'DISPATCH') setSettings({ ...settings, template_dispatch: val });
                    }}
                  />
                </div>

                {/* Live WhatsApp Green Chat Bubble Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="form-label" style={{ fontWeight: 700, margin: 0, fontSize: '0.76rem', color: '#16a34a' }}>
                    📱 Live Customer WhatsApp Preview
                  </label>
                  <div style={{
                    background: '#dcf8c6',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '0.75rem',
                    lineHeight: '1.45',
                    color: '#111b21',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    height: '245px',
                    overflowY: 'auto',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                  }}>
                    {getRenderedPreview(
                      selectedTemplateTab === 'POLITE' ? (settings.template_polite ?? DEFAULT_POLITE) :
                      selectedTemplateTab === 'WEEKLY' ? (settings.template_weekly ?? DEFAULT_WEEKLY) :
                      selectedTemplateTab === 'URGENT' ? (settings.template_urgent ?? DEFAULT_URGENT) :
                      (settings.template_dispatch ?? DEFAULT_DISPATCH)
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button type="submit" className="btn btn-vyapar-red" style={{ padding: '8px 24px', fontWeight: 800 }} disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : '💾 Save WhatsApp & UPI Configuration'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: RICKSHAW DRIVERS MASTER */}
      {activeTab === 'DRIVERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Add Driver Form */}
          <form onSubmit={handleAddDriver} className="vyapar-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              + Add New Fixed Rickshaw Driver
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1.2fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Driver Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Bhai Auto"
                  className="form-input"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Mobile Number</label>
                <input
                  type="text"
                  placeholder="+91..."
                  className="form-input"
                  value={newDriverMobile}
                  onChange={(e) => setNewDriverMobile(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Vehicle #</label>
                <input
                  type="text"
                  placeholder="GJ-05-..."
                  className="form-input"
                  value={newDriverVehicle}
                  onChange={(e) => setNewDriverVehicle(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Default Rent (₹)</label>
                <input
                  type="number"
                  step="10"
                  className="form-input font-mono"
                  value={newDriverFixedRent}
                  onChange={(e) => setNewDriverFixedRent(Number(e.target.value) || 0)}
                />
              </div>

              <button type="submit" className="btn btn-vyapar-green" disabled={saving}>
                <Plus size={14} /> Add Driver
              </button>
            </div>
          </form>

          {/* Drivers List */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>DRIVER NAME</th>
                  <th>MOBILE NUMBER</th>
                  <th>VEHICLE NUMBER</th>
                  <th>DEFAULT RENT (₹)</th>
                  <th>DEFAULT STATUS</th>
                  <th style={{ textAlign: 'center', width: '140px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d, idx) => (
                  <tr key={d.id} style={{ background: d.is_default === 1 ? '#f0fdf4' : undefined }}>
                    <td>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: '#0f172a' }}>{d.name}</strong>
                        {d.is_personal === 1 && (
                          <span style={{ fontSize: '0.66rem', background: '#eff6ff', color: '#1d4ed8', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>
                            OWN VEHICLE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="font-mono">{d.mobile || '-'}</td>
                    <td className="font-mono">{d.vehicle_no || '-'}</td>
                    <td className="font-mono" style={{ fontWeight: 800, color: '#d32f2f' }}>
                      {formatCurrency(d.default_rent)}
                    </td>
                    <td>
                      {d.is_default === 1 ? (
                        <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Star size={11} fill="#15803d" /> PRIMARY DEFAULT
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Standard</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {d.is_default === 1 ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d' }}>
                          ✓ Active Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                          onClick={() => handleSetDefaultDriver(d.id)}
                        >
                          <Star size={11} /> Set as Default
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DELIVERY VENUES / LOCATIONS MASTER (With Customer Charge & Driver Rent & Google Maps) */}
      {activeTab === 'VENUES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Add / Edit Venue Form */}
          <form onSubmit={handleAddOrUpdateVenue} className="vyapar-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color="#0284c7" />
                {editingVenueId ? '✏️ Edit Delivery Venue / Party Plot' : '+ Add New Delivery Venue / Party Plot (પાર્ટી પ્લોટ ઉમેરો)'}
              </h4>
              {editingVenueId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingVenueId(null);
                    setNewVenueName('');
                    setNewVenueAddress('');
                    setNewVenueLandmark('');
                    setNewVenueGoogleMapLink('');
                    setNewVenueCustomerCharge(0);
                    setNewVenueDriverRent(0);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem' }}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
              Assign fixed Customer Delivery Charge & Rickshaw Driver Rent per Venue. Selecting this venue in billing will automatically add the delivery charge to the customer bill and log the driver rent into Driver Hisab!
            </p>

            {/* Row 1: Venue Name, Area/Landmark, Google Maps Link */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.6fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Venue / Party Plot Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Avsar Party Plot & Lawn"
                  className="form-input"
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Area / Landmark *</label>
                <input
                  type="text"
                  list="surat-areas-list"
                  placeholder="e.g. Sarthana / Varachha / Katargam"
                  className="form-input"
                  value={newVenueLandmark}
                  onChange={(e) => setNewVenueLandmark(e.target.value)}
                />
                <datalist id="surat-areas-list">
                  <option value="Sarthana" />
                  <option value="Varachha" />
                  <option value="Canal Road" />
                  <option value="Yogi Chowk" />
                  <option value="Mota Varachha" />
                  <option value="Katargam" />
                  <option value="Kamrej" />
                  <option value="Dumas Road" />
                </datalist>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Globe size={13} color="#2563eb" /> Google Maps Link (ગૂગલ મેપ લિંક)
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/?q=..."
                  className="form-input font-mono"
                  style={{ fontSize: '0.78rem' }}
                  value={newVenueGoogleMapLink}
                  onChange={(e) => setNewVenueGoogleMapLink(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Customer Charge, Driver Rent, Full Address, Submit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2.2fr auto', gap: '10px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#047857' }}>
                  📦 Customer Charge (₹)
                </label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  placeholder="0"
                  className="form-input font-mono"
                  style={{ fontWeight: 800, color: '#047857', background: '#f0fdf4' }}
                  value={newVenueCustomerCharge}
                  onChange={(e) => setNewVenueCustomerCharge(Number(e.target.value) || 0)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#b91c1c' }}>
                  🛺 Driver Rent (₹)
                </label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  placeholder="0"
                  className="form-input font-mono"
                  style={{ fontWeight: 800, color: '#b91c1c', background: '#fef2f2' }}
                  value={newVenueDriverRent}
                  onChange={(e) => setNewVenueDriverRent(Number(e.target.value) || 0)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Full Delivery Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Near RD Farm, Simada Road, Sarthana Jakat Naka, Surat"
                  className="form-input"
                  value={newVenueAddress}
                  onChange={(e) => setNewVenueAddress(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-vyapar-green" disabled={saving} style={{ fontWeight: 800, padding: '8px 16px' }}>
                {editingVenueId ? 'Update Venue' : '+ Add Venue'}
              </button>
            </div>

            {/* Live Margin Calculation Preview */}
            <div style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'flex', gap: '16px' }}>
              <span>📦 Customer Charged: <strong>₹{newVenueCustomerCharge}</strong></span>
              <span>🛺 Rickshaw Paid: <strong>₹{newVenueDriverRent}</strong></span>
              <span style={{ color: newVenueCustomerCharge >= newVenueDriverRent ? '#15803d' : '#dc2626', fontWeight: 800 }}>
                💰 Matuki Delivery Margin: <strong>{formatCurrency(newVenueCustomerCharge - newVenueDriverRent)}</strong>
              </span>
            </div>
          </form>

          {/* Venues Filter & Search Toolbar */}
          <div style={{
            background: '#ffffff',
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '5px 10px', width: '100%', maxWidth: '320px' }}
                placeholder="Search party plot / venue / address..."
                value={venueSearch}
                onChange={(e) => setVenueSearch(e.target.value)}
              />
            </div>

            {/* Area Filter Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Filter Area:</span>
              {[
                { key: 'ALL', label: 'All Surat' },
                { key: 'Sarthana', label: 'Sarthana' },
                { key: 'Varachha', label: 'Varachha' },
                { key: 'Canal Road', label: 'Canal Road' },
                { key: 'Yogi Chowk', label: 'Yogi Chowk' },
                { key: 'Mota Varachha', label: 'Mota Varachha' },
                { key: 'Katargam', label: 'Katargam' }
              ].map(area => {
                const count = area.key === 'ALL' 
                  ? locations.length 
                  : locations.filter(l => (l.area_landmark || '').toLowerCase().includes(area.key.toLowerCase())).length;
                return (
                  <button
                    key={area.key}
                    type="button"
                    onClick={() => setVenueAreaFilter(area.key)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      borderRadius: '4px',
                      border: `1px solid ${venueAreaFilter === area.key ? '#0284c7' : '#cbd5e1'}`,
                      background: venueAreaFilter === area.key ? '#0284c7' : '#ffffff',
                      color: venueAreaFilter === area.key ? '#ffffff' : '#334155',
                      cursor: 'pointer'
                    }}
                  >
                    {area.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Venues List Table */}
          <div className="table-container" style={{ maxHeight: '520px', overflowY: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>#</th>
                  <th>VENUE / PARTY PLOT NAME</th>
                  <th>AREA / LANDMARK</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>MAP LINK</th>
                  <th style={{ textAlign: 'right', background: '#f0fdf4', color: '#047857' }}>CUSTOMER (₹)</th>
                  <th style={{ textAlign: 'right', background: '#fef2f2', color: '#b91c1c' }}>DRIVER (₹)</th>
                  <th style={{ textAlign: 'right' }}>MARGIN (₹)</th>
                  <th>FULL DELIVERY ADDRESS</th>
                  <th style={{ textAlign: 'center', width: '110px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = locations.filter(loc => {
                    if (venueAreaFilter !== 'ALL' && !(loc.area_landmark || '').toLowerCase().includes(venueAreaFilter.toLowerCase())) {
                      return false;
                    }
                    if (venueSearch) {
                      const s = venueSearch.toLowerCase();
                      const matchName = (loc.venue_name || '').toLowerCase().includes(s);
                      const matchArea = (loc.area_landmark || '').toLowerCase().includes(s);
                      const matchAddr = (loc.address || '').toLowerCase().includes(s);
                      if (!matchName && !matchArea && !matchAddr) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                          No party plots found for the selected filter.
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((loc, idx) => {
                    const custCharge = loc.customer_charge || 0;
                    const drvRent = loc.driver_rent || 0;
                    const margin = custCharge - drvRent;
                    const mapUrl = loc.google_map_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.venue_name + ', ' + (loc.area_landmark || '') + ', Surat')}`;

                    return (
                      <tr key={loc.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong style={{ color: '#0f172a', fontSize: '0.86rem' }}>{loc.venue_name}</strong>
                        </td>
                        <td>
                          <span className="badge badge-amber">{loc.area_landmark || '-'}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              color: '#0284c7',
                              borderColor: '#bae6fd',
                              background: '#f0f9ff',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}
                            title="Open in Google Maps"
                          >
                            <MapPin size={12} color="#0284c7" /> 📍 Map ↗
                          </a>
                        </td>
                        <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: '#047857', background: '#f0fdf4' }}>
                          {formatCurrency(custCharge)}
                        </td>
                        <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: '#b91c1c', background: '#fef2f2' }}>
                          {formatCurrency(drvRent)}
                        </td>
                        <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: margin >= 0 ? '#15803d' : '#dc2626' }}>
                          {formatCurrency(margin)}
                        </td>
                        <td style={{ color: '#334155', fontSize: '0.76rem' }}>{loc.address}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                              onClick={() => handleEditVenue(loc)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 6px', fontSize: '0.72rem', color: '#dc2626' }}
                              onClick={() => handleDeleteVenue(loc.id, loc.venue_name)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* TAB 6: SALES TARGETS & GOALS */}
      {activeTab === 'GOALS' && (
        <form onSubmit={handleSaveGoalsFromSettings} className="vyapar-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="#d97706" /> Sales Targets & Annual Goal Setting
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Define yearly revenue milestones and monthly distribution to keep your sales team motivated
              </p>
            </div>

            {goalsLiveSummary && (
              <div style={{ background: '#ecfdf5', padding: '6px 12px', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '0.76rem', color: '#15803d', fontWeight: 800 }}>
                Live Done: {formatCurrency(goalsLiveSummary.total_achieved)} ({goalsLiveSummary.achieved_percent}%)
              </div>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '150px 1fr auto',
            gap: '14px',
            alignItems: 'flex-end',
            background: '#f8fafc',
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Target Financial Year</label>
              <select
                className="form-select"
                value={goalsYear}
                onChange={(e) => handleGoalYearChange(e.target.value)}
                style={{ fontWeight: 800 }}
              >
                <option value="2025">2025</option>
                <option value="2025-26">2025-26</option>
                <option value="2026">2026</option>
                <option value="2026-27">2026-27</option>
                <option value="2027">2027</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">🎯 Full Year Target Amount (₹)</label>
              <input
                type="number"
                className="form-input font-mono"
                style={{ fontWeight: 900, fontSize: '1.05rem', color: '#2563eb' }}
                value={goalsAnnualTarget}
                onChange={(e) => setGoalsAnnualTarget(Number(e.target.value) || 0)}
                required
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAutoSplitGoals}
              style={{ height: '34px', fontSize: '0.74rem', fontWeight: 800, color: '#059669', borderColor: '#a7f3d0' }}
            >
              <Calculator size={13} /> Auto-Split (÷12)
            </button>
          </div>

          {/* Month Wise Table */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>
                📅 Month-by-Month Goal Matrix
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSyncGoalsFromMonths}
                style={{ fontSize: '0.72rem', color: '#2563eb' }}
              >
                Sum of Months = Annual Target
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px'
            }}>
              {[
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ].map((name, idx) => {
                const mNum = idx + 1;
                const isCurrent = mNum === (new Date().getMonth() + 1);
                return (
                  <div
                    key={mNum}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: isCurrent ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                      background: isCurrent ? '#eff6ff' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: isCurrent ? 900 : 700, color: isCurrent ? '#1e40af' : '#475569' }}>
                        {name} {isCurrent && '★'}
                      </span>
                      <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>Month {mNum}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>₹</span>
                      <input
                        type="number"
                        className="form-input font-mono"
                        style={{ padding: '3px 6px', fontSize: '0.84rem', fontWeight: 700 }}
                        value={goalsMonthlyMap[String(mNum)] || 0}
                        onChange={(e) => handleMonthTargetChange(mNum, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Goal Notes & Milestone Remarks</label>
            <input
              type="text"
              className="form-input"
              value={goalsNotes}
              onChange={(e) => setGoalsNotes(e.target.value)}
              placeholder="e.g. Expand wholesale volume and wedding catering bookings"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
            <button
              type="submit"
              className="btn btn-vyapar-green"
              disabled={saving}
              style={{ fontWeight: 800, padding: '7px 20px' }}
            >
              <Save size={14} /> {saving ? 'Saving...' : 'Save Goals & Targets'}
            </button>
          </div>
        </form>
      )}
      {/* TAB 7: USERS & TEAM MEMBERS */}
      {activeTab === 'USERS' && (
        <div className="vyapar-card" style={{ padding: '20px' }}>
          <UserManagementTab />
        </div>
      )}

      {/* Vasan Master Modal */}
      {isVasanModalOpen && (
        <VasanMasterModal
          isOpen={isVasanModalOpen}
          onClose={() => {
            setIsVasanModalOpen(false);
            if (activeTab === 'VASAN_MASTER') setActiveTab('GENERAL');
          }}
        />
      )}
      {showWAGatewayModal && (
        <WhatsAppGatewayModal
          isOpen={showWAGatewayModal}
          onClose={() => {
            setShowWAGatewayModal(false);
            api.getWhatsAppGatewayStatus().then(res => setWaGatewayStatus((res as any)?.data || res)).catch(() => {});
          }}
          onStatusChange={(connected) => {
            api.getWhatsAppGatewayStatus().then(res => setWaGatewayStatus((res as any)?.data || res)).catch(() => {});
          }}
        />
      )}
    </div>
  );
};
