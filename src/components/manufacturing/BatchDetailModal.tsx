import React, { useState, useEffect } from 'react';
import { Factory, Lock, Sparkles, Printer, Calendar } from 'lucide-react';
import { api } from '../../api/client';
import { ManufacturingOrder } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { printIsolatedDocument } from '../../utils/printUtils';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';

interface BatchDetailModalProps {
  isOpen: boolean;
  batchId: number;
  onClose: () => void;
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({
  isOpen,
  batchId,
  onClose
}) => {
  const [order, setOrder] = useState<ManufacturingOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (batchId) {
      setLoading(true);
      api.getManufacturingOrderById(batchId)
        .then(setOrder)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [batchId]);

  if (!order) return null;

  const handlePrintStoreSlip = () => {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 12px; color: #000;">
        <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 18px; color: #d32f2f; font-weight: 900;">MATUKI SWEETS</h2>
          <div style="font-size: 11px; color: #475569;">Katargam, Surat, Gujarat - 395004 | Mobile: +91 98765 43210</div>
          <div style="margin-top: 6px; font-size: 13px; font-weight: 900; background: #0f172a; color: #fff; padding: 3px 8px; border-radius: 3px; display: inline-block;">
            📦 STORE ROOM MATERIAL REQUISITION SLIP (કાચો માલ ઇશ્યૂ પર્ચી)
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px;">
          <div>
            <div>Target Sweet Order: <strong style="font-size: 14px; color: #0f172a;">${order.finished_product_name}</strong></div>
            <div>Batch Output: <strong style="font-size: 14px; color: #d32f2f;">${order.actual_output || order.planned_quantity} ${order.actual_unit || order.planned_unit}</strong></div>
          </div>
          <div style="text-align: right;">
            <div>Date: <strong>${formatDate(order.date)}</strong></div>
            <div>Batch Ref: <strong>${order.batch_number || order.manufacturing_no}</strong></div>
          </div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
            RAW MATERIALS TO BE ISSUED FROM STORE (સ્ટોરમાંથી આપવાનો કાચો માલ):
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #f1f5f9; border: 1px solid #94a3b8;">
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; width: 30px;">#</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">RAW MATERIAL (કાચો માલ)</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; width: 110px;">REQUIRED QTY</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; width: 60px;">UNIT</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; width: 130px;">STORE ISSUED WEIGHT</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; width: 40px;">OK</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map((item, idx) => `
                <tr style="border: 1px solid #cbd5e1;">
                  <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${idx + 1}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: bold; color: #0f172a;">${item.raw_material_name}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-weight: 900; font-family: monospace; font-size: 13px;">${item.actual_quantity || item.standard_quantity}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${item.unit}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; color: #94a3b8;">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-size: 14px;">[ &nbsp; ]</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="font-size: 10.5px; color: #475569; border: 1px dashed #94a3b8; padding: 6px 10px; border-radius: 4px; margin-bottom: 20px;">
          📌 <strong>Storekeeper Note:</strong> Please weigh all ingredients on digital scale and verify quality before handing over to Karigar.
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px;">
          <div style="text-align: center; width: 180px; border-top: 1px solid #000; padding-top: 4px;">
            <strong>Storekeeper Signature</strong><br>
            <span style="color: #64748b;">(સ્ટોર કીપર સહી)</span>
          </div>
          <div style="text-align: center; width: 180px; border-top: 1px solid #000; padding-top: 4px;">
            <strong>Karigar / Chef Signature</strong><br>
            <span style="color: #64748b;">(કારીગર સહી)</span>
          </div>
        </div>
      </div>
    `;

    printIsolatedDocument(html, { paperSize: 'A5', documentTitle: `Store_Slip_${order.batch_number}` });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Batch Production Audit: ${order.batch_number}`}
      subtitle={`Manufactured on ${formatDate(order.date)} | Voucher #${order.manufacturing_no}`}
      maxWidth="780px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrintStoreSlip}
            style={{ color: '#2563eb', borderColor: '#bfdbfe', fontWeight: 800, background: '#eff6ff' }}
          >
            <Printer size={14} /> Print Store Room Issue Slip (કાચો માલ પર્ચી)
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Batch Overview Banner */}
        <div className="glass-panel" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Finished Sweet</span>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
              {order.finished_product_name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Recipe: {order.recipe_name} (v{order.version_number || 1})
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Actual Yield / Planned</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
              {order.actual_output} {order.actual_unit} / {order.planned_quantity} {order.planned_unit}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#fb7185' }}>
              Wastage: {order.wastage_quantity} {order.actual_unit} ({order.wastage_pct}%)
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Final Batch Cost</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(order.total_batch_cost)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Method: {order.costing_method_used}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Actual Cost per Unit</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(order.cost_per_unit)}/{order.actual_unit}
            </div>
            <div style={{ fontSize: '0.72rem', color: order.cost_variance > 0 ? '#fb7185' : '#34d399' }}>
              Std: {formatCurrency(order.standard_cost_per_unit)} (Var: {order.cost_variance > 0 ? '+' : ''}{formatCurrency(order.cost_variance)})
            </div>
          </div>
        </div>

        {/* Consumed Materials Table */}
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '8px' }}>
            Raw Material Ingredients & Valuation Snapshot
          </h4>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Quantity</th>
                  <th>Snapshot Rate (₹)</th>
                  <th>Cost (₹)</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td><strong>{item.raw_material_name}</strong></td>
                    <td className="font-mono">{item.actual_quantity || item.standard_quantity} {item.unit}</td>
                    <td className="font-mono">{formatCurrency(item.unit_cost_snapshot)}/{item.unit}</td>
                    <td className="font-mono" style={{ color: '#fff', fontWeight: 700 }}>
                      {formatCurrency(item.total_cost_snapshot)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Cost Rollup */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '10px'
        }}>
          <div className="glass-card" style={{ padding: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Material Subtotal</span>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(order.total_material_cost)}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Karigar Wages</span>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(order.total_labour_cost)}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Gas / Electricity</span>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(order.total_overhead_cost)}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Packaging & Foil</span>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(order.total_packaging_cost)}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
