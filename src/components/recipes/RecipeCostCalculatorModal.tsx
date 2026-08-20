import React, { useState, useEffect } from 'react';
import { Calculator, Sparkles, TrendingUp, DollarSign, Layers } from 'lucide-react';
import { api } from '../../api/client';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface RecipeCostCalculatorModalProps {
  isOpen: boolean;
  recipeId: number;
  onClose: () => void;
}

export const RecipeCostCalculatorModal: React.FC<RecipeCostCalculatorModalProps> = ({
  isOpen,
  recipeId,
  onClose
}) => {
  const [targetBatchSize, setTargetBatchSize] = useState<number>(10);
  const [costingMethod, setCostingMethod] = useState<string>('WEIGHTED_AVERAGE');
  const [calcData, setCalcData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCostCalculation = async (size: number, method: string) => {
    try {
      setLoading(true);
      const res = await api.calculateRecipeCost({
        recipe_id: recipeId,
        target_batch_size: size,
        costing_method: method
      });
      setCalcData(res);
    } catch (err) {
      console.error('Error calculating recipe cost:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCostCalculation(targetBatchSize, costingMethod);
  }, [recipeId, targetBatchSize, costingMethod]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Recipe Scaler & Costing Simulator: ${calcData?.recipe_name || ''}`}
      subtitle="Interactive batch scaling with live unit conversion, labour rollup & margin estimation"
      maxWidth="780px"
      footer={
        <button className="btn btn-secondary" onClick={onClose}>
          Close Simulator
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Controls Bar */}
        <div className="glass-panel" style={{ padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Desired Production Batch Size ({calcData?.target_batch_unit || 'KG'})</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              className="form-input"
              style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}
              value={targetBatchSize}
              onChange={(e) => setTargetBatchSize(Number(e.target.value) || 1)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Costing Valuation Method</label>
            <select
              className="form-select"
              value={costingMethod}
              onChange={(e) => setCostingMethod(e.target.value)}
            >
              <option value="WEIGHTED_AVERAGE">Weighted Average Purchase Rate (Recommended)</option>
              <option value="LAST_PURCHASE">Last Purchase Rate</option>
              <option value="STANDARD">Standard Formula Budget Rate</option>
            </select>
          </div>
        </div>

        {/* Scaled Ingredients Table */}
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '8px' }}>
            Scaled Bill of Materials (BOM) Requirements
          </h4>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ingredient / Material</th>
                  <th>Scaled Required Qty</th>
                  <th>Rate Applied ({costingMethod === 'WEIGHTED_AVERAGE' ? 'Avg' : costingMethod === 'LAST_PURCHASE' ? 'Last' : 'Std'})</th>
                  <th>Material Cost</th>
                  <th>Current Stock</th>
                </tr>
              </thead>
              <tbody>
                {calcData?.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.item_name}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.item_code}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                        {item.scaled_quantity} {item.unit}
                      </span>
                    </td>
                    <td className="font-mono">
                      {formatCurrency(item.rate_used)}/{item.unit}
                    </td>
                    <td className="font-mono" style={{ color: '#fff', fontWeight: 700 }}>
                      {formatCurrency(item.line_cost)}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: (item.available_stock || 0) < item.scaled_quantity ? '#fb7185' : '#34d399'
                      }}>
                        {item.available_stock || 0} {item.unit}
                      </span>
                      {(item.available_stock || 0) < item.scaled_quantity && (
                        <span className="badge badge-red" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>Shortage</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost Summary Breakdown Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '10px'
        }}>
          <div className="glass-card" style={{ padding: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Material Cost</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(calcData?.total_material_cost)}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Karigar / Labour</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(calcData?.total_labour_cost)}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Gas / Overhead</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(calcData?.total_overhead_cost)}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Packaging & Foil</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(calcData?.total_packaging_cost)}
            </div>
          </div>
        </div>

        {/* Grand Total Cost & Margin Highlight Banner */}
        <div className="glass-card" style={{
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(16, 185, 129, 0.15))',
          borderColor: '#f59e0b',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
              Base Production Cost per KG
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(calcData?.cost_per_kg)}/KG
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Expected Net Yield: <strong>{calcData?.expected_yield} KG</strong> ({calcData?.expected_wastage_pct}% process loss)
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>
              Estimated Profit Margin (@ MRP {formatCurrency(calcData?.selling_rate)}/KG)
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
              +{formatCurrency(calcData?.estimated_gross_profit_per_kg)}/KG ({calcData?.estimated_gross_margin_pct}%)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Total Batch Profit: <strong>{formatCurrency((calcData?.estimated_gross_profit_per_kg || 0) * (calcData?.expected_yield || 0))}</strong>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
