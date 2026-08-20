import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Sun, 
  Moon, 
  ChefHat, 
  MapPin, 
  Plus, 
  CheckCircle2, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  ShoppingBag,
  Printer
} from 'lucide-react';
import { api } from '../../api/client';
import { AdvanceOrder, DailyOrdersSummary, BusinessSettings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AdvanceOrderModal } from '../orders/AdvanceOrderModal';
import { ChefProductionPrintModal } from '../orders/ChefProductionPrintModal';
import { InvoicePrintModal } from '../sales/InvoicePrintModal';
import { KitchenShortageModal } from '../orders/KitchenShortageModal';

interface DashboardOrderWidgetProps {
  settings?: BusinessSettings | null;
  onConvertToSale: (order: AdvanceOrder) => void;
  onNavigateToPlanner: () => void;
}

export const DashboardOrderWidget: React.FC<DashboardOrderWidgetProps> = ({
  settings,
  onConvertToSale,
  onNavigateToPlanner
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [summaryData, setSummaryData] = useState<DailyOrdersSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Print Modals
  const [isChefPrintOpen, setIsChefPrintOpen] = useState<boolean>(false);
  const [isKitchenShortageOpen, setIsKitchenShortageOpen] = useState<boolean>(false);
  const [printBilledSaleId, setPrintBilledSaleId] = useState<number | null>(null);

  // Accordion open/close states
  const [isMorningOpen, setIsMorningOpen] = useState<boolean>(true);
  const [isEveningOpen, setIsEveningOpen] = useState<boolean>(true);

  // Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<AdvanceOrder | null>(null);
  const [modalDefaultSlot, setModalDefaultSlot] = useState<'MORNING' | 'EVENING' | 'ALL_DAY'>('MORNING');

  const fetchDailySummary = async (dateToFetch: string) => {
    try {
      setLoading(true);
      const res = await api.getDailyOrdersSummary(dateToFetch);
      const data = (res as any).data || res;
      setSummaryData(data);
    } catch (err) {
      console.error('Error loading daily orders summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailySummary(selectedDate);
  }, [selectedDate]);

  const handleOpenAddOrder = (slot: 'MORNING' | 'EVENING' = 'MORNING') => {
    setEditingOrder(null);
    setModalDefaultSlot(slot);
    setIsOrderModalOpen(true);
  };

  const handleOpenEditOrder = (order: AdvanceOrder) => {
    setEditingOrder(order);
    setIsOrderModalOpen(true);
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!window.confirm('Are you sure you want to delete this advance order?')) return;
    try {
      await api.deleteAdvanceOrder(orderId);
      fetchDailySummary(selectedDate);
    } catch (err) {
      console.error('Error deleting order:', err);
    }
  };

  const morning = summaryData?.morning;
  const evening = summaryData?.evening;
  const totalOrders = summaryData?.total_orders_count || 0;
  const totalWeight = summaryData?.total_day_weight_kg || 0;
  const totalAmount = summaryData?.total_day_amount || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Top Header Card with Day Switcher */}
      <div className="vyapar-card" style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 900 }}>
                PRODUCTION MATRIX
              </span>
              <h3 style={{ fontSize: '0.94rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                Advance Orders & Kitchen Production Schedule
              </h3>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Morning & evening caterer wholesale orders, aggregated kitchen requirements, and 1-click billing
            </p>
          </div>

          {/* Quick Date Selector Tabs: Today, Tomorrow, Custom Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${selectedDate === todayStr ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '0.76rem',
                fontWeight: 800,
                padding: '4px 10px',
                background: selectedDate === todayStr ? '#2563eb' : '#ffffff',
                borderColor: selectedDate === todayStr ? '#2563eb' : '#cbd5e1'
              }}
              onClick={() => setSelectedDate(todayStr)}
            >
              📅 Today ({formatDate(todayStr)})
            </button>

            <button
              className={`btn btn-sm ${selectedDate === tomorrowStr ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '0.76rem',
                fontWeight: 800,
                padding: '4px 10px',
                background: selectedDate === tomorrowStr ? '#2563eb' : '#ffffff',
                borderColor: selectedDate === tomorrowStr ? '#2563eb' : '#cbd5e1'
              }}
              onClick={() => setSelectedDate(tomorrowStr)}
            >
              🚀 Tomorrow ({formatDate(tomorrowStr)})
            </button>

            <input
              type="date"
              className="form-input"
              style={{ fontSize: '0.76rem', padding: '3px 6px', height: '28px', width: '130px' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />

            <button
              className="btn btn-vyapar-red btn-sm"
              style={{ fontSize: '0.76rem', fontWeight: 800, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => handleOpenAddOrder('MORNING')}
            >
              <Plus size={13} /> + Book Order
            </button>
          </div>
        </div>

        {/* Day Stat Summary Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '8px',
          padding: '6px 10px',
          background: '#f1f5f9',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          fontSize: '0.76rem',
          flexWrap: 'wrap',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>
              Date: <strong style={{ color: '#0f172a' }}>{formatDate(selectedDate)}</strong>
            </span>
            <span>
              Orders: <strong style={{ color: '#2563eb' }}>{totalOrders} Caterers</strong>
            </span>
            <span>
              Total Weight: <strong style={{ color: '#d32f2f' }}>{totalWeight} KG</strong>
            </span>
            <span>
              Est. Value: <strong style={{ color: '#16a34a', fontFamily: 'var(--font-mono)' }}>{formatCurrency(totalAmount)}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsKitchenShortageOpen(true)}
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '3px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: '#eff6ff',
                border: '1px solid #3b82f6',
                color: '#1d4ed8',
                borderRadius: '4px'
              }}
              title="Automated Kitchen Shortage & BOM Ingredient Explosion Calculator"
            >
              <ChefHat size={13} color="#2563eb" /> 🥣 Shortage Calculator
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsChefPrintOpen(true)}
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '3px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: '#fffbeb',
                border: '1px solid #f59e0b',
                color: '#92400e',
                borderRadius: '4px'
              }}
              title="Print Kitchen Production Sheet for Chefs / Halwai in Hindi"
            >
              <ChefHat size={13} color="#d97706" /> 🖨️ Print Chef Sheet (Hindi)
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={onNavigateToPlanner}
              style={{ fontSize: '0.74rem', fontWeight: 700, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <Calendar size={12} color="#2563eb" /> Full Month Planner
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
          Loading orders...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          
          {/* ========================================================================= */}
          {/* 1. MORNING SLOT ACCORDION */}
          {/* ========================================================================= */}
          <div style={{
            border: '1.5px solid #fde68a',
            borderRadius: '8px',
            background: '#ffffff',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            {/* Slot Header Bar */}
            <div
              style={{
                padding: '7px 10px',
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                borderBottom: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
              onClick={() => setIsMorningOpen(!isMorningOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ background: '#f59e0b', color: '#ffffff', padding: '3px 6px', borderRadius: '4px', display: 'flex' }}>
                  <Sun size={14} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 900, color: '#92400e' }}>
                      🌅 Morning Slot (6:00 AM - 12:00 PM)
                    </h4>
                    <span style={{ background: '#f59e0b', color: '#ffffff', fontSize: '0.68rem', padding: '1px 5px', borderRadius: '8px', fontWeight: 900 }}>
                      {morning?.orders_count || 0} Orders
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 700 }}>
                    Weight: {morning?.total_weight_kg || 0} KG | Value: {formatCurrency(morning?.total_amount || 0)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.7rem', padding: '2px 6px', fontWeight: 800, background: '#ffffff' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAddOrder('MORNING');
                  }}
                >
                  <Plus size={11} /> + Morning Order
                </button>
                {isMorningOpen ? <ChevronUp size={15} color="#92400e" /> : <ChevronDown size={15} color="#92400e" />}
              </div>
            </div>

            {isMorningOpen && (
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#fffdfa' }}>
                {/* Kitchen Summary Aggregate Pills */}
                {morning?.kitchen_summary && morning.kitchen_summary.length > 0 && (
                  <div style={{ background: '#fef3c7', padding: '6px 8px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <ChefHat size={12} color="#b45309" />
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#92400e', textTransform: 'uppercase' }}>
                        Morning Kitchen Production Totals:
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {morning.kitchen_summary.map((k, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #f59e0b',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#92400e'
                          }}
                        >
                          🥣 {k.item_name}: <span style={{ color: '#d97706', fontSize: '0.76rem' }}>{k.total_qty} {k.unit}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Orders List */}
                {(!morning?.orders || morning.orders.length === 0) ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                    🌅 No morning orders booked for this date.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {morning.orders.map((ord) => renderOrderCard(ord, 'MORNING'))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 2. EVENING SLOT ACCORDION */}
          {/* ========================================================================= */}
          <div style={{
            border: '1.5px solid #c7d2fe',
            borderRadius: '8px',
            background: '#ffffff',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            {/* Slot Header Bar */}
            <div
              style={{
                padding: '7px 10px',
                background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                borderBottom: '1px solid #c7d2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
              onClick={() => setIsEveningOpen(!isEveningOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ background: '#4f46e5', color: '#ffffff', padding: '3px 6px', borderRadius: '4px', display: 'flex' }}>
                  <Moon size={14} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 900, color: '#3730a3' }}>
                      🌇 Evening Slot (12:00 PM - 9:00 PM)
                    </h4>
                    <span style={{ background: '#4f46e5', color: '#ffffff', fontSize: '0.68rem', padding: '1px 5px', borderRadius: '8px', fontWeight: 900 }}>
                      {evening?.orders_count || 0} Orders
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#4338ca', fontWeight: 700 }}>
                    Weight: {evening?.total_weight_kg || 0} KG | Value: {formatCurrency(evening?.total_amount || 0)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.7rem', padding: '2px 6px', fontWeight: 800, background: '#ffffff' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAddOrder('EVENING');
                  }}
                >
                  <Plus size={11} /> + Evening Order
                </button>
                {isEveningOpen ? <ChevronUp size={15} color="#3730a3" /> : <ChevronDown size={15} color="#3730a3" />}
              </div>
            </div>

            {isEveningOpen && (
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#fafbff' }}>
                {/* Kitchen Summary Aggregate Pills */}
                {evening?.kitchen_summary && evening.kitchen_summary.length > 0 && (
                  <div style={{ background: '#e0e7ff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #c7d2fe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <ChefHat size={12} color="#3730a3" />
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#3730a3', textTransform: 'uppercase' }}>
                        Evening Kitchen Production Totals:
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {evening.kitchen_summary.map((k, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #6366f1',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#3730a3'
                          }}
                        >
                          🥣 {k.item_name}: <span style={{ color: '#4f46e5', fontSize: '0.76rem' }}>{k.total_qty} {k.unit}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Orders List */}
                {(!evening?.orders || evening.orders.length === 0) ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                    🌇 No evening orders booked for this date.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {evening.orders.map((ord) => renderOrderCard(ord, 'EVENING'))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advance Order Modal */}
      {isOrderModalOpen && (
        <AdvanceOrderModal
          isOpen={isOrderModalOpen}
          order={editingOrder}
          defaultDate={selectedDate}
          defaultSlot={modalDefaultSlot}
          onClose={() => {
            setIsOrderModalOpen(false);
            setEditingOrder(null);
          }}
          onSuccess={() => {
            fetchDailySummary(selectedDate);
          }}
        />
      )}

      {/* Chef Production Sheet 1-Click Print Modal */}
      {isChefPrintOpen && (
        <ChefProductionPrintModal
          isOpen={isChefPrintOpen}
          summary={summaryData}
          settings={settings}
          onClose={() => setIsChefPrintOpen(false)}
        />
      )}

      {/* Invoice Print Modal */}
      {printBilledSaleId && (
        <InvoicePrintModal
          isOpen={!!printBilledSaleId}
          saleId={printBilledSaleId}
          onClose={() => setPrintBilledSaleId(null)}
          autoPrint={false}
        />
      )}

      {/* Kitchen Shortage & Raw Material Explosion Modal */}
      {isKitchenShortageOpen && (
        <KitchenShortageModal
          isOpen={isKitchenShortageOpen}
          onClose={() => setIsKitchenShortageOpen(false)}
        />
      )}
    </div>
  );

  // Helper to render individual Caterer Order Card (Compact & High Density)
  function renderOrderCard(ord: AdvanceOrder, slotType: 'MORNING' | 'EVENING') {
    const isBilled = ord.status === 'BILLED';
    const isReady = ord.status === 'READY';
    const isInProd = ord.status === 'IN_PRODUCTION';

    let statusBadgeColor = '#64748b';
    let statusBadgeBg = '#f1f5f9';
    let statusText = '🕒 PENDING';

    if (isBilled) {
      statusBadgeColor = '#15803d';
      statusBadgeBg = '#dcfce7';
      statusText = `🧾 BILLED (#${ord.converted_invoice_no || 'BILLED'})`;
    } else if (ord.status === 'DISPATCHED') {
      statusBadgeColor = '#0369a1';
      statusBadgeBg = '#e0f2fe';
      statusText = '🚚 DISPATCHED';
    } else if (isReady) {
      statusBadgeColor = '#15803d';
      statusBadgeBg = '#dcfce7';
      statusText = '✅ READY';
    } else if (isInProd) {
      statusBadgeColor = '#b45309';
      statusBadgeBg = '#fef3c7';
      statusText = '🥣 IN PROD';
    }

    return (
      <div
        key={ord.id}
        style={{
          border: isBilled ? '1.5px solid #86efac' : '1px solid #e2e8f0',
          borderRadius: '6px',
          background: '#ffffff',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}
      >
        {/* Top Line: Order #, Caterer Name, Status & Delivery Time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                #{ord.order_no}
              </span>
              <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>
                {ord.customer_name}
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Clock size={11} color={slotType === 'MORNING' ? '#d97706' : '#4f46e5'} /> {ord.delivery_time}
              </span>
              {ord.delivery_venue && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#334155', fontWeight: 700 }}>
                  <MapPin size={11} color="#dc2626" /> {ord.delivery_venue}
                </span>
              )}
            </div>
          </div>

          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '1px 6px',
            borderRadius: '10px',
            background: statusBadgeBg,
            color: statusBadgeColor,
            border: `1px solid ${statusBadgeColor}40`
          }}>
            {statusText}
          </span>
        </div>

        {/* Ordered Items Table / List */}
        <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {ord.items?.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>
                  • {it.item_name}
                </span>
                <span style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                  {it.quantity} {it.unit}
                </span>
              </div>
            ))}
          </div>

          {ord.notes && (
            <div style={{ marginTop: '4px', paddingTop: '2px', borderTop: '1px dashed #cbd5e1', fontSize: '0.68rem', color: '#64748b', fontStyle: 'italic' }}>
              Notes: {ord.notes}
            </div>
          )}
        </div>

        {/* Bottom Line: Total Weight, Grand Total, and Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem' }}>
            <span>
              Weight: <strong style={{ color: '#d32f2f' }}>{ord.total_weight_kg} KG</strong>
            </span>
            <span>
              Total: <strong style={{ color: '#0f172a', fontFamily: 'var(--font-mono)' }}>{formatCurrency(ord.total_amount)}</strong>
            </span>
            {ord.advance_paid > 0 && (
              <span style={{ color: '#16a34a', fontWeight: 700 }}>
                (Adv: {formatCurrency(ord.advance_paid)})
              </span>
            )}
          </div>

          {/* Action Buttons: 1-Click Convert to Sale Bill, Edit, Delete */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {!isBilled && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 5px', fontSize: '0.7rem' }}
                  title="Edit Order"
                  onClick={() => handleOpenEditOrder(ord)}
                >
                  <Edit size={11} />
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 5px', fontSize: '0.7rem', color: '#dc2626' }}
                  title="Delete Order"
                  onClick={() => handleDeleteOrder(ord.id)}
                >
                  <Trash2 size={11} />
                </button>
              </>
            )}

            {/* ⚡ 1-Click Convert to Sale Bill Button vs Billed View */}
            {!isBilled ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  background: '#16a34a',
                  borderColor: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)'
                }}
                onClick={() => onConvertToSale(ord)}
                title="Convert this advance booking into a Sale Invoice"
              >
                <ShoppingBag size={12} /> Convert to Bill
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  fontSize: '0.7rem',
                  color: '#15803d',
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <CheckCircle2 size={11} /> Billed #{ord.converted_invoice_no || 'BILLED'}
                </span>
                {ord.converted_sale_id && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{
                      padding: '2px 5px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1'
                    }}
                    onClick={() => setPrintBilledSaleId(ord.converted_sale_id!)}
                    title={`Print Invoice #${ord.converted_invoice_no}`}
                  >
                    <Printer size={11} color="#2563eb" /> Print
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
};
