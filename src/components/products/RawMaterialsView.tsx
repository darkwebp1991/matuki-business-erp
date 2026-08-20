import React, { useState, useEffect } from 'react';
import { Plus, Search, Boxes, Edit, Download, History } from 'lucide-react';
import { api } from '../../api/client';
import { RawMaterial } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportUtils';
import { RawMaterialModal } from './RawMaterialModal';

export const RawMaterialsView: React.FC = () => {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRM, setEditingRM] = useState<RawMaterial | null>(null);

  const fetchRawMaterials = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      const data = await api.getRawMaterials(params);
      setRawMaterials(data);
    } catch (err) {
      console.error('Error fetching raw materials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRawMaterials();
  }, [search]);

  const handleOpenCreate = () => {
    setEditingRM(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rm: RawMaterial) => {
    setEditingRM(rm);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchRawMaterials();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Raw Materials Master
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            Cashew, Ghee, Sugar, Mawa, Milk, Spices, Vark with live Weighted Average purchase rates
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => exportToCSV(rawMaterials, 'Matuki_Raw_Materials.csv')}
          >
            <Download size={14} />
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            Add Raw Material
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder="Search Raw Materials (Cashew, Ghee, Sugar, Mawa, Cardamom)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Material Name</th>
              <th>Category</th>
              <th>Base Unit</th>
              <th>Current Purchase Rate</th>
              <th>Weighted Avg Rate</th>
              <th>Last Purchase Rate</th>
              <th>Current Stock</th>
              <th>Default Supplier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rawMaterials.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No raw materials found.
                </td>
              </tr>
            ) : (
              rawMaterials.map((rm) => (
                <tr key={rm.id}>
                  <td className="font-mono" style={{ color: '#fbbf24', fontWeight: 700 }}>
                    {rm.code}
                  </td>
                  <td>
                    <strong style={{ color: '#fff' }}>{rm.name}</strong>
                  </td>
                  <td>
                    <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                      {rm.category_name || 'Raw Material'}
                    </span>
                  </td>
                  <td><strong>{rm.unit}</strong></td>
                  <td className="font-mono" style={{ color: '#38bdf8' }}>
                    {formatCurrency(rm.current_purchase_rate)}/{rm.unit}
                  </td>
                  <td className="font-mono" style={{ color: '#34d399', fontWeight: 700 }}>
                    {formatCurrency(rm.average_purchase_rate)}/{rm.unit}
                  </td>
                  <td className="font-mono">
                    {formatCurrency(rm.last_purchase_rate)}
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      color: rm.current_stock <= rm.min_stock ? '#fb7185' : '#34d399'
                    }}>
                      {rm.current_stock} {rm.unit}
                    </span>
                    {rm.current_stock <= rm.min_stock && (
                      <span className="badge badge-red" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>LOW</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {rm.default_supplier_name || '-'}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenEdit(rm)}
                      style={{ padding: '4px 8px' }}
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <RawMaterialModal
          isOpen={isModalOpen}
          rawMaterial={editingRM}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};
