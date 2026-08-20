import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Search, 
  Filter, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  SlidersHorizontal,
  History
} from 'lucide-react';
import { api } from '../../api/client';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportUtils';
import { StatCard } from '../common/StatCard';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { BranchStockAuditModal } from './BranchStockAuditModal';
import { Building2 } from 'lucide-react';

export const InventoryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'items' | 'movements'>('items');
  const [summary, setSummary] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isBranchAuditOpen, setIsBranchAuditOpen] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [sum, stockItems, movs] = await Promise.all([
        api.getInventorySummary(),
        api.getInventoryItems({ search, low_stock_only: lowStockFilter, item_type: itemTypeFilter }),
        api.getStockMovements({ search })
      ]);
      setSummary(sum);
      setItems(stockItems);
      setMovements(movs);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [search, lowStockFilter, itemTypeFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Inventory, Valuation & Stock Movements
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            The Golden Rule: Every stock change has a source transaction & immutable audit trail
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => exportToCSV(activeTab === 'items' ? items : movements, `Matuki_Inventory_${activeTab}.csv`)}
          >
            <Download size={14} />
            Export CSV
          </button>

          <button
            className="btn btn-sm"
            onClick={() => setIsBranchAuditOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
              color: '#ffffff',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(15, 118, 110, 0.3)'
            }}
          >
            <Building2 size={15} />
            🏢 3-Branch Physical Audit ⚡
          </button>

          <button className="btn btn-primary" onClick={() => setIsAdjustOpen(true)}>
            <SlidersHorizontal size={16} />
            Adjust Stock
          </button>
        </div>
      </div>

      {/* Valuation KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px'
      }}>
        <StatCard
          title="Total Stock Valuation"
          value={formatCurrency(summary?.total_valuation)}
          subtitle={`${summary?.raw_materials?.count || 0} Materials + ${summary?.finished_products?.count || 0} Finished`}
          icon={<Layers size={20} />}
          color="amber"
        />

        <StatCard
          title="Raw Materials Stock"
          value={formatCurrency(summary?.raw_materials?.valuation)}
          subtitle={`${summary?.raw_materials?.count || 0} Raw Items`}
          color="blue"
        />

        <StatCard
          title="Finished Sweets Stock"
          value={formatCurrency(summary?.finished_products?.valuation)}
          subtitle={`${summary?.finished_products?.count || 0} Sweet Types`}
          color="green"
        />

        <StatCard
          title="Low Stock Alert Items"
          value={summary?.total_low_stock || 0}
          subtitle="Items below safety threshold"
          color={summary?.total_low_stock > 0 ? 'red' : 'green'}
          onClick={() => setLowStockFilter(!lowStockFilter)}
        />
      </div>

      {/* Tab Selector & Filters */}
      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className={`btn btn-sm ${activeTab === 'items' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('items')}
          >
            Current Stock Register
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'movements' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('movements')}
          >
            <History size={14} />
            Stock Movements Trail (Log)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '500px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '32px', padding: '6px 12px 6px 32px', fontSize: '0.82rem' }}
              placeholder="Search stock item, reference #, or voucher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#fb7185', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => setLowStockFilter(e.target.checked)}
            />
            Low Stock Only
          </label>
        </div>
      </div>

      {/* Main Content: Current Stock Register Table */}
      {activeTab === 'items' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Item / Sweet Name</th>
                <th>Type</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Min Safety Stock</th>
                <th>Cost Rate (₹)</th>
                <th>Total Valuation (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="font-mono" style={{ color: '#fbbf24', fontWeight: 700 }}>
                      {item.code}
                    </td>
                    <td>
                      <strong style={{ color: '#fff' }}>{item.name}</strong>
                    </td>
                    <td>
                      <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                        {item.item_type}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.category_name || '-'}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: item.is_low_stock ? '#fb7185' : '#34d399'
                      }}>
                        {item.current_stock} {item.unit}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {item.min_stock} {item.unit}
                    </td>
                    <td className="font-mono">{formatCurrency(item.cost_rate)}/{item.unit}</td>
                    <td className="font-mono" style={{ fontWeight: 800, color: '#34d399' }}>
                      {formatCurrency(item.total_valuation)}
                    </td>
                    <td>
                      {item.is_low_stock ? (
                        <span className="badge badge-red">LOW STOCK</span>
                      ) : (
                        <span className="badge badge-green">IN STOCK</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Movements Log Table */}
      {activeTab === 'movements' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Item Name</th>
                <th>Movement Type</th>
                <th>Quantity</th>
                <th>Reference Type</th>
                <th>Reference #</th>
                <th>Cost Rate</th>
                <th>Notes / Reason</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No stock movements recorded.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {formatDateTime(m.movement_date)}
                    </td>
                    <td>
                      <strong style={{ color: '#fff' }}>{m.item_name}</strong>
                    </td>
                    <td>
                      <span className={`badge ${m.quantity > 0 ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.7rem' }}>
                        {m.movement_type}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: m.quantity > 0 ? '#34d399' : '#fb7185'
                      }}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {m.reference_type}
                    </td>
                    <td className="font-mono" style={{ color: '#fbbf24' }}>
                      {m.reference_no || '-'}
                    </td>
                    <td className="font-mono">{formatCurrency(m.cost_rate)}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                      {m.notes}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {m.created_by}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isAdjustOpen && (
        <StockAdjustmentModal
          isOpen={isAdjustOpen}
          onClose={() => setIsAdjustOpen(false)}
          onSuccess={() => {
            setIsAdjustOpen(false);
            fetchInventory();
          }}
        />
      )}

      {isBranchAuditOpen && (
        <BranchStockAuditModal
          isOpen={isBranchAuditOpen}
          onClose={() => setIsBranchAuditOpen(false)}
          onSuccess={() => {
            fetchInventory();
          }}
        />
      )}
    </div>
  );
};
