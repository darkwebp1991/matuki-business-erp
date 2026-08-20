import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  X, 
  Send, 
  Printer, 
  Copy, 
  Check, 
  Phone, 
  MapPin, 
  Package, 
  DollarSign, 
  Truck, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Layers,
  ChevronRight,
  Share2
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface DriverTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSaleId?: number | null;
  initialDate?: string;
}

export const DriverTripModal: React.FC<DriverTripModalProps> = ({
  isOpen,
  onClose,
  initialSaleId,
  initialDate
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedDriverKey, setSelectedDriverKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sendingWhatsApp, setSendingWhatsApp] = useState<boolean>(false);
  const [copiedStopId, setCopiedStopId] = useState<number | null>(null);
  const [copiedFullSheet, setCopiedFullSheet] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const loadTrips = async () => {
    try {
      setLoading(true);
      const data = await api.getDriverTrips(selectedDate);
      setTrips(Array.isArray(data) ? data : []);
      if (data && data.length > 0) {
        if (!selectedDriverKey || !data.some((d: any) => d.driver_key === selectedDriverKey)) {
          setSelectedDriverKey(data[0].driver_key);
        }
      } else {
        setSelectedDriverKey('');
      }
    } catch (err: any) {
      console.error('Failed to load driver trips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTrips();
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const currentTrip = trips.find(t => t.driver_key === selectedDriverKey);

  // Send single stop to driver WhatsApp
  const handleSendSingleStop = async (saleId: number, stopNumber: number) => {
    try {
      setSendingWhatsApp(true);
      setStatusMessage('');
      const res = await api.sendDriverSingleStopWhatsApp(saleId);
      setStatusMessage(`✅ Stop #${stopNumber} dispatched to Driver (${res.driver_name || res.driver_mobile}) on WhatsApp!`);
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to send stop WhatsApp');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  // Send full trip sheet to driver WhatsApp
  const handleSendFullTripSheet = async () => {
    if (!currentTrip) return;
    try {
      setSendingWhatsApp(true);
      setStatusMessage('');
      const res = await api.sendDriverTripSheetWhatsApp(currentTrip.driver_name, selectedDate, currentTrip.driver_mobile);
      setStatusMessage(`🎉 Full Trip Sheet (${currentTrip.total_stops} Stops) sent to ${currentTrip.driver_name} on WhatsApp!`);
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to send trip sheet WhatsApp');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  // Copy single stop text
  const handleCopySingleStop = async (saleId: number) => {
    try {
      const res = await api.getDriverSingleMessage(saleId);
      if (res?.message) {
        await navigator.clipboard.writeText(res.message);
        setCopiedStopId(saleId);
        setTimeout(() => setCopiedStopId(null), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Copy full trip sheet text
  const handleCopyFullTripSheet = async () => {
    if (!currentTrip) return;
    try {
      const res = await api.getDriverTripSheetMessage(currentTrip.driver_name, selectedDate);
      if (res?.message) {
        await navigator.clipboard.writeText(res.message);
        setCopiedFullSheet(true);
        setTimeout(() => setCopiedFullSheet(false), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" style={{ padding: '10px' }}>
      <div className="modal-content" style={{ maxWidth: '960px', width: '98%', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '14px 20px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#d97706', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Truck size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, letterSpacing: '0.3px' }}>
                🛺 Rickshaw Driver Trip Sheet & WhatsApp Dispatch (રવાનગી ચિઠ્ઠી)
              </h2>
              <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Multi-Stop Delivery Route, Vasan Checklist & COD Cash Collection for Rickshaw Drivers
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: '#334155',
                border: '1px solid #475569',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            />
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div style={{
            background: '#dcfce7',
            borderBottom: '1px solid #86efac',
            color: '#15803d',
            padding: '8px 16px',
            fontSize: '0.82rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Main Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#f8fafc' }}>
          
          {/* Left Sidebar: Drivers List */}
          <div style={{
            width: '260px',
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                🛵 DRIVERS ON ROUTE ({trips.length})
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                  Loading trips...
                </div>
              ) : trips.length === 0 ? (
                <div style={{ padding: '30px 14px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                  No deliveries or driver assignments found for {formatDate(selectedDate)}.
                </div>
              ) : (
                trips.map(t => {
                  const isSelected = t.driver_key === selectedDriverKey;
                  return (
                    <div
                      key={t.driver_key}
                      onClick={() => setSelectedDriverKey(t.driver_key)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: isSelected ? '#eff6ff' : 'transparent',
                        border: isSelected ? '1.5px solid #3b82f6' : '1px solid transparent',
                        cursor: 'pointer',
                        marginBottom: '4px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.86rem', color: isSelected ? '#1e40af' : '#1e293b' }}>
                          {t.driver_name}
                        </div>
                        <span style={{
                          background: isSelected ? '#3b82f6' : '#e2e8f0',
                          color: isSelected ? '#ffffff' : '#475569',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '10px'
                        }}>
                          {t.total_stops} Stops
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.72rem', marginTop: '3px' }}>
                        <Phone size={11} />
                        <span>{t.driver_mobile || 'No Mobile'}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginTop: '6px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                        <span style={{ color: '#059669', fontWeight: 800 }}>
                          COD: {formatCurrency(t.total_due_amount)}
                        </span>
                        <span style={{ color: '#d97706', fontWeight: 700 }}>
                          Rent: {formatCurrency(t.total_rickshaw_rent)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Main Panel: Selected Trip Stops Details */}
          {currentTrip ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '16px' }}>
              
              {/* Trip Summary Top Banner */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '14px 16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                        {currentTrip.driver_name}
                      </h3>
                      {currentTrip.driver_mobile && (
                        <a 
                          href={`tel:${currentTrip.driver_mobile}`} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            textDecoration: 'none'
                          }}
                        >
                          <Phone size={12} /> {currentTrip.driver_mobile}
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                      📅 Date: <strong>{formatDate(selectedDate)}</strong> • Total Deliveries: <strong>{currentTrip.total_stops} Party Orders</strong>
                    </div>
                  </div>

                  {/* Primary Trip Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleSendFullTripSheet}
                      disabled={sendingWhatsApp || !currentTrip.driver_mobile}
                      className="btn btn-sm"
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px'
                      }}
                      title="Send full trip route with all stops to driver WhatsApp"
                    >
                      <Send size={14} />
                      <span>{sendingWhatsApp ? 'Sending...' : '📲 Send Trip Sheet to Driver'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyFullTripSheet}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedFullSheet ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                      <span>{copiedFullSheet ? 'Copied!' : 'Copy Sheet'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrint}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Printer size={14} />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                {/* KPI Stat Pills */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '8px',
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>TOTAL STOPS</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>{currentTrip.total_stops} Orders</div>
                  </div>

                  <div style={{ background: '#ecfdf5', padding: '6px 10px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.68rem', color: '#047857', fontWeight: 700 }}>COD TO COLLECT</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#065f46' }}>{formatCurrency(currentTrip.total_due_amount)}</div>
                  </div>

                  <div style={{ background: '#fef3c7', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 700 }}>TOTAL RENT</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#92400e' }}>{formatCurrency(currentTrip.total_rickshaw_rent)}</div>
                  </div>

                  <div style={{ background: '#eff6ff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '0.68rem', color: '#1e40af', fontWeight: 700 }}>VASAN LOADED</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e3a8a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {Object.entries(currentTrip.vasan_summary_map).map(([t, q]) => `${q} ${t}`).join(', ') || 'None'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Stops List */}
              <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#334155', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                📋 Delivery Stops Breakdown ({currentTrip.stops.length})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentTrip.stops.map((stop: any, idx: number) => {
                  const isDue = stop.due_amount > 0;
                  const isCopied = copiedStopId === stop.sale_id;

                  return (
                    <div
                      key={stop.sale_id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      {/* Stop Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            background: '#3b82f6',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            padding: '2px 8px',
                            borderRadius: '6px'
                          }}>
                            STOP #{idx + 1}
                          </span>
                          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                            {stop.customer_name}
                          </strong>
                          <span style={{ fontSize: '0.76rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                            ({stop.invoice_no})
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: stop.trip_type === 'ONE_WAY' ? '#cffafe' : '#dbeafe',
                            color: stop.trip_type === 'ONE_WAY' ? '#0e7490' : '#1d4ed8',
                            border: `1px solid ${stop.trip_type === 'ONE_WAY' ? '#a5f3fc' : '#bfdbfe'}`
                          }}>
                            {stop.trip_type === 'ONE_WAY' ? '➡️ One Way' : '🔄 Round Trip'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.76rem', color: '#475569', flexWrap: 'wrap' }}>
                          {stop.customer_mobile && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} color="#059669" />
                              <strong style={{ color: '#0f172a' }}>{stop.customer_mobile}</strong>
                            </span>
                          )}

                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} color="#dc2626" />
                            <span>{stop.delivery_venue}</span>
                          </span>

                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Package size={12} color="#d97706" />
                            <strong>Vasan: {stop.vasan_summary}</strong>
                          </span>
                        </div>

                        {/* Items in Stop */}
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                          Items: {stop.items.map((it: any) => `${it.product_name} (${it.quantity} ${it.unit})`).join(', ')}
                        </div>
                      </div>

                      {/* Cash Due / Payment & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            fontSize: '0.95rem',
                            fontWeight: 900,
                            color: isDue ? '#dc2626' : '#16a34a',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            {isDue ? `Collect: ${formatCurrency(stop.due_amount)}` : '✅ Paid'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            Rent: {formatCurrency(stop.rickshaw_rent)}
                          </div>
                        </div>

                        {/* Stop Action Buttons */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleSendSingleStop(stop.sale_id, idx + 1)}
                            disabled={sendingWhatsApp}
                            className="btn btn-sm"
                            style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            title="WhatsApp this single stop details to Driver"
                          >
                            <Send size={12} />
                            <span>Send</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopySingleStop(stop.sale_id)}
                            style={{
                              background: isCopied ? '#ecfdf5' : '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: isCopied ? '#059669' : '#475569',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.72rem'
                            }}
                            title="Copy stop details text"
                          >
                            {isCopied ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '8px' }}>
              <Truck size={36} color="#cbd5e1" />
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>Select a driver to view the delivery route & trip sheet</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '10px 18px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
            💡 Tip: Click <strong>"Send Trip Sheet"</strong> to dispatch the entire delivery list to driver WhatsApp in 1-click.
          </div>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
