import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { WhatsAppInboundOrder } from '../../types';
import { WhatsAppPasteModal } from './WhatsAppPasteModal';
import { OrderQRModal } from '../orders/OrderQRModal';
import { formatCurrency } from '../../utils/formatters';
import { QrCode, Globe, Sparkles } from 'lucide-react';

interface WhatsAppInboxTabProps {
  onOrderApproved?: () => void;
}

export const WhatsAppInboxTab: React.FC<WhatsAppInboxTabProps> = ({ onOrderApproved }) => {
  const [orders, setOrders] = useState<WhatsAppInboundOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [outletFilter, setOutletFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [actionInProgressId, setActionInProgressId] = useState<number | null>(null);
  const [messageToast, setMessageToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchInboundOrders = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (outletFilter !== 'ALL') params.outlet_name = outletFilter;
      const res = await api.getWhatsAppInboundOrders(params);
      const list = Array.isArray(res) ? res : ((res as any).data || []);
      setOrders(list);
    } catch (err) {
      console.error('Error fetching WhatsApp orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboundOrders();
  }, [statusFilter, outletFilter]);

  const handleApprove = async (id: number) => {
    setActionInProgressId(id);
    setMessageToast(null);
    try {
      const res = await api.approveWhatsAppOrder(id, 'Admin');
      const advNo = (res as any)?.advance_order?.order_no || (res as any)?.data?.advance_order?.order_no || '';
      setMessageToast({ type: 'success', text: `✅ Order successfully approved and converted into Advance Order #${advNo}!` });
      fetchInboundOrders();
      if (onOrderApproved) onOrderApproved();
    } catch (err: any) {
      setMessageToast({ type: 'error', text: err.message || 'Error approving order' });
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm('Are you sure you want to reject/archive this order?')) return;
    setActionInProgressId(id);
    try {
      await api.rejectWhatsAppOrder(id, 'Rejected by operator');
      fetchInboundOrders();
    } catch (err: any) {
      alert(err.message || 'Error rejecting order');
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.parsed_customer_name && o.parsed_customer_name.toLowerCase().includes(q)) ||
      (o.parsed_customer_mobile && o.parsed_customer_mobile.includes(q)) ||
      (o.outlet_name && o.outlet_name.toLowerCase().includes(q)) ||
      (o.raw_message && o.raw_message.toLowerCase().includes(q)) ||
      (o.parsed_delivery_venue && o.parsed_delivery_venue.toLowerCase().includes(q))
    );
  });

  const pendingCount = orders.filter(o => o.status === 'PENDING').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner & Action Buttons */}
      <div style={{
        background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)',
        borderRadius: '12px',
        padding: '16px 20px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 14px rgba(7, 94, 84, 0.2)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📲</span> Outlet 1 & 2 Inbound Orders Inbox (WhatsApp & Online QR)
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', opacity: 0.9 }}>
            Inbound orders from Sarthana & Katargam WhatsApp groups + Customer QR self-orders — 1-Click Approve to Kitchen Production Planner!
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsQRModalOpen(true)}
            style={{
              padding: '10px 16px',
              background: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              color: '#075e54',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <QrCode size={16} color="#075e54" /> 📲 Online QR & Links
          </button>

          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            style={{
              padding: '10px 16px',
              background: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              color: '#075e54',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📋</span> + Paste WhatsApp Order
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {messageToast && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: messageToast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${messageToast.type === 'success' ? '#86efac' : '#f87171'}`,
          color: messageToast.type === 'success' ? '#166534' : '#991b1b',
          fontWeight: 700,
          fontSize: '0.88rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{messageToast.text}</span>
          <button onClick={() => setMessageToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '10px',
        padding: '12px 16px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Status Pills */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: statusFilter === 'PENDING' ? '#f59e0b' : '#f1f5f9',
              color: statusFilter === 'PENDING' ? '#ffffff' : '#475569'
            }}
          >
            🟡 Pending Approval {pendingCount > 0 && `(${pendingCount})`}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('APPROVED')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: statusFilter === 'APPROVED' ? '#16a34a' : '#f1f5f9',
              color: statusFilter === 'APPROVED' ? '#ffffff' : '#475569'
            }}
          >
            🟢 Approved
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('REJECTED')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: statusFilter === 'REJECTED' ? '#dc2626' : '#f1f5f9',
              color: statusFilter === 'REJECTED' ? '#ffffff' : '#475569'
            }}
          >
            ⚪ Rejected
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: statusFilter === 'ALL' ? '#334155' : '#f1f5f9',
              color: statusFilter === 'ALL' ? '#ffffff' : '#475569'
            }}
          >
            All Orders
          </button>
        </div>

        {/* Outlet filter and search */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={outletFilter}
            onChange={(e) => setOutletFilter(e.target.value)}
            className="form-select"
            style={{ padding: '6px 10px', fontSize: '0.82rem', fontWeight: 600, borderColor: '#cbd5e1', borderRadius: '6px' }}
          >
            <option value="ALL">All Branches</option>
            <option value="Outlet 1 - Sarthana Branch">🏬 Outlet 1 - Sarthana Branch</option>
            <option value="Outlet 2 - Katargam Branch">🏬 Outlet 2 - Katargam Branch</option>
          </select>

          <input
            type="text"
            className="form-input"
            style={{ width: '220px', padding: '6px 10px', fontSize: '0.82rem', borderColor: '#cbd5e1', borderRadius: '6px' }}
            placeholder="Search party / mobile / item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>⏳ Loading inbound orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '50px 20px',
          textAlign: 'center',
          border: '1.5px dashed #cbd5e1'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📲</div>
          <h4 style={{ margin: 0, color: '#334155', fontWeight: 800 }}>No Inbound Orders Found</h4>
          <p style={{ margin: '6px 0 16px', color: '#64748b', fontSize: '0.88rem' }}>
            Paste order messages received in your Sarthana or Katargam WhatsApp groups using the button above.
          </p>
          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            style={{ padding: '8px 18px', background: '#075e54', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >
            📋 + Paste WhatsApp Order
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredOrders.map(order => {
            const isPending = order.status === 'PENDING';
            const isApproved = order.status === 'APPROVED';
            const totalQty = (order.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
            const totalAmt = (order.items || []).reduce((sum, it) => sum + (Number(it.total_amount) || 0), 0);

            return (
              <div
                key={order.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: isPending ? '1.5px solid #f59e0b' : isApproved ? '1px solid #86efac' : '1px solid #e2e8f0',
                  boxShadow: isPending ? '0 4px 14px rgba(245, 158, 11, 0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                  overflow: 'hidden'
                }}
              >
                {/* Order Top Bar */}
                <div style={{
                  padding: '10px 16px',
                  background: isPending ? '#fffbeb' : isApproved ? '#f0fdf4' : '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      background: '#075e54',
                      color: '#ffffff'
                    }}>
                      🏬 {order.outlet_name || 'Outlet 1 - Sarthana Branch'}
                    </span>

                    {(order.raw_message?.includes('Web/QR') || order.notes?.includes('Online') || order.notes?.includes('Portal')) && (
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        background: '#dbeafe',
                        color: '#1e40af',
                        border: '1px solid #93c5fd',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Globe size={13} /> 🌐 CUSTOMER QR ORDER
                      </span>
                    )}

                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                      🕒 {new Date(order.received_at).toLocaleDateString()} {new Date(order.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isPending && (
                      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 800, background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' }}>
                        🟡 PENDING APPROVAL
                      </span>
                    )}
                    {isApproved && (
                      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 800, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
                        🟢 APPROVED (Advance Order #{order.converted_order_no})
                      </span>
                    )}
                    {order.status === 'REJECTED' && (
                      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 800, background: '#fee2e2', color: '#991b1b' }}>
                        ⚪ REJECTED
                      </span>
                    )}
                  </div>
                </div>

                {/* Main 2-Column Split: WhatsApp Raw vs Decoded ERP Order */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', borderBottom: '1px solid #f1f5f9' }}>
                  {/* Left Column: WhatsApp Message Bubble */}
                  <div style={{ padding: '14px 16px', background: '#fafafa', borderRight: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#075e54', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>💬</span> Original WhatsApp Message:
                    </div>
                    <div style={{
                      background: '#dcf8c6',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '0.82rem',
                      lineHeight: '1.5',
                      color: '#111b21',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                    }}>
                      {order.raw_message}
                    </div>
                  </div>

                  {/* Right Column: Parsed Details */}
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>👤 Customer / Party Name</div>
                        <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                          {order.parsed_customer_name || 'Walk-in'}
                        </div>
                        {order.parsed_customer_mobile && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📞 {order.parsed_customer_mobile}</div>
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>📅 Delivery Date & Slot</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                          {order.parsed_delivery_date}
                        </div>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: order.parsed_delivery_slot === 'MORNING_1' || order.parsed_delivery_slot === 'MORNING' ? '#b45309' : '#4338ca' }}>
                          {order.parsed_delivery_slot === 'MORNING_1' || order.parsed_delivery_slot === 'MORNING' ? '🌅 Morning Slot' : '🌇 Evening Slot'}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>💰 Advance Paid</div>
                        <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#15803d' }}>
                          {formatCurrency(order.parsed_advance_amount)}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Mode: {order.parsed_deposit_mode}
                        </div>
                      </div>
                    </div>

                    {order.parsed_delivery_venue && (
                      <div style={{ fontSize: '0.78rem', color: '#475569', background: '#f8fafc', padding: '5px 8px', borderRadius: '6px' }}>
                        📍 <strong>Venue:</strong> {order.parsed_delivery_venue}
                      </div>
                    )}

                    {/* Sweet Items List */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                        🧁 Ordered Sweets ({order.items?.length || 0} Items | Total: {totalQty} KG)
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                            <th style={{ padding: '4px 6px' }}>Item Name</th>
                            <th style={{ padding: '4px 6px', textAlign: 'center' }}>Weight / QTY</th>
                            <th style={{ padding: '4px 6px', textAlign: 'right' }}>Rate</th>
                            <th style={{ padding: '4px 6px', textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(order.items || []).map((it, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '4px 6px', fontWeight: 700, color: '#0f172a' }}>{it.item_name}</td>
                              <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 800, color: '#047857', fontFamily: 'monospace' }}>
                                {it.quantity} {it.unit}
                              </td>
                              <td style={{ padding: '4px 6px', textAlign: 'right', color: '#64748b', fontFamily: 'monospace' }}>
                                {it.rate > 0 ? `₹${it.rate}` : '-'}
                              </td>
                              <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                                {it.total_amount > 0 ? formatCurrency(it.total_amount) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div style={{
                  padding: '8px 16px',
                  background: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Est. Total: <strong>{formatCurrency(totalAmt)}</strong> | Advance Deposit: <strong style={{ color: '#15803d' }}>{formatCurrency(order.parsed_advance_amount)}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {isPending && (
                      <>
                        <button
                          type="button"
                          disabled={actionInProgressId === order.id}
                          onClick={() => handleReject(order.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#fee2e2',
                            border: '1px solid #f87171',
                            color: '#991b1b',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                        >
                          ❌ Reject
                        </button>

                        <button
                          type="button"
                          disabled={actionInProgressId === order.id}
                          onClick={() => handleApprove(order.id)}
                          style={{
                            padding: '7px 18px',
                            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                            border: 'none',
                            color: '#ffffff',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '0.86rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>✅</span> {actionInProgressId === order.id ? 'Approving...' : '1-Click Approve & Convert'}
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <div style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✨</span> Converted to Advance Order & synced with Kitchen Production Planner!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Paste Modal */}
      <WhatsAppPasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onOrderCreated={() => fetchInboundOrders()}
      />

      {/* Online Order QR Modal */}
      {isQRModalOpen && (
        <OrderQRModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
        />
      )}
    </div>
  );
};
