import React, { useState, useEffect } from 'react';
import { X, ChefHat, Scale, Printer, AlertCircle } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../api/client';
import { printIsolatedDocument } from '../../utils/printUtils';
import { getGujaratiName, formatGujaratiQuantity } from '../../utils/gujaratiTranslation';

interface RecipeScalerModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
}

export const RecipeScalerModal: React.FC<RecipeScalerModalProps> = ({
  isOpen,
  product,
  onClose
}) => {
  const [targetBatchKg, setTargetBatchKg] = useState<number>(1);
  const [customInput, setCustomInput] = useState<string>('1');
  const [recipeData, setRecipeData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !product) {
      setRecipeData(null);
      return;
    }

    setLoading(true);
    setError('');

    api.getSettings().then(setSettings).catch(console.error);

    const fetchRecipe = async () => {
      try {
        let recId = product.recipe_id;
        
        if (!recId) {
          const allRecs = await api.getRecipes({ search: product.name });
          const matching = allRecs.find((r: any) => 
            r.product_id === product.id || 
            r.name.toLowerCase().includes(product.name.toLowerCase()) ||
            product.name.toLowerCase().includes((r.product_name || '').toLowerCase())
          );
          if (matching) {
            recId = matching.id;
          }
        }

        if (recId) {
          const detail = await api.getRecipeById(recId);
          setRecipeData(detail);
          const baseBatch = Number(detail.batch_size) || 1;
          setTargetBatchKg(baseBatch);
          setCustomInput(String(baseBatch));
        } else {
          setRecipeData(null);
        }
      } catch (err: any) {
        console.error('Error fetching recipe for product:', err);
        setError('Failed to load recipe details.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleSetBatch = (kg: number) => {
    const valid = Math.max(0.1, kg);
    setTargetBatchKg(valid);
    setCustomInput(String(valid));
  };

  const handleCustomChange = (val: string) => {
    setCustomInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setTargetBatchKg(num);
    }
  };

  const baseBatch = Number(recipeData?.batch_size) || 1;
  const scaleFactor = targetBatchKg / baseBatch;

  // Calculated materials from actual database items
  const items = recipeData?.items || [];
  const scaledIngredients = items.map((ing: any) => {
    const baseQty = Number(ing.quantity) || 0;
    const rawQty = baseQty * scaleFactor;
    const rate = Number(ing.current_purchase_rate || ing.standard_rate || ing.average_purchase_rate || 0);
    const estimatedCost = rawQty * rate;
    const gujaratiName = getGujaratiName(ing.item_name || '');
    const formattedQty = formatGujaratiQuantity(rawQty, ing.unit);

    return {
      ...ing,
      gujaratiName,
      scaledQtyFormatted: formattedQty,
      rawQty,
      rate,
      estimatedCost
    };
  });

  const totalRawCost = scaledIngredients.reduce((sum: number, item: any) => sum + item.estimatedCost, 0);
  const costPerKg = targetBatchKg > 0 ? totalRawCost / targetBatchKg : 0;

  const sweetGuName = product.gujarati_name || getGujaratiName(product.name);

  const handlePrintSlip = () => {
    if (!recipeData) return;
    const companyName = settings?.company_name || 'MATUKI SWEETS & SNACKS';
    const companyAddress = settings?.address ? `${settings.address}${settings.city ? `, ${settings.city}` : ''}${settings.state ? `, ${settings.state}` : ''}` : 'Katargam, Surat, Gujarat';
    const companyPhone = settings?.phone || '+91 98765 43210';

    const html = `
      <style>
        @media print {
          @page { size: portrait; margin: 4mm; }
          body { margin: 0; padding: 0; background: #fff; color: #000; }
        }
      </style>
      <div style="font-family: Arial, sans-serif; padding: 8px; color: #000; max-width: 680px; margin: 0 auto; line-height: 1.25;">
        
        <!-- Header -->
        <div style="text-align: center; border-bottom: 2.5px solid #000; padding-bottom: 4px; margin-bottom: 8px;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #b45309; text-transform: uppercase;">${companyName}</h2>
          <div style="font-size: 11px; font-weight: 700; color: #334155;">${companyAddress} | Mobile: ${companyPhone}</div>
          <div style="margin-top: 4px; font-size: 13.5px; font-weight: 900; background: #0f172a; color: #fff; padding: 3px 12px; border-radius: 4px; display: inline-block;">
            👨‍🍳 કારીગર ઉત્પાદન માપ સ્લિપ (SWEET PRODUCTION KARIGAR SLIP)
          </div>
        </div>

        <!-- Sweet & Batch Info Banner -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: #fffbeb; border: 2px solid #b45309; padding: 6px 12px; border-radius: 6px; margin-bottom: 8px;">
          <div>
            <div style="font-size: 11.5px; color: #78350f; font-weight: 700;">મીઠાઈનું નામ (Sweet Item):</div>
            <div style="font-size: 17px; font-weight: 900; color: #000;">
              ${sweetGuName} <span style="font-size: 13px; font-weight: 700; color: #475569;">(${product.name})</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11.5px; color: #78350f; font-weight: 700;">લક્ષિત બેચ વજન (Batch Weight):</div>
            <div style="font-size: 19px; font-weight: 900; color: #b45309; font-family: monospace;">
              ${targetBatchKg} KG (કિલો)
            </div>
          </div>
        </div>

        <!-- Ingredients Table in Large Bold Gujarati -->
        <div style="margin-bottom: 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff; font-size: 12.5px;">
                <th style="border: 1.5px solid #000; padding: 5px; text-align: center; width: 32px;">#</th>
                <th style="border: 1.5px solid #000; padding: 5px 8px; text-align: left;">કાચો માલ / સામગ્રી (RAW MATERIAL)</th>
                <th style="border: 1.5px solid #000; padding: 5px 10px; text-align: right; width: 175px;">જરૂરી વજન / માપ (QTY)</th>
                <th style="border: 1.5px solid #000; padding: 5px; text-align: center; width: 90px;">જોખેલ વજન</th>
                <th style="border: 1.5px solid #000; padding: 5px; text-align: center; width: 35px;">OK</th>
              </tr>
            </thead>
            <tbody>
              ${scaledIngredients.map((ing: any, idx: number) => `
                <tr style="border: 1.5px solid #000;">
                  <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: 900; font-size: 13px;">${idx + 1}</td>
                  <td style="border: 1px solid #000; padding: 5px 8px;">
                    <div style="font-weight: 900; color: #000; font-size: 15px;">${ing.gujaratiName}</div>
                    <div style="font-size: 10.5px; font-weight: 700; color: #475569;">${ing.item_name}</div>
                  </td>
                  <td style="border: 1px solid #000; padding: 5px 10px; text-align: right; font-weight: 900; font-family: monospace; font-size: 16px; color: #b45309;">
                    ${ing.scaledQtyFormatted}
                  </td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: center; color: #94a3b8; font-size: 11px;">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 11px;">[ &nbsp; ]</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Compact Footer Info at Bottom -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #334155; border-top: 1.5px solid #000; padding-top: 6px; margin-top: 8px; font-weight: 700;">
          <div>📌 <strong>કારીગર સૂચના:</strong> સ્ટોરમાંથી તમામ સામગ્રી ડિજિટલ કાંટા પર ચોક્કસ જોખીને લેવી.</div>
          <div style="white-space: nowrap;">તારીખ: <strong>${formatDate(new Date().toISOString())}</strong></div>
        </div>
      </div>
    `;
    printIsolatedDocument(html, {
      paperSize: 'A5',
      documentTitle: `${product.name}_Gujarati_Recipe_${targetBatchKg}KG`
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100050,
      padding: '12px'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        maxWidth: '780px',
        width: '100%',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
        border: '1.5px solid #d97706'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
          padding: '16px 20px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ChefHat size={24} color="#fef08a" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#fef08a' }}>
                👨‍🍳 {sweetGuName} ({product.name})
              </h3>
              <div style={{ fontSize: '0.76rem', color: '#fde68a', marginTop: '2px' }}>
                {recipeData ? `ગુજરાતી કારીગર ફોર્મ્યુલા (${items.length} સામગ્રી ઘટકો)` : 'માપ & રેસિપી કેલ્ક્યુલેટર'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {recipeData && (
              <button
                type="button"
                onClick={handlePrintSlip}
                className="btn btn-sm"
                style={{ background: '#fef3c7', color: '#78350f', border: 'none', fontWeight: 800, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Print Gujarati Karigar Slip"
              >
                <Printer size={14} /> 🖨️ ગુજરાતી સ્લિપ પ્રિન્ટ કરો
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#fde68a', cursor: 'pointer', padding: '4px' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading authentic recipe formula from database...
            </div>
          ) : !recipeData ? (
            <div style={{ textAlign: 'center', padding: '30px', background: 'var(--bg-card-alt)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <AlertCircle size={32} color="#f59e0b" style={{ margin: '0 auto 10px auto' }} />
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-main)' }}>કોઈ રેસિપી ફોર્મ્યુલા લિંક નથી</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                આ મીઠાઈ માટે હજુ રેસિપી ફોર્મ્યુલા લિંક થયેલી નથી. તમે Manufacturing મોડ્યુલમાં રેસિપી સેટ કરી શકો છો.
              </p>
            </div>
          ) : (
            <>
              {/* Target Batch Selector Card */}
              <div style={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1.5px solid #fde68a',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 900, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Scale size={18} color="#b45309" />
                    કેટલા કિલો મીઠાઈ બનાવવી છે? (Target Batch Size):
                  </label>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      className="form-input"
                      style={{
                        width: '100px',
                        padding: '6px 10px',
                        fontSize: '1.05rem',
                        fontWeight: 900,
                        textAlign: 'center',
                        background: '#ffffff',
                        border: '2px solid #d97706',
                        color: '#92400e'
                      }}
                      value={customInput}
                      onChange={(e) => handleCustomChange(e.target.value)}
                    />
                    <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#92400e' }}>KG (કિલો)</span>
                  </div>
                </div>

                {/* Quick 1-Tap Batch Buttons */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[0.5, 1, 2, 2.5, 5, 10, 25, 50, 100].map(kg => (
                    <button
                      key={kg}
                      type="button"
                      onClick={() => handleSetBatch(kg)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        border: '1.5px solid',
                        background: targetBatchKg === kg ? '#b45309' : '#ffffff',
                        color: targetBatchKg === kg ? '#ffffff' : '#78350f',
                        borderColor: targetBatchKg === kg ? '#b45309' : '#d97706',
                        boxShadow: targetBatchKg === kg ? '0 3px 8px rgba(180, 83, 9, 0.3)' : 'none'
                      }}
                    >
                      {kg} KG
                    </button>
                  ))}
                </div>
              </div>

              {/* Exact Ingredients Table */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg-card)' }}>
                <div style={{ padding: '10px 14px', background: 'var(--bg-card-alt)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    🥣 {targetBatchKg} કિલો માટે જરૂરી કાચી સામગ્રીનું લિસ્ટ (GUJARATI RECIPE)
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    મૂળ માપ: {baseBatch} {recipeData.batch_unit || 'KG'}
                  </span>
                </div>

                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>કાચી સામગ્રી (INGREDIENT)</th>
                        <th style={{ textAlign: 'right' }}>જરૂરી માપ (REQUIRED QTY)</th>
                        <th>એકમ</th>
                        <th style={{ textAlign: 'right' }}>ખરીદી રેટ</th>
                        <th style={{ textAlign: 'right' }}>અંદાજિત ખર્ચ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scaledIngredients.map((ing: any, idx: number) => (
                        <tr key={ing.id || idx}>
                          <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.86rem' }}>
                              {ing.gujaratiName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {ing.item_name} {ing.item_code ? `(${ing.item_code})` : ''}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{
                              fontWeight: 900,
                              fontSize: '0.88rem',
                              color: '#b45309',
                              background: '#fef3c7',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              {ing.scaledQtyFormatted}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{ing.unit}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {ing.rate > 0 ? formatCurrency(ing.rate) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                            {ing.estimatedCost > 0 ? formatCurrency(ing.estimatedCost) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Cost Summary */}
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-card-alt)',
                  borderTop: '1.5px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>અંદાજિત કાચા માલનો ખર્ચ / KG:</span>
                    <div style={{ fontWeight: 900, fontSize: '1rem', color: '#15803d', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(costPerKg)} / KG
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>કુલ કાચા માલનો ખર્ચ ({targetBatchKg} KG):</span>
                    <div style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(totalRawCost)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
