import React, { useRef } from 'react';
import { Printer, X, ChefHat } from 'lucide-react';
import { DailyOrdersSummary, BusinessSettings } from '../../types';
import { formatDate } from '../../utils/formatters';
import { translateToHindi, translateUnitToHindi } from '../../utils/hindiTranslator';

interface ChefProductionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: DailyOrdersSummary | null;
  settings?: BusinessSettings | null;
}

export const ChefProductionPrintModal: React.FC<ChefProductionPrintModalProps> = ({
  isOpen,
  onClose,
  summary,
  settings
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !summary) return null;

  const handlePrint = () => {
    window.print();
  };

  const morning = summary.morning;
  const evening = summary.evening;
  const targetDate = summary.date;

  // Format date in Hindi style e.g. 15/08/2026
  const formatHindiDate = (dStr: string) => {
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return formatDate(dStr);
    } catch {
      return dStr;
    }
  };

  // Convert breakdown formula numbers & units to Hindi unit
  const formatHindiFormula = (formula?: string, fallbackQty: number = 0, unit: string = 'KG') => {
    const hindiUnit = translateUnitToHindi(unit);
    if (!formula) return `${fallbackQty} ${hindiUnit}`;
    return formula.replace(/\b(KG|kgs|kg|gm|gram|ltr|pouch|box|pcs|nos)\b/gi, hindiUnit);
  };

  return (
    <div className="chef-modal-backdrop" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Action Header Bar (Hidden in Print) */}
        <div className="no-print" style={{
          padding: '12px 20px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#f59e0b', color: '#0f172a', padding: '6px', borderRadius: '6px' }}>
              <ChefHat size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>
                हलवाई / कारीगर दैनिक उत्पादन पर्ची (Chef Kitchen Production Sheet)
              </h3>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                A4 साइज में १-पेज पर संपूर्ण हिन्दी (Hindi) में सुबह और शाम का उत्पादन आर्डर पत्रक
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrint}
              style={{
                background: '#16a34a',
                borderColor: '#16a34a',
                fontWeight: 900,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 18px',
                boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.4)'
              }}
            >
              <Printer size={16} /> 🖨️ प्रिंट निकालें (Print A4)
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Printable A4 Body (100% PURE HINDI) */}
        <div 
          ref={printRef}
          className="printable-chef-sheet"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            background: '#ffffff',
            color: '#000000',
            fontFamily: "'Segoe UI', 'Noto Sans Devanagari', 'Arial', sans-serif"
          }}
        >
          {/* Print CSS Styling */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .printable-chef-sheet, .printable-chef-sheet * {
                visibility: visible;
              }
              .printable-chef-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                padding: 6mm 8mm !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
              .no-print {
                display: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 5mm;
              }
            }
          `}</style>

          {/* 1. Header Box */}
          <div style={{
            borderBottom: '2.5px solid #000000',
            paddingBottom: '8px',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {settings?.business_name || 'श्री मातुकी स्वीट्स एंड कैटरर्स'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, marginTop: '2px', color: '#000000' }}>
                👨‍🍳 हलवाई / मुख्य कारीगर दैनिक उत्पादन पर्ची (Kitchen Production Order Sheet)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#333333', marginTop: '1px' }}>
                {settings?.address || 'सूरत, गुजरात'} | कैटरर्स एवं डिस्ट्रीब्यूटर थोक आर्डर सूची
              </div>
            </div>

            <div style={{ textAlign: 'right', border: '1.5px solid #000000', padding: '6px 12px', borderRadius: '4px', background: '#f8f8f8' }}>
              <div style={{ fontSize: '0.94rem', fontWeight: 900 }}>
                तारीख: <span style={{ textDecoration: 'underline', fontSize: '1.05rem' }}>{formatHindiDate(targetDate)}</span>
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#000000', marginTop: '3px' }}>
                कुल आर्डर: <strong>{summary.total_orders_count}</strong> | कुल वजन: <strong style={{ fontSize: '0.92rem' }}>{summary.total_day_weight_kg} किलो</strong>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* 2. MORNING SLOT SECTION (प्रातःकालीन स्लॉट / सुबह का उत्पादन) */}
          {/* ===================================================================== */}
          <div style={{ marginBottom: '14px', border: '1.5px solid #000000', borderRadius: '6px', overflow: 'hidden' }}>
            {/* Morning Slot Title Bar */}
            <div style={{
              background: '#000000',
              color: '#ffffff',
              padding: '6px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 900,
              fontSize: '0.92rem'
            }}>
              <span>
                🌅 १. सुबह का स्लॉट (प्रातःकालीन डिस्पैच: सुबह 6:00 से दोपहर 12:00)
              </span>
              <span>
                आर्डर संख्या: {morning?.orders_count || 0} | कुल वजन: {morning?.total_weight_kg || 0} किलो
              </span>
            </div>

            {/* Morning Items Formula Breakdown Table */}
            {(!morning?.kitchen_summary || morning.kitchen_summary.length === 0) ? (
              <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.82rem', color: '#666666' }}>
                -- सुबह के स्लॉट में कोई उत्पादन आर्डर नहीं है --
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0', borderBottom: '1.5px solid #000000' }}>
                    <th style={{ borderRight: '1.5px solid #000000', padding: '6px 8px', width: '45px', textAlign: 'center', fontWeight: 900 }}>क्र.</th>
                    <th style={{ borderRight: '1.5px solid #000000', padding: '6px 12px', textAlign: 'left', fontWeight: 900 }}>मिठाई / आइटम का नाम (Sweet Name in Hindi)</th>
                    <th style={{ borderRight: '1.5px solid #000000', padding: '6px 12px', textAlign: 'left', width: '320px', fontWeight: 900 }}>आर्डर जोड़ सूत्र (Formula: 15+25+10)</th>
                    <th style={{ padding: '6px 12px', textAlign: 'center', width: '140px', fontWeight: 900 }}>कुल उत्पादन मात्रा</th>
                  </tr>
                </thead>
                <tbody>
                  {morning.kitchen_summary.map((k, idx) => {
                    const hindiSweetName = translateToHindi(k.item_name);
                    const hindiUnit = translateUnitToHindi(k.unit);
                    const hindiFormula = formatHindiFormula(k.breakdown_formula, k.total_qty, k.unit);

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #000000', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ borderRight: '1.5px solid #000000', padding: '7px 8px', textAlign: 'center', fontWeight: 900, fontSize: '0.95rem' }}>
                          {idx + 1}
                        </td>

                        {/* Sweet Name in Pure Hindi */}
                        <td style={{ borderRight: '1.5px solid #000000', padding: '7px 12px' }}>
                          <div style={{ fontSize: '1.08rem', fontWeight: 900, color: '#000000' }}>
                            {hindiSweetName}
                          </div>
                          {hindiSweetName !== k.item_name && (
                            <div style={{ fontSize: '0.72rem', color: '#555555', marginTop: '1px' }}>
                              ({k.item_name})
                            </div>
                          )}
                        </td>

                        {/* Math Breakdown Formula in Hindi: e.g. 15+25+10 = 50 किलो */}
                        <td style={{ borderRight: '1.5px solid #000000', padding: '7px 12px' }}>
                          <div style={{
                            fontFamily: 'monospace',
                            fontSize: '1.02rem',
                            fontWeight: 900,
                            background: '#f1f5f9',
                            padding: '4px 10px',
                            border: '1px dashed #64748b',
                            borderRadius: '4px',
                            display: 'inline-block',
                            color: '#0f172a'
                          }}>
                            {hindiFormula}
                          </div>
                        </td>

                        {/* Total Weight Bold Box */}
                        <td style={{
                          padding: '7px 12px',
                          textAlign: 'center',
                          fontWeight: 900,
                          fontSize: '1.18rem',
                          background: '#f1f5f9',
                          color: '#000000'
                        }}>
                          {k.total_qty} {hindiUnit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ===================================================================== */}
          {/* 3. EVENING SLOT SECTION (सायंकालीन स्लॉट / शाम का उत्पादन) */}
          {/* ===================================================================== */}
          <div style={{ marginBottom: '14px', border: '1.5px solid #000000', borderRadius: '6px', overflow: 'hidden' }}>
            {/* Evening Slot Title Bar */}
            <div style={{
              background: '#000000',
              color: '#ffffff',
              padding: '6px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 900,
              fontSize: '0.92rem'
            }}>
              <span>
                🌇 २. शाम का स्लॉट (सायंकालीन डिस्पैच: दोपहर 12:00 से रात 9:00)
              </span>
              <span>
                आर्डर संख्या: {evening?.orders_count || 0} | कुल वजन: {evening?.total_weight_kg || 0} किलो
              </span>
            </div>

            {/* Evening Items Formula Breakdown Table */}
            {(!evening?.kitchen_summary || evening.kitchen_summary.length === 0) ? (
              <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.82rem', color: '#666666' }}>
                -- शाम के स्लॉट में कोई उत्पादन आर्डर नहीं है --
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0', borderBottom: '1.5px solid #000000' }}>
                    <th style={{ borderRight: '1.5px solid #000000', padding: '6px 8px', width: '45px', textAlign: 'center', fontWeight: 900 }}>क्र.</th>
                    <th style={{ borderRight: '1.5px solid #000000', padding: '6px 12px', textAlign: 'left', fontWeight: 900 }}>मिठाई / आइटम का नाम (Sweet Name in Hindi)</th>
                    <th style={{ borderRight: '1.5px solid #000000', padding: '6px 12px', textAlign: 'left', width: '320px', fontWeight: 900 }}>आर्डर जोड़ सूत्र (Formula: 15+25+10)</th>
                    <th style={{ padding: '6px 12px', textAlign: 'center', width: '140px', fontWeight: 900 }}>कुल उत्पादन मात्रा</th>
                  </tr>
                </thead>
                <tbody>
                  {evening.kitchen_summary.map((k, idx) => {
                    const hindiSweetName = translateToHindi(k.item_name);
                    const hindiUnit = translateUnitToHindi(k.unit);
                    const hindiFormula = formatHindiFormula(k.breakdown_formula, k.total_qty, k.unit);

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #000000', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ borderRight: '1.5px solid #000000', padding: '7px 8px', textAlign: 'center', fontWeight: 900, fontSize: '0.95rem' }}>
                          {idx + 1}
                        </td>

                        {/* Sweet Name in Pure Hindi */}
                        <td style={{ borderRight: '1.5px solid #000000', padding: '7px 12px' }}>
                          <div style={{ fontSize: '1.08rem', fontWeight: 900, color: '#000000' }}>
                            {hindiSweetName}
                          </div>
                          {hindiSweetName !== k.item_name && (
                            <div style={{ fontSize: '0.72rem', color: '#555555', marginTop: '1px' }}>
                              ({k.item_name})
                            </div>
                          )}
                        </td>

                        {/* Math Breakdown Formula in Hindi */}
                        <td style={{ borderRight: '1.5px solid #000000', padding: '7px 12px' }}>
                          <div style={{
                            fontFamily: 'monospace',
                            fontSize: '1.02rem',
                            fontWeight: 900,
                            background: '#f1f5f9',
                            padding: '4px 10px',
                            border: '1px dashed #64748b',
                            borderRadius: '4px',
                            display: 'inline-block',
                            color: '#0f172a'
                          }}>
                            {hindiFormula}
                          </div>
                        </td>

                        {/* Total Weight Bold Box */}
                        <td style={{
                          padding: '7px 12px',
                          textAlign: 'center',
                          fontWeight: 900,
                          fontSize: '1.18rem',
                          background: '#f1f5f9',
                          color: '#000000'
                        }}>
                          {k.total_qty} {hindiUnit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* 4. Footer & Signature Verification Box in Pure Hindi */}
          <div style={{
            marginTop: '12px',
            paddingTop: '6px',
            borderTop: '1.5px solid #000000',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem'
          }}>
            <div>
              <strong>सुपरवाइजर / मैनेजर:</strong> ________________________
            </div>
            <div>
              <strong>मुख्य हलवाई / शेफ हस्ताक्षर:</strong> ________________________
            </div>
            <div>
              <strong>डिस्पैच एवं बर्तन पैकिंग चेक:</strong> [ &nbsp; ] पास (OK)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
