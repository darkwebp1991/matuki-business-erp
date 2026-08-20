import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChefHat, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Printer, 
  RefreshCw, 
  ArrowRight, 
  Package, 
  ShoppingCart,
  Boxes,
  Sparkles
} from 'lucide-react';
import { api } from '../../api/client';
import { formatDate } from '../../utils/formatters';

interface KitchenShortageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewBatch?: (recipeId?: number, quantity?: number) => void;
}

export const KitchenShortageModal: React.FC<KitchenShortageModalProps> = ({
  isOpen,
  onClose,
  onOpenNewBatch
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const [targetDate, setTargetDate] = useState<string>(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'SWEETS' | 'RAW_MATERIALS'>('SWEETS');

  const fetchCalculatorData = async () => {
    try {
      setLoading(true);
      const res = await api.getKitchenShortageCalculator(targetDate, selectedSlot);
      setData(res);
    } catch (err) {
      console.error('Error fetching kitchen shortage data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalculatorData();
  }, [targetDate, selectedSlot]);

  const sweets = data?.sweets_production_needed || [];
  const rawMaterials = data?.raw_materials_required || [];

  const totalSweetsOrderedKg = sweets.reduce((sum: number, s: any) => sum + (Number(s.total_ordered_qty) || 0), 0);
  const totalSweetsShortageKg = sweets.reduce((sum: number, s: any) => sum + (Number(s.shortage_qty) || 0), 0);
  const totalRmShortageCount = rawMaterials.filter((rm: any) => rm.status === 'SHORTAGE').length;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Store Requisition & Production Shortage — Matuki Sweets</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #0f172a; font-size: 13px; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
          .header h2 { margin: 0; font-size: 18px; font-weight: 800; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 12px; }
          th { background: #f1f5f9; font-weight: 800; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .badge-red { color: #dc2626; font-weight: bold; }
          .badge-green { color: #16a34a; font-weight: bold; }
          .signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 10px; border-top: 1px dashed #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>શ્રી માતુકી સ્વીટ્સ — દૈનિક ઉત્પાદન અને કાચો માલ ઇશ્યૂ પર્ચી</h2>
          <div>KITCHEN PRODUCTION SHORTAGE & STORE ROOM REQUISITION SHEET</div>
        </div>

        <div class="meta">
          <div><strong>તારીખ (Target Date):</strong> ${formatDate(targetDate)} (${selectedSlot})</div>
          <div><strong>કુલ ઓર્ડર (Orders):</strong> ${data?.total_orders_count || 0} Caterers</div>
          <div><strong>ઉત્પાદન જથ્થો:</strong> ${totalSweetsShortageKg} KG Needed</div>
        </div>

        <h3>૧. મીઠાઈ ઉત્પાદન જરૂરિયાત (Sweets to Produce)</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>મીઠાઈનું નામ (Sweet Item)</th>
              <th class="text-right">ઓર્ડર (Ordered)</th>
              <th class="text-right">હાજર સ્ટોક (In Stock)</th>
              <th class="text-right">બનાવવાની ઘટ (Make Needed)</th>
              <th>કેટરર્સ ગ્રાહક (Parties)</th>
            </tr>
          </thead>
          <tbody>
            ${sweets.map((s: any, idx: number) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td><strong>${s.item_name}</strong></td>
                <td class="text-right">${s.total_ordered_qty} ${s.unit}</td>
                <td class="text-right">${s.current_stock} ${s.unit}</td>
                <td class="text-right ${s.shortage_qty > 0 ? 'badge-red' : 'badge-green'}">
                  ${s.shortage_qty > 0 ? `🚨 ${s.shortage_qty} ${s.unit}` : '✅ READY (0)'}
                </td>
                <td style="font-size: 11px;">${(s.caterers || []).join(', ') || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3>૨. સ્ટોરમાંથી આપવાનો કાચો માલ (Store Room Material Requisition)</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>કાચો માલ (Raw Material Ingredient)</th>
              <th class="text-right">જરૂરી વજન (Required)</th>
              <th class="text-right">સ્ટોર સ્ટોક (Store Stock)</th>
              <th class="text-right">ખરીદી ઘટ (Shortage)</th>
              <th class="text-center">ઇશ્યૂ સ્થિતિ</th>
            </tr>
          </thead>
          <tbody>
            ${rawMaterials.length === 0 ? `
              <tr><td colspan="6" class="text-center" style="color: #64748b;">કોઈ વધારાના કાચા માલની જરૂર નથી અથવા રેસીપી સેટ કરેલ નથી.</td></tr>
            ` : rawMaterials.map((rm: any, idx: number) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td><strong>${rm.name}</strong></td>
                <td class="text-right">${rm.total_required_qty} ${rm.unit}</td>
                <td class="text-right">${rm.current_stock} ${rm.unit}</td>
                <td class="text-right ${rm.net_shortage > 0 ? 'badge-red' : 'badge-green'}">
                  ${rm.net_shortage > 0 ? `🚨 ${rm.net_shortage} ${rm.unit}` : '0 (OK)'}
                </td>
                <td class="text-center">[ &nbsp; ] ઇશ્યૂ કરેલ</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="signatures">
          <div>(સ્ટોર કીપર સહી)</div>
          <div>(હેડ કારીગર / હલવાઈ સહી)</div>
          <div>(મેનેજર સહી)</div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '960px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 18px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#3b82f6', color: '#ffffff', padding: '5px', borderRadius: '6px', display: 'flex' }}>
              <ChefHat size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                Automated Kitchen Shortage & BOM Ingredient Explosion Calculator
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#94a3b8' }}>
                Compares booked catering advance orders vs. finished stock & calculates store ingredients required
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#ffffff', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>

        {/* Filter Controls & KPIs Toolbar */}
        <div style={{
          padding: '8px 18px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {/* Date & Slot Picker */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px' }}>
              <Calendar size={13} color="#64748b" />
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '0.78rem', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'flex', gap: '3px' }}>
              {['ALL', 'MORNING', 'EVENING'].map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: selectedSlot === slot ? '#2563eb' : '#cbd5e1',
                    background: selectedSlot === slot ? '#2563eb' : '#ffffff',
                    color: selectedSlot === slot ? '#ffffff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {slot === 'ALL' ? '🕒 All Day' : slot === 'MORNING' ? '🌅 Morning' : '🌇 Evening'}
                </button>
              ))}
            </div>

            <button
              onClick={fetchCalculatorData}
              className="btn btn-secondary btn-sm"
              style={{ padding: '3px 6px' }}
              title="Refresh Data"
            >
              <RefreshCw size={12} className={loading ? 'spin' : ''} />
            </button>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.78rem' }}>
            <span>
              Orders Booked: <strong style={{ color: '#0f172a' }}>{data?.total_orders_count || 0} Orders</strong>
            </span>
            <span>
              Total Ordered: <strong style={{ color: '#2563eb' }}>{totalSweetsOrderedKg} KG</strong>
            </span>
            <span>
              Production Needed: <strong style={{ color: totalSweetsShortageKg > 0 ? '#dc2626' : '#16a34a' }}>{totalSweetsShortageKg} KG</strong>
            </span>
            {totalRmShortageCount > 0 && (
              <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                🚨 {totalRmShortageCount} Raw Materials Short
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff', padding: '0 18px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('SWEETS')}
            style={{
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: 800,
              border: 'none',
              borderBottom: activeTab === 'SWEETS' ? '2.5px solid #2563eb' : '2.5px solid transparent',
              background: 'transparent',
              color: activeTab === 'SWEETS' ? '#2563eb' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Boxes size={14} /> 1. Sweets Production Shortage ({sweets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RAW_MATERIALS')}
            style={{
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: 800,
              border: 'none',
              borderBottom: activeTab === 'RAW_MATERIALS' ? '2.5px solid #2563eb' : '2.5px solid transparent',
              background: 'transparent',
              color: activeTab === 'RAW_MATERIALS' ? '#2563eb' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Package size={14} /> 2. Store Room Ingredient Explosion ({rawMaterials.length})
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', background: '#f8fafc' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ marginBottom: '10px', color: '#2563eb' }} />
              <div>Calculating live kitchen shortages & exploding recipe BOM ingredients...</div>
            </div>
          ) : activeTab === 'SWEETS' ? (
            /* TAB 1: SWEETS PRODUCTION TABLE */
            <div>
              {sweets.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', background: '#fff', borderRadius: '8px', color: '#94a3b8' }}>
                  No advance catering orders found for {formatDate(targetDate)}.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '7px 10px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>Sweet Item</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>Total Booked</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>In-Stock (Finished)</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: '0.74rem', fontWeight: 800, color: '#dc2626' }}>Production Shortage</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>Recipe Status</th>
                      <th style={{ padding: '7px 10px', textAlign: 'center', fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sweets.map((s: any, idx: number) => {
                      const isShortage = s.shortage_qty > 0;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>{s.item_name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              Caterers: {(s.caterers || []).join(', ') || '-'}
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '0.84rem', fontWeight: 800 }}>
                            {s.total_ordered_qty} {s.unit}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '0.84rem', fontWeight: 700, color: '#64748b' }}>
                            {s.current_stock} {s.unit}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            {isShortage ? (
                              <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 900 }}>
                                🚨 MAKE {s.shortage_qty} {s.unit}
                              </span>
                            ) : (
                              <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 800 }}>
                                ✅ IN STOCK (0 Needed)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: '0.74rem' }}>
                            {s.has_recipe ? (
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>
                                ✓ Recipe Linked: {s.recipe_name}
                              </span>
                            ) : (
                              <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                                ⚠️ No Recipe (Manual Entry)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {isShortage && s.has_recipe && onOpenNewBatch && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenNewBatch(s.recipe_id, s.shortage_qty);
                                }}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '0.72rem', padding: '3px 8px', fontWeight: 800 }}
                              >
                                ⚡ Start Batch
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            /* TAB 2: STORE ROOM RAW MATERIALS EXPLOSION TABLE */
            <div>
              {rawMaterials.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', background: '#fff', borderRadius: '8px', color: '#94a3b8' }}>
                  No raw material shortages detected, or all finished items are already in stock.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '7px 10px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>Raw Material</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>Total Needed for Today</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>Store Room Stock</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: '0.74rem', fontWeight: 800, color: '#dc2626' }}>Purchase Shortage</th>
                      <th style={{ padding: '7px 10px', textAlign: 'center', fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>Store Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawMaterials.map((rm: any, idx: number) => {
                      const isShort = rm.net_shortage > 0;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                            {rm.name}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '0.84rem', fontWeight: 800 }}>
                            {rm.total_required_qty} {rm.unit}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '0.84rem', fontWeight: 700, color: '#64748b' }}>
                            {rm.current_stock} {rm.unit}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            {isShort ? (
                              <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 900 }}>
                                🚨 BUY {rm.net_shortage} {rm.unit}
                              </span>
                            ) : (
                              <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.76rem' }}>
                                0 (Sufficient)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {isShort ? (
                              <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>
                                ⚠️ Purchase Required
                              </span>
                            ) : (
                              <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>
                                ✓ In Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '10px 18px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
            Auto-calculated across all active catering advance bookings for {formatDate(targetDate)}
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '6px 14px',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Printer size={13} /> 🖨️ Print Store Requisition Sheet
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 14px', fontWeight: 700 }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
