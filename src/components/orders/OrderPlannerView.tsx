import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Search, 
  Plus, 
  Filter, 
  Printer, 
  Download, 
  ChefHat, 
  MapPin, 
  ShoppingBag, 
  CheckCircle2, 
  Edit, 
  Trash2, 
  Sun, 
  Moon, 
  Sparkles,
  RefreshCw,
  Layers,
  ChevronLeft,
  ChevronRight,
  QrCode
} from 'lucide-react';
import { api } from '../../api/client';
import { AdvanceOrder, KitchenItemRequirement, BusinessSettings, DailyOrdersSummary, User } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportUtils';
import { canEditModule, canDeleteModule } from '../../utils/permissionUtils';
import { AdvanceOrderModal } from './AdvanceOrderModal';
import { ChefProductionPrintModal } from './ChefProductionPrintModal';
import { InvoicePrintModal } from '../sales/InvoicePrintModal';
import { WhatsAppInboxTab } from '../advance-orders/WhatsAppInboxTab';
import { OrderQRModal } from './OrderQRModal';
import { KitchenShortageModal } from './KitchenShortageModal';
import { VoiceSearchButton } from '../common/VoiceSearchButton';

interface OrderPlannerViewProps {
  settings?: BusinessSettings | null;
  onConvertToSale: (order: AdvanceOrder) => void;
  currentUser?: User | null;
}

export const OrderPlannerView: React.FC<OrderPlannerViewProps> = ({
  settings,
  onConvertToSale,
  currentUser
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const canEdit = canEditModule(currentUser, 'advance_orders');
  const canDelete = canDeleteModule(currentUser, 'advance_orders');

  const [activeTab, setActiveTab] = useState<'PLANNER' | 'WHATSAPP_INBOX'>('PLANNER');
  const [pendingWhatsAppCount, setPendingWhatsAppCount] = useState<number>(0);

  const [orders, setOrders] = useState<AdvanceOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Print Modals State
  const [isChefPrintOpen, setIsChefPrintOpen] = useState<boolean>(false);
  const [chefSummary, setChefSummary] = useState<DailyOrdersSummary | null>(null);
  const [printBilledSaleId, setPrintBilledSaleId] = useState<number | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [isKitchenShortageOpen, setIsKitchenShortageOpen] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<AdvanceOrder | null>(null);

  const fetchPendingWhatsAppCount = async () => {
    try {
      const res = await api.getWhatsAppInboundOrders({ status: 'PENDING' });
      const list = Array.isArray(res) ? res : ((res as any).data || []);
      setPendingWhatsAppCount(list.length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPendingWhatsAppCount();
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        deliveryDate: selectedDate,
        search: search
      };
      if (selectedSlot !== 'ALL') params.slot = selectedSlot;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const res = await api.getAdvanceOrders(params);
      const data = (res as any).data || res;
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching advance orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedDate, selectedSlot, selectedStatus, search]);

  const handleOpenAdd = () => {
    setEditingOrder(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ord: AdvanceOrder) => {
    setEditingOrder(ord);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this advance order?')) return;
    // 1. Instant 0ms Optimistic UI Removal:
    setOrders(prev => prev.filter(o => o.id !== id));
    try {
      await api.deleteAdvanceOrder(id);
      fetchOrders();
    } catch (err: any) {
      console.error('Error deleting advance order:', err);
      alert('Error deleting order: ' + (err.message || 'Server error'));
      fetchOrders();
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    // 1. Instant 0ms Optimistic Status Change:
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus as any } : o));
    try {
      await api.updateAdvanceOrderStatus(id, newStatus);
      fetchOrders();
    } catch (err: any) {
      console.error('Error updating order status:', err);
      fetchOrders();
    }
  };

  // Change Date by offset days
  const handleDateShift = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Kitchen Aggregation for the current filtered list
  const kitchenAggregate: KitchenItemRequirement[] = React.useMemo(() => {
    const map: { [key: string]: KitchenItemRequirement } = {};
    for (const ord of orders) {
      if (ord.status === 'CANCELLED') continue;
      for (const it of (ord.items || [])) {
        const key = `${it.item_name}__${it.unit}`;
        if (!map[key]) {
          map[key] = {
            product_id: it.product_id || undefined,
            item_name: it.item_name,
            unit: it.unit || 'KG',
            total_qty: 0,
            order_count: 0,
            caterers: []
          };
        }
        map[key].total_qty += Number(it.quantity) || 0;
        map[key].order_count += 1;
        if (!map[key].caterers.includes(ord.customer_name)) {
          map[key].caterers.push(ord.customer_name);
        }
      }
    }
    return Object.values(map).sort((a, b) => b.total_qty - a.total_qty);
  }, [orders]);

  // Totals
  const totalOrdersCount = orders.length;
  const totalWeightKg = orders.reduce((sum, o) => o.status !== 'CANCELLED' ? sum + (Number(o.total_weight_kg) || 0) : sum, 0);
  const totalAmount = orders.reduce((sum, o) => o.status !== 'CANCELLED' ? sum + (Number(o.total_amount) || 0) : sum, 0);
  const totalAdvance = orders.reduce((sum, o) => sum + (Number(o.advance_paid) || 0), 0);

  // CSV Export
  const handleExportCSV = () => {
    const rows = orders.map(o => ({
      'Order No': o.order_no,
      'Delivery Date': o.delivery_date,
      'Slot': o.delivery_slot,
      'Time': o.delivery_time,
      'Caterer / Customer': o.customer_name,
      'Mobile': o.customer_mobile,
      'Venue': o.delivery_venue,
      'Items': (o.items || []).map(i => `${i.item_name} (${i.quantity} ${i.unit})`).join('; '),
      'Total Weight (KG)': o.total_weight_kg,
      'Total Amount (INR)': o.total_amount,
      'Advance Paid (INR)': o.advance_paid,
      'Status': o.status,
      'Converted Invoice': o.converted_invoice_no || ''
    }));
    exportToCSV(rows, `${settings?.business_name || 'MATUKI_SWEETS'}_ADVANCE_ORDERS_${selectedDate}.csv`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top 2 Major Tabs: Planner vs Inbound Orders Inbox */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e2e8f0',
        gap: '4px',
        background: '#ffffff',
        padding: '8px 16px 0 16px',
        borderRadius: '12px 12px 0 0'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('PLANNER')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px 10px 0 0',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'PLANNER' ? '#d32f2f' : '#f1f5f9',
            color: activeTab === 'PLANNER' ? '#ffffff' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'PLANNER' ? '0 -2px 10px rgba(211, 47, 47, 0.2)' : 'none'
          }}
        >
          <span>📅</span> 1. Daily Orders Planner & Kitchen Summary
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('WHATSAPP_INBOX')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px 10px 0 0',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'WHATSAPP_INBOX' ? 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)' : '#f1f5f9',
            color: activeTab === 'WHATSAPP_INBOX' ? '#ffffff' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'WHATSAPP_INBOX' ? '0 -2px 10px rgba(7, 94, 84, 0.2)' : 'none'
          }}
        >
          <span>📲</span> 2. Outlet 1 & 2 Inbound Orders Inbox (WhatsApp & QR)
          {pendingWhatsAppCount > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.74rem',
              fontWeight: 900
            }}>
              {pendingWhatsAppCount} NEW
            </span>
          )}
        </button>
      </div>

      {activeTab === 'WHATSAPP_INBOX' ? (
        <WhatsAppInboxTab onOrderApproved={() => { fetchOrders(); fetchPendingWhatsAppCount(); }} />
      ) : (
        <>
          {/* Top Header & Action Controls */}
          <div className="vyapar-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 900 }}>
                    CATERER ADVANCE ORDERS
                  </span>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                    Advance Caterer Orders & Production Planner
                  </h2>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                  Wholesale caterer order booking, time slots (Morning / Evening), kitchen production list, and 1-click billing
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsKitchenShortageOpen(true)}
              style={{
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#eff6ff',
                border: '1.5px solid #3b82f6',
                color: '#1d4ed8'
              }}
              title="Automated Kitchen Shortage & BOM Ingredient Explosion Calculator"
            >
              <ChefHat size={14} color="#2563eb" /> 🥣 Shortage Calculator
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsQRModalOpen(true)}
              style={{
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f8fafc',
                border: '1.5px solid #94a3b8',
                color: '#1d4ed8'
              }}
              title="Get Counter Standee QR Code & Online Order Links"
            >
              <QrCode size={15} color="#2563eb" /> 📲 Online QR & Links
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                try {
                  const res = await api.getDailyOrdersSummary(selectedDate);
                  setChefSummary((res as any).data || res);
                  setIsChefPrintOpen(true);
                } catch (e) {
                  console.error(e);
                }
              }}
              style={{
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#fffbeb',
                border: '1.5px solid #f59e0b',
                color: '#92400e'
              }}
              title="1-Click A4 Kitchen Production Sheet Print for Halwai/Chef in Hindi"
            >
              <ChefHat size={16} color="#d97706" /> 🖨️ Print Chef Sheet (Hindi)
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleExportCSV}
              style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Download size={14} /> Excel / CSV Export
            </button>

            {canEdit && (
              <button
                className="btn btn-vyapar-red"
                onClick={handleOpenAdd}
                style={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px' }}
              >
                <Plus size={16} /> + Book Advance Order
              </button>
            )}
          </div>
        </div>

        {/* Date Selector & Filters Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '14px',
          padding: '10px 14px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {/* Date Picker with Prev / Next Days */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleDateShift(-1)}
              title="Previous Day"
              style={{ padding: '4px 8px' }}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}>
              <Calendar size={16} color="#2563eb" />
              <input
                type="date"
                style={{ border: 'none', outline: 'none', fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleDateShift(1)}
              title="Next Day"
              style={{ padding: '4px 8px' }}
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              className={`btn btn-sm ${selectedDate === todayStr ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.76rem', fontWeight: 800, padding: '4px 10px' }}
              onClick={() => setSelectedDate(todayStr)}
            >
              Today
            </button>
          </div>

          {/* Slot & Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '28px', paddingRight: '10px', fontSize: '0.8rem', width: '200px', height: '32px' }}
                placeholder="Search Caterer / Venue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Slot Filter */}
            <select
              className="form-select"
              style={{ fontSize: '0.8rem', height: '32px', fontWeight: 700, padding: '4px 8px' }}
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
            >
              <option value="ALL">⚡ All Slots</option>
              <option value="MORNING">🌅 Morning Slot (8:00 AM)</option>
              <option value="EVENING">🌇 Evening Slot (5:00 PM)</option>
            </select>

            {/* Status Filter */}
            <select
              className="form-select"
              style={{ fontSize: '0.8rem', height: '32px', fontWeight: 700, padding: '4px 8px' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">🕒 PENDING</option>
              <option value="IN_PRODUCTION">🥣 IN PRODUCTION</option>
              <option value="READY">✅ READY</option>
              <option value="DISPATCHED">🚚 DISPATCHED</option>
              <option value="BILLED">🧾 BILLED</option>
              <option value="CANCELLED">❌ CANCELLED</option>
            </select>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchOrders}
              title="Refresh Orders"
              style={{ padding: '4px 8px', height: '32px' }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* 4 Metrics Summary Counters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
          marginTop: '12px'
        }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 12px', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>Total Orders</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e3a8a', marginTop: '2px' }}>{totalOrdersCount}</div>
          </div>

          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 12px', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>Total Sweets Weight</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#b91c1c', marginTop: '2px' }}>{totalWeightKg} KG</div>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Total Order Value</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>{formatCurrency(totalAmount)}</div>
          </div>

          <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '10px 12px', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase' }}>Advance Received</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#a16207', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>{formatCurrency(totalAdvance)}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN ORDERS TABLE VIEW */}
      {/* ========================================================================= */}
      <div className="vyapar-card" style={{ padding: '16px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Loading advance orders...
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '50px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📦</div>
              <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>
                No Advance Orders for this Date
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 16px 0' }}>
                Book a wholesale caterer order for {formatDate(selectedDate)}
              </p>
              <button className="btn btn-vyapar-red" onClick={handleOpenAdd}>
                <Plus size={16} /> + Book Advance Order
              </button>
            </div>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>Order #</th>
                    <th style={{ width: '100px' }}>Slot / Time</th>
                    <th>Caterer / Party Name</th>
                    <th>Ordered Sweets</th>
                    <th style={{ width: '130px' }}>Delivery Venue</th>
                    <th style={{ textAlign: 'right', width: '85px' }}>Weight</th>
                    <th style={{ textAlign: 'right', width: '100px' }}>Grand Total</th>
                    <th style={{ textAlign: 'right', width: '90px' }}>Advance</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>Status</th>
                    <th style={{ textAlign: 'center', width: '140px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => {
                    const isBilled = ord.status === 'BILLED';
                    return (
                      <tr key={ord.id}>
                        <td className="font-mono" style={{ fontWeight: 800, color: '#d32f2f' }}>
                          {ord.order_no}
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {ord.delivery_slot === 'MORNING' ? (
                              <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                                <Sun size={13} /> Morning
                              </span>
                            ) : (
                              <span style={{ color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                                <Moon size={13} /> Evening
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{ord.delivery_time}</span>
                        </td>

                        <td>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{ord.customer_name}</strong>
                          {ord.customer_mobile && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>📞 {ord.customer_mobile}</div>
                          )}
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {ord.items?.map((it, i) => (
                              <div key={i} style={{ fontSize: '0.78rem' }}>
                                <strong style={{ color: '#1e293b' }}>{it.item_name}:</strong> {it.quantity} {it.unit}
                              </div>
                            ))}
                          </div>
                          {ord.notes && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', marginTop: '3px' }}>
                              📝 {ord.notes}
                            </div>
                          )}
                        </td>

                        <td>
                          {ord.delivery_venue ? (
                            <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <MapPin size={12} color="#dc2626" /> {ord.delivery_venue}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>Pickup</span>
                          )}
                        </td>

                        <td className="font-mono" style={{ textAlign: 'right', fontWeight: 900, color: '#d32f2f' }}>
                          {ord.total_weight_kg} KG
                        </td>

                        <td className="font-mono" style={{ textAlign: 'right', fontWeight: 900 }}>
                          {formatCurrency(ord.total_amount)}
                        </td>

                        <td className="font-mono" style={{ textAlign: 'right', color: ord.advance_paid > 0 ? '#16a34a' : '#64748b', fontWeight: 700 }}>
                          {formatCurrency(ord.advance_paid)}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <select
                            className="form-select"
                            disabled={!canEdit}
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 4px',
                              fontWeight: 800,
                              background: isBilled ? '#dcfce7' : ord.status === 'READY' ? '#e0e7ff' : '#ffffff',
                              color: isBilled ? '#15803d' : '#0f172a',
                              borderColor: isBilled ? '#86efac' : '#cbd5e1',
                              opacity: !canEdit ? 0.75 : 1,
                              cursor: !canEdit ? 'not-allowed' : 'pointer'
                            }}
                            value={ord.status}
                            onChange={(e) => handleUpdateStatus(ord.id, e.target.value)}
                          >
                            <option value="PENDING">🕒 PENDING</option>
                            <option value="IN_PRODUCTION">🥣 IN PROD</option>
                            <option value="READY">✅ READY</option>
                            <option value="DISPATCHED">🚚 DISPATCH</option>
                            <option value="BILLED">🧾 BILLED</option>
                            <option value="CANCELLED">❌ CANCEL</option>
                          </select>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                            {/* ⚡ 1-Click Convert to Sale Bill vs Billed Safe View */}
                            {!isBilled ? (
                              canEdit && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  style={{
                                    padding: '3px 8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    background: '#16a34a',
                                    borderColor: '#16a34a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  onClick={() => onConvertToSale(ord)}
                                  title="Convert to Sale Bill"
                                >
                                  <ShoppingBag size={12} /> Convert
                                </button>
                              )
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 800, background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', border: '1px solid #86efac' }}>
                                  #{ord.converted_invoice_no || 'BILLED'}
                                </span>
                                {ord.converted_sale_id && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '2px 5px', fontSize: '0.7rem', fontWeight: 700 }}
                                    onClick={() => setPrintBilledSaleId(ord.converted_sale_id!)}
                                    title={`Print Invoice #${ord.converted_invoice_no}`}
                                  >
                                    <Printer size={11} color="#2563eb" /> Print
                                  </button>
                                )}
                              </div>
                            )}

                            {!isBilled && (
                              <>
                                {canEdit && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '3px 6px', fontSize: '0.72rem' }}
                                    onClick={() => handleOpenEdit(ord)}
                                    title="Edit Order"
                                  >
                                    <Edit size={12} />
                                  </button>
                                )}

                                {canDelete && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '3px 6px', fontSize: '0.72rem', color: '#dc2626' }}
                                    onClick={() => handleDelete(ord.id)}
                                    title="Delete Order"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}

      {/* Advance Order Modal */}
      {isModalOpen && (
        <AdvanceOrderModal
          isOpen={isModalOpen}
          order={editingOrder}
          defaultDate={selectedDate}
          defaultSlot={selectedSlot === 'EVENING' ? 'EVENING' : 'MORNING'}
          onClose={() => {
            setIsModalOpen(false);
            setEditingOrder(null);
            fetchOrders();
          }}
          onSuccess={(savedOrder) => {
            setIsModalOpen(false);
            setEditingOrder(null);
            if (savedOrder && savedOrder.delivery_date && savedOrder.delivery_date !== selectedDate) {
              setSelectedDate(savedOrder.delivery_date);
            } else {
              fetchOrders();
            }
          }}
        />
      )}

      {/* Chef Production Sheet 1-Click Print Modal */}
      {isChefPrintOpen && chefSummary && (
        <ChefProductionPrintModal
          isOpen={isChefPrintOpen}
          summary={chefSummary}
          settings={settings}
          onClose={() => setIsChefPrintOpen(false)}
        />
      )}

      {/* Invoice Print Modal for Billed Orders */}
      {printBilledSaleId && (
        <InvoicePrintModal
          isOpen={!!printBilledSaleId}
          saleId={printBilledSaleId}
          onClose={() => setPrintBilledSaleId(null)}
          autoPrint={false}
        />
      )}

      {/* Online Order QR Code & Counter Standee Modal */}
      {isQRModalOpen && (
        <OrderQRModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
        />
      )}

      {/* Kitchen Shortage & BOM Ingredient Explosion Modal */}
      {isKitchenShortageOpen && (
        <KitchenShortageModal
          isOpen={isKitchenShortageOpen}
          onClose={() => setIsKitchenShortageOpen(false)}
        />
      )}
    </div>
  );
};
