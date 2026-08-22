import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { Product } from '../../types';
import {
  ShoppingBag,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Share2,
  Sparkles,
  Search,
  Plus,
  Minus,
  Store,
  QrCode,
  DollarSign,
  FileText,
  Sun,
  Moon,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface SelectedItem {
  product_id: number;
  item_name: string;
  unit: string;
  rate: number;
  quantity: number;
  amount: number;
  notes: string;
}

export const CustomerOrderPortal: React.FC<{ outletParam?: string }> = ({ outletParam }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // Form State
  const [outletName, setOutletName] = useState<string>(() => {
    if (outletParam === '2') return 'Outlet 2 - Katargam Branch';
    if (outletParam === 'factory') return 'Main Factory Kitchen';
    return 'Outlet 1 - Sarthana Branch';
  });

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default tomorrow
    return d.toISOString().split('T')[0];
  });
  const [deliverySlot, setDeliverySlot] = useState<'MORNING' | 'EVENING'>('MORNING');
  const [deliveryTime, setDeliveryTime] = useState('08:00 AM');
  const [deliveryVenue, setDeliveryVenue] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState<string>('0');
  const [depositMode, setDepositMode] = useState<'CASH' | 'UPI' | 'COUNTER'>('CASH');
  const [notes, setNotes] = useState('');

  // Selected Items Map: { productId: SelectedItem }
  const [selectedItems, setSelectedItems] = useState<{ [productId: number]: SelectedItem }>({});
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Success State
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      setLoading(true);
      const res = await api.getPublicOnlineMenu();
      const items = (res as any).data?.items || (res as any).items || [];
      const sett = (res as any).data?.settings || (res as any).settings || null;
      setProducts(Array.isArray(items) ? items : []);
      setSettings(sett);
    } catch (err) {
      console.error('Error loading online menu:', err);
    } finally {
      setLoading(false);
    }
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category_name) set.add(p.category_name);
    }
    return Array.from(set);
  }, [products]);

  // Filtered Products (Only available_online = 1)
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'ALL' || p.category_name === selectedCategory;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.code && p.code.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, search]);

  // Handle Qty Change
  const updateItemQty = (prod: Product, delta: number) => {
    setSelectedItems(prev => {
      const existing = prev[prod.id];
      const currentQty = existing ? existing.quantity : 0;
      const newQty = Math.max(0, currentQty + delta);

      const copy = { ...prev };
      if (newQty === 0) {
        delete copy[prod.id];
      } else {
        copy[prod.id] = {
          product_id: prod.id,
          item_name: prod.name,
          unit: prod.unit || 'KG',
          rate: prod.selling_rate || 0,
          quantity: newQty,
          amount: Math.round(newQty * (prod.selling_rate || 0) * 100) / 100,
          notes: existing?.notes || ''
        };
      }
      return copy;
    });
  };

  const setItemExactQty = (prod: Product, val: string) => {
    const num = parseFloat(val) || 0;
    setSelectedItems(prev => {
      const copy = { ...prev };
      if (num <= 0) {
        delete copy[prod.id];
      } else {
        copy[prod.id] = {
          product_id: prod.id,
          item_name: prod.name,
          unit: prod.unit || 'KG',
          rate: prod.selling_rate || 0,
          quantity: num,
          amount: Math.round(num * (prod.selling_rate || 0) * 100) / 100,
          notes: prev[prod.id]?.notes || ''
        };
      }
      return copy;
    });
  };

  // Cart summary
  const itemsList = Object.values(selectedItems);
  const totalItemsCount = itemsList.length;
  const totalWeight = itemsList.reduce((sum, i) => sum + (i.unit === 'KG' || !i.unit ? i.quantity : 0), 0);
  const totalAmount = itemsList.reduce((sum, i) => sum + i.amount, 0);

  // Submit Handler
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Please enter party or caterer name.');
      return;
    }
    if (!customerMobile.trim() || customerMobile.trim().length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (itemsList.length === 0) {
      alert('Please select at least 1 sweet item from the menu.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        outlet_name: outletName,
        customer_name: customerName.trim(),
        customer_mobile: customerMobile.trim(),
        delivery_date: deliveryDate,
        delivery_slot: deliverySlot,
        delivery_time: deliveryTime,
        delivery_venue: deliveryVenue.trim(),
        advance_amount: Number(advanceAmount) || 0,
        deposit_mode: depositMode,
        items: itemsList,
        notes: notes.trim()
      };

      const res = await api.submitPublicOnlineOrder(payload);
      const data = (res as any).data || res;
      setSubmittedOrder({
        ...payload,
        tracking_no: (res as any).tracking_no || `WEB-${data.id || Date.now()}`,
        id: data.id
      });
    } catch (err: any) {
      console.error('Order submission error:', err);
      alert('Error submitting order: ' + (err.message || 'Server error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Share on WhatsApp
  const handleShareWhatsApp = () => {
    if (!submittedOrder) return;
    const itemsText = (submittedOrder.items || []).map((i: any, idx: number) =>
      `${idx + 1}. *${i.item_name}*: ${i.quantity} ${i.unit} (@ ₹${i.rate} = ₹${i.amount})`
    ).join('\n');

    const msg = `🚩 *MATUKI SWEETS* 🚩\n` +
      `*Advance Order Booking Receipt*\n\n` +
      `📌 *Order No*: #${submittedOrder.tracking_no}\n` +
      `🏬 *Branch*: ${submittedOrder.outlet_name}\n` +
      `👤 *Customer / Party*: ${submittedOrder.customer_name}\n` +
      `📞 *Mobile*: ${submittedOrder.customer_mobile}\n` +
      `📅 *Delivery Date*: ${formatDate(submittedOrder.delivery_date)}\n` +
      `⏰ *Time*: ${submittedOrder.delivery_time} (${submittedOrder.delivery_slot === 'MORNING' ? '🌅 Morning' : '🌇 Evening'})\n` +
      (submittedOrder.delivery_venue ? `📍 *Venue*: ${submittedOrder.delivery_venue}\n` : '') +
      `\n🧁 *Ordered Items:*\n${itemsText}\n\n` +
      `💰 *Estimated Total*: ₹${submittedOrder.items.reduce((s: number, i: any) => s + i.amount, 0)}\n` +
      (submittedOrder.advance_amount > 0 ? `💵 *Advance Paid*: ₹${submittedOrder.advance_amount} (${submittedOrder.deposit_mode})\n` : '') +
      (submittedOrder.notes ? `📝 *Notes*: ${submittedOrder.notes}\n\n` : '\n') +
      `_Thank you for choosing ${settings?.business_name || 'Matuki Sweets'}!_ 🙏`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // 1. SUCCESS SCREEN
  if (submittedOrder) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        padding: '24px 16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter, -apple-system, sans-serif'
      }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          border: '2px solid #86efac'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
            color: '#ffffff',
            padding: '28px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#ffffff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
            }}>
              <CheckCircle2 size={40} color="#16a34a" />
            </div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 900 }}>
              🎉 Order Booked Successfully!
            </h1>
            <div style={{ fontSize: '0.86rem', opacity: 0.9 }}>
              Your order is recorded live in Matuki Sweets ERP system.
            </div>
          </div>

          {/* Details Card */}
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid #e2e8f0'
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>Booking Reference</span>
              <span style={{
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '1.05rem',
                color: '#166534',
                background: '#dcfce7',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid #86efac'
              }}>
                #{submittedOrder.tracking_no}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>🏬 Branch:</span>
                <strong style={{ color: '#0f172a' }}>{submittedOrder.outlet_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>👤 Customer / Party:</span>
                <strong style={{ color: '#0f172a' }}>{submittedOrder.customer_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>📞 Mobile:</span>
                <strong style={{ color: '#0f172a' }}>{submittedOrder.customer_mobile}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>📅 Delivery Date & Slot:</span>
                <strong style={{ color: '#1d4ed8' }}>
                  {formatDate(submittedOrder.delivery_date)} ({submittedOrder.delivery_time} • {submittedOrder.delivery_slot === 'MORNING' ? '🌅 Morning' : '🌇 Evening'})
                </strong>
              </div>
              {submittedOrder.delivery_venue && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>📍 Delivery Venue:</span>
                  <strong style={{ color: '#0f172a' }}>{submittedOrder.delivery_venue}</strong>
                </div>
              )}
            </div>

            {/* Items Summary Table */}
            <div style={{ marginTop: '18px', borderTop: '1px dashed #cbd5e1', paddingTop: '14px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>
                🧁 Selected Sweets ({submittedOrder.items?.length || 0}):
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                {submittedOrder.items?.map((itm: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', padding: '4px 0', borderBottom: idx < submittedOrder.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <span>{itm.item_name} <strong>({itm.quantity} {itm.unit})</strong></span>
                    <strong style={{ color: '#15803d' }}>₹{itm.amount}</strong>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1.5px solid #cbd5e1', fontWeight: 900, fontSize: '0.92rem' }}>
                  <span>Estimated Total:</span>
                  <span style={{ color: '#15803d' }}>₹{submittedOrder.items?.reduce((s: number, i: any) => s + i.amount, 0)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '22px' }}>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#25D366',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(37, 211, 102, 0.35)'
                }}
              >
                <Share2 size={18} /> 📲 Share Confirmation on WhatsApp
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubmittedOrder(null);
                  setSelectedItems({});
                  setCustomerName('');
                  setCustomerMobile('');
                  setDeliveryVenue('');
                  setAdvanceAmount('0');
                  setNotes('');
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} /> + Book Another Order
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. MAIN ORDER BOOKING PORTAL
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'Inter, -apple-system, sans-serif',
      paddingBottom: totalItemsCount > 0 ? '100px' : '40px'
    }}>
      {/* Top Navbar */}
      <div style={{
        background: 'linear-gradient(135deg, #d32f2f 0%, #b91c1c 100%)',
        color: '#ffffff',
        padding: '16px 20px',
        boxShadow: '0 4px 12px rgba(211, 47, 47, 0.25)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={22} color="#fbbf24" />
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.3px' }}>
                {settings?.business_name || 'MATUKI SWEETS'}
              </h1>
            </div>
            <div style={{ fontSize: '0.74rem', opacity: 0.9, marginTop: '2px', color: '#fef08a' }}>
              ✨ Online Advance Caterer & Party Booking Portal ({settings?.subtitle || 'Shuddha Ghee & Mawa Sweets'})
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.18)',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <Sparkles size={13} color="#fef08a" />
            <span>LIVE ERP SYNC</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px' }}>
        <form onSubmit={handleSubmitOrder}>
          {/* Section 1: Outlet Selection */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>
              🏬 Select Booking Branch
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setOutletName('Outlet 1 - Sarthana Branch')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: outletName.includes('Sarthana') ? '2px solid #d32f2f' : '1px solid #cbd5e1',
                  background: outletName.includes('Sarthana') ? '#fff1f2' : '#ffffff',
                  color: outletName.includes('Sarthana') ? '#9f1239' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                🏪 Outlet 1 (Sarthana Branch)
              </button>
              <button
                type="button"
                onClick={() => setOutletName('Outlet 2 - Katargam Branch')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: outletName.includes('Katargam') ? '2px solid #d32f2f' : '1px solid #cbd5e1',
                  background: outletName.includes('Katargam') ? '#fff1f2' : '#ffffff',
                  color: outletName.includes('Katargam') ? '#9f1239' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                🏪 Outlet 2 (Katargam Branch)
              </button>
            </div>
          </div>

          {/* Section 2: Customer & Delivery Info */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '0.94rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} color="#d32f2f" /> 1. Customer & Event Information
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  Party / Caterer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vimal Bhai Caterers"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                    fontWeight: 700
                  }}
                />
              </div>
            </div>

            {/* Date & Slot */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  Delivery Date *
                </label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box',
                    fontWeight: 700
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  Time Slot *
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setDeliverySlot('MORNING');
                      setDeliveryTime('08:00 AM');
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: deliverySlot === 'MORNING' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                      background: deliverySlot === 'MORNING' ? '#fef3c7' : '#ffffff',
                      color: deliverySlot === 'MORNING' ? '#92400e' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    🌅 Morning (8:00 AM)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeliverySlot('EVENING');
                      setDeliveryTime('05:00 PM');
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: deliverySlot === 'EVENING' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                      background: deliverySlot === 'EVENING' ? '#dbeafe' : '#ffffff',
                      color: deliverySlot === 'EVENING' ? '#1e40af' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    🌇 Evening (5:00 PM)
                  </button>
                </div>
              </div>
            </div>

            {/* Venue */}
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                Delivery Venue / Function Hall Address
              </label>
              <input
                type="text"
                placeholder="e.g. Patidar Wadi, Katargam or Counter Pickup"
                value={deliveryVenue}
                onChange={(e) => setDeliveryVenue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.86rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Section 3: Sweet Selection (Live Online Items Only) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingBag size={16} color="#d32f2f" /> 2. Select Sweets Menu
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 800 }}>
                {products.length} Items Available
              </span>
            </div>

            {/* Search Bar */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search sweet (e.g. Matho, Kaju Katli, Gulab Jamun)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.86rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  border: selectedCategory === 'ALL' ? '1.5px solid #d32f2f' : '1px solid #cbd5e1',
                  background: selectedCategory === 'ALL' ? '#d32f2f' : '#ffffff',
                  color: selectedCategory === 'ALL' ? '#ffffff' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                All Sweets
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    border: selectedCategory === cat ? '1.5px solid #d32f2f' : '1px solid #cbd5e1',
                    background: selectedCategory === cat ? '#d32f2f' : '#ffffff',
                    color: selectedCategory === cat ? '#ffffff' : '#475569',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sweet Items Cards Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                <div>Loading sweets menu...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.86rem' }}>
                No sweet items found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredProducts.map(prod => {
                  const selected = selectedItems[prod.id];
                  const qty = selected ? selected.quantity : 0;
                  return (
                    <div
                      key={prod.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: qty > 0 ? '2px solid #16a34a' : '1px solid #e2e8f0',
                        background: qty > 0 ? '#f0fdf4' : '#ffffff',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ flex: 1, marginRight: '10px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                          {prod.name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                          <strong style={{ color: '#15803d', fontFamily: 'monospace' }}>₹{prod.selling_rate}</strong> / {prod.unit || 'KG'}
                          {prod.category_name && <span style={{ marginLeft: '6px', opacity: 0.8 }}>• {prod.category_name}</span>}
                        </div>
                      </div>

                      {/* Quantity Controller */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {qty > 0 && (
                          <button
                            type="button"
                            onClick={() => updateItemQty(prod, -1)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              border: '1.5px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Minus size={14} />
                          </button>
                        )}

                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="0"
                          value={qty > 0 ? qty : ''}
                          onChange={(e) => setItemExactQty(prod, e.target.value)}
                          style={{
                            width: '48px',
                            padding: '4px',
                            borderRadius: '8px',
                            border: qty > 0 ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                            textAlign: 'center',
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            fontFamily: 'monospace',
                            color: qty > 0 ? '#166534' : '#64748b',
                            background: qty > 0 ? '#dcfce7' : '#ffffff'
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => updateItemQty(prod, 1)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#16a34a',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: Advance & Notes */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '0.94rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={16} color="#d32f2f" /> 3. Advance Payment & Special Instructions
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  Advance Deposit Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    color: '#15803d',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  Payment Mode
                </label>
                <select
                  value={depositMode}
                  onChange={(e) => setDepositMode(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  <option value="CASH">💵 Cash</option>
                  <option value="UPI">📱 UPI / Google Pay / PhonePe</option>
                  <option value="COUNTER">🏪 Pay at Outlet Counter</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                Special Packing / Chef Instructions
              </label>
              <input
                type="text"
                placeholder="e.g. Pack in Milton utensils, low sugar, hot packaging..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.86rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || totalItemsCount === 0}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              background: totalItemsCount > 0 ? '#16a34a' : '#94a3b8',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '1.05rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: totalItemsCount > 0 ? 'pointer' : 'not-allowed',
              boxShadow: totalItemsCount > 0 ? '0 4px 12px rgba(22, 163, 74, 0.35)' : 'none'
            }}
          >
            {submitting ? 'Submitting Order...' : `🚀 Confirm Booking (${totalItemsCount} Items - ₹${totalAmount})`}
          </button>
        </form>
      </div>

      {/* Floating Bottom Cart Bar */}
      {totalItemsCount > 0 && !submittedOrder && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 99,
          boxShadow: '0 -4px 15px rgba(0,0,0,0.15)'
        }}>
          <div style={{ maxWidth: '720px', width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>
                {totalItemsCount} Items • ~{totalWeight} KG Total
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#4ade80' }}>
                ₹{totalAmount}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={submitting}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: '#16a34a',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Submit Order <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
