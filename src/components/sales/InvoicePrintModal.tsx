import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  X, 
  Palette, 
  Sliders, 
  FileText, 
  RotateCcw, 
  MapPin, 
  Truck, 
  Package,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../api/client';
import { Sale, BusinessSettings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { printIsolatedDocument } from '../../utils/printUtils';
import { translateAddressToHindi } from '../../utils/hindiTranslator';

interface InvoicePrintModalProps {
  isOpen: boolean;
  saleId: number;
  onClose: () => void;
  autoPrint?: boolean;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  saleId,
  onClose,
  autoPrint = false
}) => {
  const [sale, setSale] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Customization Settings (100% NON-GST)
  const [paperFormat, setPaperFormat] = useState<'A5' | 'A5_LANDSCAPE' | 'A4' | 'THERMAL'>('A5');
  const [themeColor, setThemeColor] = useState<string>('#0f172a'); // Default Classic Dark/Navy
  const [billTitle, setBillTitle] = useState<string>('WHOLESALE DELIVERY BILL');

  // Column / Section Toggles
  const [showItemCode, setShowItemCode] = useState<boolean>(false);
  const [showUnit, setShowUnit] = useState<boolean>(true);
  const [showVasan, setShowVasan] = useState<boolean>(true); // Vasan / Container column
  const [showDiscount, setShowDiscount] = useState<boolean>(false);
  const [showCustomerPhone, setShowCustomerPhone] = useState<boolean>(true);
  const [showDeliveryDetails, setShowDeliveryDetails] = useState<boolean>(true);
  const [showDueBalance, setShowDueBalance] = useState<boolean>(true);
  const [showTerms, setShowTerms] = useState<boolean>(true);
  const [showSignature, setShowSignature] = useState<boolean>(true);

  // Custom Editable Texts
  const [businessName, setBusinessName] = useState<string>('MATUKI SWEETS');
  const [subtitle, setSubtitle] = useState<string>('Katargam, Surat, Gujarat - 395004');
  const [phone, setPhone] = useState<string>('+91 98765 43210');
  const [termsText, setTermsText] = useState<string>('1. Sweets once sold will not be returned.\n2. Please return empty Vasan (Milton/Choki) within 24 hours.\n3. Best consumed fresh.');
  const [footerGreeting, setFooterGreeting] = useState<string>('*** Thank You! Visit Again ***');

  const [showCustomizer, setShowCustomizer] = useState<boolean>(false);
  const billPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (saleId) {
      setLoading(true);
      Promise.all([
        api.getSaleById(saleId),
        api.getSettings()
      ]).then(([s, sett]) => {
        setSale(s);
        setSettings(sett);
        if (sett) {
          setBusinessName(sett.business_name || 'MATUKI SWEETS');
          setSubtitle(sett.subtitle || sett.address || 'Katargam, Surat, Gujarat - 395004');
          setPhone(sett.mobile || '+91 98765 43210');
          if (sett.invoice_terms) setTermsText(sett.invoice_terms);
        }
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [saleId]);

  // Robust Auto-Print Effect: Triggers native print dialog once DOM is mounted and painted
  useEffect(() => {
    if (sale && autoPrint && !loading) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [sale, autoPrint, loading]);

  if (!isOpen || !sale) return null;

  const displaySubtotal = sale.subtotal || 0;
  const displayDiscount = sale.discount_amount || 0;
  const displayDelivery = sale.delivery_charge || 0;
  const displayGrandTotal = Math.round(displaySubtotal - displayDiscount + displayDelivery);
  const displayPaid = sale.paid_amount || 0;
  const displayDue = Math.max(0, displayGrandTotal - displayPaid);

  const handlePrint = () => {
    try {
      if (!billPreviewRef.current) {
        window.print();
        return;
      }

      const invoiceContent = billPreviewRef.current.innerHTML;
      
      // Look for or create dedicated print iframe
      let iframe = document.getElementById('matuki-invoice-print-frame') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'matuki-invoice-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = '800px';
        iframe.style.height = '1100px';
        iframe.style.border = '0';
        iframe.style.opacity = '0.01';
        iframe.style.zIndex = '-1';
        document.body.appendChild(iframe);
      }

      const pageRules = paperFormat === 'A5' 
        ? '@page { size: A5 portrait; margin: 3mm 4mm; }'
        : paperFormat === 'THERMAL'
          ? '@page { size: 80mm auto; margin: 2mm; }'
          : '@page { size: A4 portrait; margin: 5mm 6mm; }';

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Bill_${sale.invoice_no}</title>
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;600;700;800;900&display=swap" rel="stylesheet">
              <style>
                ${pageRules}
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  font-family: 'Mukta', 'Noto Sans Devanagari', 'Segoe UI', Arial, sans-serif !important;
                  font-size: ${paperFormat === 'A5' ? '10.5px' : '12px'} !important;
                  line-height: 1.25 !important;
                }
                .bill-box {
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 auto !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  padding: ${paperFormat === 'A5' ? '6px 10px' : '8px 12px'} !important;
                  box-shadow: none !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  page-break-inside: avoid !important;
                }
                th, td {
                  border-color: #cbd5e1 !important;
                }
              </style>
            </head>
            <body>
              <div class="bill-box">
                ${invoiceContent}
              </div>
            </body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print failed, falling back to window.print', e);
            window.print();
          }
        }, 200);
      } else {
        window.print();
      }
    } catch (err) {
      window.print();
    }
  };

  const handleResetDefaults = () => {
    setPaperFormat('A5');
    setBillTitle('WHOLESALE DELIVERY BILL');
    setThemeColor('#0f172a');
    setShowItemCode(false);
    setShowUnit(true);
    setShowVasan(true);
    setShowDiscount(false);
    setShowCustomerPhone(true);
    setShowDeliveryDetails(true);
    setShowDueBalance(true);
    setShowTerms(true);
    setShowSignature(true);
  };

  return (
    <div className="modal-overlay" style={{ padding: '10px' }}>
      <div className="modal-content" style={{ maxWidth: '1080px', width: '98%', maxHeight: '96vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header & Controls Toolbar (No-Print) */}
        <div className="no-print" style={{
          padding: '12px 18px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
              Bill No: {sale.invoice_no}
            </span>
            <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>
              {formatDate(sale.date)}
            </span>
            <span style={{ fontSize: '0.8rem', background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
              {sale.customer_name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Paper Size Format Toggle */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                className={`btn btn-sm ${paperFormat === 'A5' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700 }}
                onClick={() => setPaperFormat('A5')}
              >
                A5 (1-Page Fit)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${paperFormat === 'A4' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700 }}
                onClick={() => setPaperFormat('A4')}
              >
                A4
              </button>
              <button
                type="button"
                className={`btn btn-sm ${paperFormat === 'THERMAL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700 }}
                onClick={() => setPaperFormat('THERMAL')}
              >
                Thermal (80mm)
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              onClick={() => setShowCustomizer(!showCustomizer)}
            >
              <Sliders size={14} /> Customize Bill
            </button>

            <button
              className="btn btn-vyapar-red btn-sm"
              onClick={handlePrint}
              style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px' }}
            >
              <Printer size={15} /> Print {paperFormat === 'A5' ? 'A5 Bill' : paperFormat === 'A4' ? 'A4 Bill' : 'Thermal'}
            </button>

            <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body Layout: Left Customizer Sidebar (collapsible) + Right Live WYSIWYG Bill */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#f1f5f9' }}>
          
          {/* Customizer Sidebar */}
          {showCustomizer && (
            <div className="no-print customizer-sidebar" style={{
              width: '310px',
              background: '#ffffff',
              borderRight: '1px solid #e2e8f0',
              padding: '14px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800 }}>⚙️ Customize Template</h4>
                <button type="button" onClick={handleResetDefaults} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <RotateCcw size={12} /> Reset
                </button>
              </div>

              {/* Editable Shop Name & Subtitle */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem' }}>Shop Title Header</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '4px 6px' }}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem' }}>Address Subtitle</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '4px 6px' }}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem' }}>Contact Phone</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '4px 6px' }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem' }}>Invoice Document Title</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '4px 6px' }}
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* WYSIWYG LIVE BILL PREVIEW / PRINT CONTAINER (10% More Compact For Single-Page A5) */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
            <div id="printable-invoice-container" ref={billPreviewRef} style={{ width: '100%', maxWidth: paperFormat === 'THERMAL' ? '300px' : paperFormat === 'A5' ? '500px' : '700px' }}>
              <div className="bill-box" style={{
                background: '#ffffff',
                color: '#000000',
                border: paperFormat === 'THERMAL' ? '1px dashed #94a3b8' : `1.5px solid ${themeColor}`,
                padding: paperFormat === 'THERMAL' ? '8px' : paperFormat === 'A5' ? '10px 14px' : '14px 18px',
                borderRadius: '3px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontFamily: paperFormat === 'THERMAL' ? 'monospace' : "'Mukta', 'Noto Sans Devanagari', 'Segoe UI', Arial, sans-serif",
                fontSize: paperFormat === 'THERMAL' ? '11px' : paperFormat === 'A5' ? '10.5px' : '12px',
                lineHeight: 1.25
              }}>
                
                {/* Header: Company Profile (Compact) */}
                <div style={{ textAlign: 'center', borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px', marginBottom: '5px' }}>
                  <h1 style={{ fontSize: paperFormat === 'THERMAL' ? '16px' : paperFormat === 'A5' ? '18px' : '20px', fontWeight: 900, color: themeColor, margin: '0 0 1px 0' }}>
                    {businessName}
                  </h1>
                  <p style={{ margin: '0 0 1px 0', fontSize: '10px', color: '#334155' }}>
                    {subtitle}
                  </p>
                  <p style={{ margin: '0 0 2px 0', fontSize: '10px', color: '#334155' }}>
                    Ph: {phone}
                  </p>
                  <div style={{
                    display: 'inline-block',
                    margin: '2px 0 0 0',
                    padding: '1px 8px',
                    background: themeColor,
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '10px',
                    borderRadius: '2px',
                    letterSpacing: '0.04em'
                  }}>
                    {billTitle}
                  </div>
                </div>

                {/* Invoice Metadata Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10.5px',
                  borderBottom: '1px dotted #94a3b8',
                  paddingBottom: '4px',
                  marginBottom: '4px'
                }}>
                  <div>
                    <div>Bill No: <strong style={{ fontSize: '11.5px', color: themeColor }}>{sale.invoice_no}</strong></div>
                    <div>Date: <strong>{formatDate(sale.date)}</strong></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>Payment: <strong>{sale.payment_mode}</strong></div>
                    <div>Billed by: <strong style={{ color: '#0f172a' }}>{(sale as any).billed_by || sale.created_by || 'Admin'}</strong></div>
                  </div>
                </div>

                {/* Customer Details & Prominent Delivery Destination Box (Compact) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: showDeliveryDetails && (sale.delivery_venue || sale.delivery_address) ? '1.1fr 1fr' : '1fr',
                  gap: '6px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '3px',
                  padding: '4px 8px',
                  marginBottom: '5px',
                  fontSize: '10.5px'
                }}>
                  <div>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                      CATERER / BILL TO PARTY:
                    </div>
                    <div style={{ fontSize: '11.5px', fontWeight: 900, color: '#0f172a' }}>
                      {sale.customer_name}
                    </div>
                    {showCustomerPhone && (sale.customer_mobile || (sale as any).customer_registered_mobile) && (
                      <div style={{ fontSize: '10px', color: '#334155' }}>
                        Mobile: {sale.customer_mobile || (sale as any).customer_registered_mobile}
                      </div>
                    )}
                  </div>

                  {/* Prominent Delivery Destination Box (Rendered in Clear Hindi) */}
                  {showDeliveryDetails && (sale.delivery_venue || sale.delivery_address) && (
                    <div style={{ borderLeft: '1.5px solid #cbd5e1', paddingLeft: '6px' }}>
                      <div style={{ fontSize: '9px', color: '#d32f2f', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        📍 डिलीवरी स्थान (DELIVERY DESTINATION):
                      </div>
                      {sale.delivery_venue && (
                        <div style={{
                          fontWeight: 800,
                          color: '#0f172a',
                          fontSize: '12px',
                          fontFamily: "'Mukta', 'Noto Sans Devanagari', sans-serif",
                          letterSpacing: '0.01em',
                          lineHeight: 1.3
                        }}>
                          {translateAddressToHindi(sale.delivery_venue)}
                        </div>
                      )}
                      {sale.delivery_address && (
                        <div style={{
                          fontSize: '10.5px',
                          color: '#334155',
                          fontFamily: "'Mukta', 'Noto Sans Devanagari', sans-serif",
                          lineHeight: 1.3
                        }}>
                          {translateAddressToHindi(sale.delivery_address)}
                        </div>
                      )}
                      {sale.driver_name && (
                        <div style={{ fontSize: '9.5px', color: '#15803d', fontWeight: 700, marginTop: '1px' }}>
                          🛺 Rickshaw: {sale.driver_name} {sale.driver_mobile ? `(${sale.driver_mobile})` : ''}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Items Table (Tight Padding for 1-Page A5 Containment) */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px', fontSize: '10.5px' }}>
                  <thead>
                    <tr style={{ background: themeColor, color: '#ffffff', fontSize: '10px' }}>
                      <th style={{ textAlign: 'center', padding: '3px 4px', width: '22px' }}>#</th>
                      {showItemCode && <th style={{ textAlign: 'left', padding: '3px 4px', width: '40px' }}>CODE</th>}
                      <th style={{ textAlign: 'left', padding: '3px 5px' }}>ITEM / SWEET</th>
                      <th style={{ textAlign: 'center', padding: '3px 4px', width: '48px' }}>QTY</th>
                      {showUnit && <th style={{ textAlign: 'center', padding: '3px 4px', width: '35px' }}>UNIT</th>}
                      <th style={{ textAlign: 'right', padding: '3px 4px', width: '60px' }}>RATE (₹)</th>
                      {showVasan && <th style={{ textAlign: 'center', padding: '3px 4px', width: '80px', background: '#78350f', color: '#fef3c7' }}>VASAN</th>}
                      <th style={{ textAlign: 'right', padding: '3px 5px', width: '70px' }}>AMOUNT (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sale.items || []).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: !item.product_id ? '#fafaf9' : undefined }}>
                        <td style={{ textAlign: 'center', padding: '3px 4px', color: '#64748b' }}>{idx + 1}</td>
                        {showItemCode && <td style={{ padding: '3px 4px', fontFamily: 'monospace' }}>{item.product_code || '-'}</td>}
                        <td style={{ padding: '3px 5px' }}>
                          <strong style={{ color: !item.product_id ? '#78350f' : undefined }}>
                            {!item.product_id ? `📦 ${item.product_name}` : item.product_name}
                          </strong>
                        </td>
                        <td style={{ textAlign: 'center', padding: '3px 4px', fontWeight: 800 }}>
                          {item.quantity > 0 ? item.quantity : '-'}
                        </td>
                        {showUnit && <td style={{ textAlign: 'center', padding: '3px 4px', color: '#64748b', fontSize: '10px' }}>{item.quantity > 0 ? item.unit : '-'}</td>}
                        <td style={{ textAlign: 'right', padding: '3px 4px' }}>{item.rate > 0 ? item.rate?.toFixed(2) : '-'}</td>
                        
                        {/* Vasan Tracking Column */}
                        {showVasan && (
                          <td style={{ textAlign: 'center', padding: '3px 4px', background: '#fffbeb', color: '#92400e', fontWeight: 700, fontSize: '10px' }}>
                            {item.vasan_type && item.vasan_type !== 'NONE' ? (
                              <span>
                                {item.vasan_type} ({item.vasan_qty || 1})
                              </span>
                            ) : '-'}
                          </td>
                        )}

                        <td style={{ textAlign: 'right', padding: '3px 5px', fontWeight: 800 }}>
                          {item.amount > 0 ? item.amount?.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Vasan Container Summary Alert Notice */}
                {showVasan && sale.vasan_summary && (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px dashed #f59e0b',
                    padding: '3px 6px',
                    borderRadius: '2px',
                    fontSize: '9.5px',
                    color: '#92400e',
                    fontWeight: 700,
                    marginBottom: '4px'
                  }}>
                    🥣 Total Containers / Vasan Sent: <strong>{sale.vasan_summary}</strong> (Please return after function)
                  </div>
                )}

                {/* Totals Section */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderTop: `1px solid ${themeColor}`,
                  paddingTop: '4px',
                  gap: '8px'
                }}>
                  {/* Left: Terms */}
                  {showTerms ? (
                    <div style={{ fontSize: '9.5px', color: '#475569', flex: 1, whiteSpace: 'pre-line', lineHeight: 1.2 }}>
                      <strong>Terms & Conditions:</strong>
                      <div>{termsText}</div>
                    </div>
                  ) : <div style={{ flex: 1 }} />}

                  {/* Right: Calculations Box */}
                  <div style={{ width: '185px', display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal:</span>
                      <span style={{ fontWeight: 600 }}>₹ {displaySubtotal.toFixed(2)}</span>
                    </div>

                    {displayDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                        <span>Discount:</span>
                        <span>- ₹ {displayDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    {displayDelivery > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e40af', fontWeight: 700 }}>
                        <span>Delivery Charge:</span>
                        <span>+ ₹ {displayDelivery.toFixed(2)}</span>
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: `1.5px solid ${themeColor}`,
                      paddingTop: '2px',
                      marginTop: '1px',
                      fontSize: '12px',
                      fontWeight: 900,
                      color: themeColor
                    }}>
                      <span>Bill Total:</span>
                      <span>₹ {displayGrandTotal.toFixed(2)}</span>
                    </div>

                    {sale.advance_adjusted && sale.advance_adjusted > 0 ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857', fontWeight: 700, fontSize: '10px', background: '#f0fdf4', padding: '1px 3px' }}>
                        <span>Less: Advance:</span>
                        <span>- ₹ {Number(sale.advance_adjusted).toFixed(2)}</span>
                      </div>
                    ) : null}

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      background: '#f8fafc',
                      padding: '1px 4px',
                      borderRadius: '2px',
                      marginTop: '1px'
                    }}>
                      <span>Received Now ({sale.payment_mode}):</span>
                      <strong>₹ {Math.max(0, displayPaid - (Number(sale.advance_adjusted) || 0)).toFixed(2)}</strong>
                    </div>

                    {showDueBalance && displayDue > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#dc2626', padding: '1px 4px', fontWeight: 900, borderTop: '1px solid #fee2e2' }}>
                        <span>Balance Due:</span>
                        <strong>₹ {displayDue.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Signature (Compact) */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginTop: '6px',
                  paddingTop: '3px',
                  borderTop: '1px dashed #cbd5e1',
                  fontSize: '9.5px'
                }}>
                  <div style={{ fontStyle: 'italic', color: '#64748b', fontSize: '9px' }}>
                    {footerGreeting}
                  </div>

                  {showSignature && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ height: '12px' }}></div>
                      <div style={{ borderTop: '1px solid #0f172a', paddingTop: '1px', fontWeight: 700, fontSize: '9.5px' }}>
                        For, {businessName}
                      </div>
                      <div style={{ fontSize: '8.5px', color: '#64748b' }}>Authorized Signatory / Receiver Sign</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Print Button */}
        <div className="no-print" style={{
          padding: '12px 18px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close (Esc)
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-vyapar-red"
              onClick={handlePrint}
              style={{ padding: '8px 28px', fontWeight: 900, fontSize: '0.92rem' }}
            >
              <Printer size={16} /> Print {paperFormat === 'A5' ? 'A5 Wholesale Bill' : paperFormat === 'A4' ? 'A4 Bill' : 'Thermal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
