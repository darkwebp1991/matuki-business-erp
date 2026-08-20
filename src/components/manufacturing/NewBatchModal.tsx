import React, { useState, useEffect } from 'react';
import { Factory, Plus, Trash2, X, AlertTriangle, CheckCircle2, Layers, Printer } from 'lucide-react';
import { api } from '../../api/client';
import { Recipe, Product, RawMaterial } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { printIsolatedDocument } from '../../utils/printUtils';
import { getGujaratiName, formatGujaratiQuantity } from '../../utils/gujaratiTranslation';

interface NewBatchModalProps {
  isOpen: boolean;
  preSelectedProductId?: number | string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewBatchModal: React.FC<NewBatchModalProps> = ({
  isOpen,
  preSelectedProductId,
  onClose,
  onSuccess
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<string>(preSelectedProductId ? String(preSelectedProductId) : '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manufacturedQty, setManufacturedQty] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<string>('KILOGRAMS (KG)');
  const [paymentType, setPaymentType] = useState<string>('Cash');

  const [rawMaterialItems, setRawMaterialItems] = useState<Array<{
    raw_material_id: number | null;
    name: string;
    quantity: number;
    unit: string;
    rate: number;
    cost: number;
  }>>([]);

  const [additionalCharges, setAdditionalCharges] = useState<Array<{
    name: string;
    cost: number;
  }>>([]);

  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    api.getSettings().then(setSettings).catch(console.error);
    api.getUnits().then(setUnits).catch(console.error);

    Promise.all([
      api.getProducts(),
      api.getRecipes(),
      api.getRawMaterials()
    ]).then(([prods, recs, rms]) => {
      setProducts(prods);
      setRecipes(recs);
      setRawMaterials(rms);
      
      const targetId = preSelectedProductId 
        ? String(preSelectedProductId) 
        : (prods.length > 0 ? String(prods[0].id) : '');
      
      setSelectedProductId(targetId);

      const prod = prods.find(p => p.id === Number(targetId));
      if (prod) {
        setSelectedUnit(prod.unit || 'KG');
      }
    }).catch(console.error);
  }, [isOpen, preSelectedProductId]);

  // When product or quantity changes, load / scale recipe BOM
  useEffect(() => {
    if (selectedProductId) {
      const prod = products.find(p => p.id === Number(selectedProductId));
      const rec = (prod?.recipe_id ? recipes.find(r => r.id === prod.recipe_id) : null) ||
                  recipes.find(r => r.product_id === Number(selectedProductId)) ||
                  recipes.find(r => r.name.toLowerCase().includes((prod?.name || '').toLowerCase())) ||
                  null;

      if (rec) {
        api.calculateRecipeCost({
          recipe_id: rec.id,
          target_batch_size: manufacturedQty
        }).then(costRes => {
          if (costRes?.items && costRes.items.length > 0) {
            setRawMaterialItems(costRes.items.map((i: any) => ({
              raw_material_id: i.raw_material_id,
              name: i.item_name,
              quantity: i.scaled_quantity,
              unit: i.unit || 'KG',
              rate: i.rate_used || 0,
              cost: i.line_cost || 0
            })));
          } else {
            setRawMaterialItems([]);
          }
        }).catch(console.error);
      } else {
        setRawMaterialItems([]);
      }
    }
  }, [selectedProductId, manufacturedQty, recipes, products]);

  const handleRawItemChange = (index: number, field: string, value: any) => {
    const updated = [...rawMaterialItems];
    const item = { ...updated[index], [field]: value };
    item.cost = Math.round(Number(item.quantity || 0) * Number(item.rate || 0) * 100) / 100;
    updated[index] = item;
    setRawMaterialItems(updated);
  };

  const handleAddRawRow = () => {
    setRawMaterialItems([...rawMaterialItems, {
      raw_material_id: null,
      name: '',
      quantity: 1,
      unit: 'KG',
      rate: 100,
      cost: 100
    }]);
  };

  const handleRemoveRawRow = (index: number) => {
    setRawMaterialItems(rawMaterialItems.filter((_, i) => i !== index));
  };

  const handleChargeChange = (index: number, field: string, value: any) => {
    const updated = [...additionalCharges];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalCharges(updated);
  };

  const handleAddChargeRow = () => {
    setAdditionalCharges([...additionalCharges, { name: 'Packaging & Foil', cost: 100 }]);
  };

  const handleRemoveChargeRow = (index: number) => {
    setAdditionalCharges(additionalCharges.filter((_, i) => i !== index));
  };

  // Total Estimated Cost
  const totalMaterialCost = rawMaterialItems.reduce((sum, i) => sum + Number(i.cost || 0), 0);
  const totalAdditionalCost = additionalCharges.reduce((sum, c) => sum + Number(c.cost || 0), 0);
  const grandEstimatedCost = totalMaterialCost + totalAdditionalCost;
  const costPerKg = manufacturedQty > 0 ? grandEstimatedCost / manufacturedQty : 0;

  const currentProduct = products.find(p => p.id === Number(selectedProductId));

  const handlePrintStorekeeperSlip = () => {
    const sweetGuName = currentProduct ? (currentProduct.gujarati_name || getGujaratiName(currentProduct.name)) : 'મીઠાઈ બેચ';
    const companyName = settings?.company_name || 'MATUKI SWEETS & SNACKS';
    const companyAddress = settings?.address ? `${settings.address}${settings.city ? `, ${settings.city}` : ''}${settings.state ? `, ${settings.state}` : ''}` : 'Katargam, Surat, Gujarat - 395004';
    const companyPhone = settings?.phone || '+91 98765 43210';

    const html = `
      <style>
        @media print {
          @page { size: portrait; margin: 4mm; }
          body { margin: 0; padding: 0; background: #fff; color: #000; }
        }
      </style>
      <div style="font-family: Arial, sans-serif; padding: 8px; color: #000; max-width: 680px; margin: 0 auto; line-height: 1.25;">
        <div style="text-align: center; border-bottom: 2.5px solid #000; padding-bottom: 4px; margin-bottom: 8px;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #b45309; text-transform: uppercase;">${companyName}</h2>
          <div style="font-size: 11px; font-weight: 700; color: #334155;">${companyAddress} | Mobile: ${companyPhone}</div>
          <div style="margin-top: 4px; font-size: 13.5px; font-weight: 900; background: #0f172a; color: #fff; padding: 3px 12px; border-radius: 4px; display: inline-block;">
            📦 સ્ટોર કાચો માલ ઇશ્યૂ સ્લિપ (STORE REQUISITION & KARIGAR SLIP)
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: #fffbeb; border: 2px solid #b45309; padding: 6px 12px; border-radius: 6px; margin-bottom: 8px;">
          <div>
            <div style="font-size: 11.5px; color: #78350f; font-weight: 700;">મીઠાઈનું નામ (Sweet Item):</div>
            <div style="font-size: 17px; font-weight: 900; color: #000;">
              ${sweetGuName} <span style="font-size: 13px; font-weight: 700; color: #475569;">(${currentProduct?.name || 'Sweet'})</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11.5px; color: #78350f; font-weight: 700;">ઉત્પાદન વજન (Batch Quantity):</div>
            <div style="font-size: 19px; font-weight: 900; color: #b45309; font-family: monospace;">
              ${manufacturedQty} ${selectedUnit || 'KG'}
            </div>
          </div>
        </div>

        <div style="margin-bottom: 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff; font-size: 12.5px;">
                <th style="border: 1.5px solid #000; padding: 5px; text-align: center; width: 32px;">#</th>
                <th style="border: 1.5px solid #000; padding: 5px 8px; text-align: left;">કાચો માલ / સામગ્રી (RAW MATERIAL)</th>
                <th style="border: 1.5px solid #000; padding: 5px 10px; text-align: right; width: 175px;">જરૂરી માપ (QTY)</th>
                <th style="border: 1.5px solid #000; padding: 5px; text-align: center; width: 90px;">જોખેલ વજન</th>
                <th style="border: 1.5px solid #000; padding: 5px; text-align: center; width: 35px;">OK</th>
              </tr>
            </thead>
            <tbody>
              ${rawMaterialItems.map((item, idx) => `
                <tr style="border: 1.5px solid #000;">
                  <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: 900; font-size: 13px;">${idx + 1}</td>
                  <td style="border: 1px solid #000; padding: 5px 8px;">
                    <div style="font-weight: 900; color: #000; font-size: 15px;">${getGujaratiName(item.name || '')}</div>
                    <div style="font-size: 10.5px; font-weight: 700; color: #475569;">${item.name || 'Raw Material'}</div>
                  </td>
                  <td style="border: 1px solid #000; padding: 5px 10px; text-align: right; font-weight: 900; font-family: monospace; font-size: 16px; color: #b45309;">
                    ${formatGujaratiQuantity(item.quantity, item.unit)}
                  </td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: center; color: #94a3b8; font-size: 11px;">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 11px;">[ &nbsp; ]</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #334155; border-top: 1.5px solid #000; padding-top: 6px; margin-top: 8px; font-weight: 700;">
          <div>📌 <strong>સ્ટોરકીપર સૂચના:</strong> તમામ કાચી સામગ્રી ડિજિટલ કાંટા પર ચોક્કસ જોખીને જ કારીગરને આપવી.</div>
          <div style="white-space: nowrap;">તારીખ: <strong>${formatDate(date)}</strong></div>
        </div>
      </div>
    `;

    printIsolatedDocument(html, { paperSize: 'A5', documentTitle: `Gujarati_Store_Slip_${currentProduct?.name || 'Batch'}` });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || manufacturedQty <= 0) {
      setError('Please select a valid sweet item and quantity');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const rec = recipes.find(r => r.product_id === Number(selectedProductId)) || (recipes.length > 0 ? recipes[0] : null);

      await api.createManufacturingBatch({
        date,
        recipe_id: rec ? rec.id : 1,
        planned_quantity: manufacturedQty,
        actual_output: manufacturedQty,
        wastage_quantity: 0,
        wastage_reason: 'Standard process production',
        operator: 'Head Karigar',
        production_location: 'Main Katargam Workshop',
        notes: `Produced ${manufacturedQty} ${selectedUnit} of ${currentProduct?.name}`
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to complete manufacturing batch');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ padding: '8px' }}>
      <div className="modal-content" style={{ maxWidth: '980px', width: '98%', maxHeight: '96vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header from Video 00:53 */}
        <div style={{
          padding: '12px 18px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Factory size={18} color="#d32f2f" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Manufacturing {currentProduct?.name || 'Item'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', color: '#dc2626', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {/* Top Parameters Bar (Manufactured Quantity, Unit, Date, In Stock) */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
            gap: '12px',
            alignItems: 'center'
          }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Item to Manufacture *</label>
              <select
                className="form-select"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Manufactured Quantity *</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  className="form-input"
                  style={{ width: '80px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                  value={manufacturedQty}
                  onChange={(e) => setManufacturedQty(Number(e.target.value) || 1)}
                />
                <select
                  className="form-select"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                >
                  {units.map((u: any) => {
                    const sym = u.symbol || u.name;
                    return (
                      <option key={u.id} value={sym}>
                        {sym} {u.name !== sym ? `(${u.name})` : ''}
                      </option>
                    );
                  })}
                  {!units.some((u: any) => (u.symbol || u.name).toUpperCase() === (selectedUnit || '').toUpperCase()) && selectedUnit && (
                    <option value={selectedUnit}>{selectedUnit}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Production Date</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Current Stock</span>
              <div style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: (currentProduct?.current_stock || 0) < 0 ? '#dc2626' : '#15803d'
              }}>
                {currentProduct?.current_stock || 0} {currentProduct?.unit}
              </div>
            </div>
          </div>

          {/* Raw Materials (BOM) Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                Raw Material (TO {manufacturedQty} {currentProduct?.name?.toUpperCase()})
              </span>
            </div>

            <div className="table-container" style={{ maxHeight: '220px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '35px' }}>#</th>
                    <th style={{ width: '38%' }}>RAW MATERIAL</th>
                    <th>QTY</th>
                    <th>UNIT</th>
                    <th>PURCHASE PRICE/UNIT (₹)</th>
                    <th style={{ textAlign: 'right' }}>ESTIMATED COST (₹)</th>
                    <th style={{ width: '35px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rawMaterialItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{idx + 1}</td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{item.name}</strong>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.001"
                          className="form-input"
                          style={{ width: '80px', padding: '3px 6px', textAlign: 'right', fontSize: '0.82rem' }}
                          value={item.quantity}
                          onChange={(e) => handleRawItemChange(idx, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.unit}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.unit}</span>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.5"
                          className="form-input font-mono"
                          style={{ padding: '3px 6px', textAlign: 'right', fontSize: '0.84rem' }}
                          value={item.rate}
                          onChange={(e) => handleRawItemChange(idx, 'rate', Number(e.target.value))}
                        />
                      </td>
                      <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                        {formatCurrency(item.cost)}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleRemoveRawRow(idx)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Direct Karigar & Factory Overhead Costs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', margin: 0 }}>
                Factory Overheads & Karigar Wages
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddChargeRow}
              >
                <Plus size={14} /> Add Overhead Charge
              </button>
            </div>

            <div className="table-container" style={{ maxHeight: '130px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60%' }}>CHARGE / EXPENSE HEAD</th>
                    <th style={{ textAlign: 'right', width: '30%' }}>AMOUNT (₹)</th>
                    <th style={{ width: '10%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {additionalCharges.map((chg, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '3px 6px', fontSize: '0.84rem' }}
                          value={chg.name}
                          onChange={(e) => handleChargeChange(idx, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input font-mono"
                          style={{ padding: '3px 6px', textAlign: 'right', fontSize: '0.84rem', fontWeight: 800 }}
                          value={chg.cost}
                          onChange={(e) => handleChargeChange(idx, 'cost', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleRemoveChargeRow(idx)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Summary */}
        <div style={{
          padding: '12px 18px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomLeftRadius: 'var(--radius-lg)',
          borderBottomRightRadius: 'var(--radius-lg)'
        }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: '#475569' }}>
              Total Estimated Cost ={' '}
              <strong style={{ fontSize: '1.15rem', color: '#0f172a', fontFamily: 'var(--font-mono)' }}>
                {formatCurrency(grandEstimatedCost)}
              </strong>
            </span>
            <span style={{ marginLeft: '12px', fontSize: '0.82rem', color: '#d32f2f', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              (Cost: {formatCurrency(costPerKg)}/{currentProduct?.unit || 'KG'})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrintStorekeeperSlip}
              style={{ color: '#2563eb', borderColor: '#bfdbfe', fontWeight: 800, background: '#eff6ff' }}
            >
              <Printer size={14} /> Print Store Slip
            </button>

            <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>

            {/* Vyapar Blue Manufacture Button */}
            <button
              className="btn btn-vyapar-blue"
              onClick={handleSubmit}
              disabled={saving}
              style={{ padding: '8px 24px', fontWeight: 800, fontSize: '0.9rem' }}
            >
              {saving ? 'Processing...' : 'Manufacture & Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
