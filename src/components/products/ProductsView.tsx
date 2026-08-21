import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Package, 
  Factory,
  SlidersHorizontal, 
  Download, 
  Edit,
  Trash2,
  ChefHat,
  ArrowLeft,
  Eye,
  Sparkles
} from 'lucide-react';
import { api } from '../../api/client';
import { Product, StockMovement, Category, Unit, User } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV, downloadItemTemplateCSV } from '../../utils/exportUtils';
import { canEditModule, isViewOnlyModule } from '../../utils/permissionUtils';
import { ProductModal } from './ProductModal';
import { StockAdjustmentModal } from '../inventory/StockAdjustmentModal';
import { NewBatchModal } from '../manufacturing/NewBatchModal';
import { BulkImportModal } from '../common/BulkImportModal';
import { VoiceSearchButton } from '../common/VoiceSearchButton';
import { RecipeScalerModal } from './RecipeScalerModal';
import { CategoryModal } from './CategoryModal';
import { UnitModal } from './UnitModal';

interface ProductsViewProps {
  initialSearch?: string;
  currentUser?: User | null;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ initialSearch = '', currentUser }) => {
  const [topTab, setTopTab] = useState<'PRODUCTS' | 'CATEGORY' | 'UNITS'>('PRODUCTS');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [categorySearch, setCategorySearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const canEdit = canEditModule(currentUser, 'products');
  const isViewOnly = isViewOnlyModule(currentUser, 'products');

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  // Selected Product Details & Movements
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemMovements, setItemMovements] = useState<StockMovement[]>([]);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isManufactureModalOpen, setIsManufactureModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchInitial = async () => {
    try {
      setLoading(true);
      const [prods, cats, un] = await Promise.all([
        api.getProducts({ search }),
        api.getCategories(),
        api.getUnits()
      ]);
      setProducts(prods);
      setCategories(cats);
      setUnits(un);
      if (prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id);
      }
    } catch (err) {
      console.error('Error fetching items master:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitial();
  }, [search]);

  // Real-Time SSE Sync for Products
  useEffect(() => {
    const unsubscribe = api.subscribeToEvents((event) => {
      if (event?.type === 'DATA_CHANGED' && (!event.module || event.module === 'products')) {
        fetchInitial();
      }
    });
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') unsubscribe();
    };
  }, [search]);

  useEffect(() => {
    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      setSelectedProduct(prod || null);

      api.getStockMovements({ item_type: prod?.product_type || 'PRODUCT', item_id: selectedProductId })
        .then(setItemMovements)
        .catch(console.error);
    }
  }, [selectedProductId, products]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (selectedProduct) {
      setEditingProduct(selectedProduct);
      setIsProductModalOpen(true);
    }
  };

  const handleDeleteProduct = async (prod: Product, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!window.confirm(`Are you sure you want to delete item "${prod.name}" (${prod.code})?`)) return;

    try {
      setLoading(true);
      await api.deleteProduct(prod.id);
      const remaining = products.filter(p => p.id !== prod.id);
      setProducts(remaining);
      if (selectedProductId === prod.id) {
        setSelectedProductId(remaining.length > 0 ? remaining[0].id : null);
      }
      await fetchInitial();
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (id: number) => {
    setSelectedProductId(id);
    setShowMobileDetail(true);
  };

  // Category Handlers
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?\n(Any items in this category will become unassigned)`)) return;
    try {
      setLoading(true);
      await api.deleteCategory(cat.id);
      await fetchInitial();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  // Unit Handlers
  const handleOpenCreateUnit = () => {
    setEditingUnit(null);
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnit = (u: Unit) => {
    setEditingUnit(u);
    setIsUnitModalOpen(true);
  };

  const handleDeleteUnit = async (u: Unit) => {
    if (!window.confirm(`Are you sure you want to delete measurement unit "${u.name}" (${u.symbol})?`)) return;
    try {
      setLoading(true);
      await api.deleteUnit(u.id);
      await fetchInitial();
    } catch (err: any) {
      alert(err.message || 'Failed to delete measurement unit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* Top Tabs: PRODUCTS | CATEGORY | UNITS */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-card)',
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['PRODUCTS', 'CATEGORY', 'UNITS'] as const).map((tab) => (
            <button
              key={tab}
              style={{
                padding: '6px 16px',
                fontSize: '0.8rem',
                fontWeight: 800,
                borderRadius: '6px',
                border: 'none',
                background: topTab === tab ? '#d32f2f' : 'transparent',
                color: topTab === tab ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                letterSpacing: '0.03em'
              }}
              onClick={() => {
                setTopTab(tab);
                setShowMobileDetail(false);
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* View Mode Indicator Badge */}
        {isViewOnly && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: '#fef3c7',
            color: '#92400e',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '0.72rem',
            fontWeight: 800,
            border: '1px solid #fde68a'
          }}>
            <Eye size={13} /> View-Only Mode (Storekeeper / Karigar)
          </div>
        )}
      </div>

      {topTab === 'PRODUCTS' && (
        <div className={`vyapar-party-layout ${showMobileDetail ? 'mobile-show-detail' : 'mobile-show-list'}`} style={{ flex: 1, minHeight: '500px' }}>
          {/* LEFT COLUMN: Items List with Stock & Quantities */}
          <div className="vyapar-party-sidebar" style={{ display: showMobileDetail ? undefined : 'flex' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card-alt)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '6px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Items / Sweets ({products.length})
                </span>
                {canEdit && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      type="button"
                      className="btn btn-secondary btn-sm" 
                      onClick={() => setIsBulkImportOpen(true)}
                      style={{ fontSize: '0.72rem', padding: '3px 8px', fontWeight: 800, color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5' }}
                      title="Import multiple items/sweets from Excel"
                    >
                      📥 Excel
                    </button>
                    <button className="btn btn-vyapar-red btn-sm" onClick={handleOpenCreate} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                      <Plus size={13} /> + Item
                    </button>
                  </div>
                )}
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '30px', paddingRight: '10px', padding: '6px 10px 6px 30px', fontSize: '0.82rem', width: '100%' }}
                  placeholder="Search sweet / code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '8px', padding: '0 4px' }}>
                <span>ITEM NAME</span>
                <span>STOCK</span>
              </div>
            </div>

            {/* Scrollable Items List */}
            <div className="vyapar-party-list">
              {products.map(p => {
                const isSelected = selectedProductId === p.id;
                const isNegative = p.current_stock < 0;
                const isOnline = p.available_online !== 0;
                return (
                  <div
                    key={p.id}
                    className={`vyapar-party-item ${isSelected ? 'active' : ''}`}
                    onClick={() => handleItemSelect(p.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.84rem', color: isSelected ? '#d32f2f' : 'var(--text-main)' }}>
                        {p.name} {p.gujarati_name ? <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600 }}>({p.gujarati_name})</span> : ''}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span>{p.code} • {p.unit}</span>
                        {p.recipe_id ? (
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '8px',
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px'
                          }} title={`🥣 Manufacturing Recipe Formula: ${p.recipe_name || 'Available'}`}>
                            🥣 RECIPE
                          </span>
                        ) : null}
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '8px',
                          background: isOnline ? '#dcfce7' : '#fee2e2',
                          color: isOnline ? '#166534' : '#991b1b',
                          border: isOnline ? '1px solid #86efac' : '1px solid #fca5a5'
                        }}>
                          {isOnline ? '🌐 ONLINE' : '🚫 OFF'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontWeight: 900,
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.86rem',
                          color: isNegative ? '#dc2626' : p.current_stock === 0 ? 'var(--text-secondary)' : '#15803d'
                        }}>
                          {p.current_stock}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                          {p.unit}
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProduct(p, e)}
                          title={`Delete item "${p.name}"`}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            color: '#b91c1c',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT MAIN PANEL: Selected Item Details & Recipe Scaler */}
          {selectedProduct ? (
            <div className="vyapar-party-detail-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
              
              {/* Mobile Back Button */}
              <div className="mobile-only-header" style={{ display: 'none', padding: '6px 0' }}>
                <button
                  type="button"
                  onClick={() => setShowMobileDetail(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
                >
                  <ArrowLeft size={16} /> પાછા જાઓ (Back to Items)
                </button>
              </div>

              {/* Item Top Banner Card */}
              <div className="vyapar-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                      {selectedProduct.name} {selectedProduct.gujarati_name ? `(${selectedProduct.gujarati_name})` : ''}
                    </h2>
                    
                    {/* 1-Click Online Toggle Button */}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={async () => {
                          const newStatus = selectedProduct.available_online === 0 ? 1 : 0;
                          setProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, available_online: newStatus } : p));
                          setSelectedProduct(prev => prev ? { ...prev, available_online: newStatus } : null);
                          try {
                            await api.toggleProductOnline(selectedProduct.id, newStatus);
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        style={{
                          padding: '3px 10px',
                          borderRadius: '16px',
                          fontWeight: 900,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          border: selectedProduct.available_online !== 0 ? '1px solid #16a34a' : '1px solid #dc2626',
                          background: selectedProduct.available_online !== 0 ? '#dcfce7' : '#fee2e2',
                          color: selectedProduct.available_online !== 0 ? '#15803d' : '#b91c1c',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Click to toggle Online QR ordering for this item"
                      >
                        {selectedProduct.available_online !== 0 ? '🌐 Online: YES (Active)' : '🚫 Online: NO (Disabled)'}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <span>SALE RATE: <strong style={{ color: '#15803d', fontFamily: 'var(--font-mono)' }}>{formatCurrency(selectedProduct.selling_rate)}</strong></span>
                    <span>PURCHASE/MFG: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(selectedProduct.purchase_rate)}</strong></span>
                    <span>STOCK: <strong style={{ color: selectedProduct.current_stock < 0 ? '#dc2626' : '#15803d', fontFamily: 'var(--font-mono)' }}>{selectedProduct.current_stock} {selectedProduct.unit}</strong></span>
                    <span>VALUE: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{formatCurrency(selectedProduct.current_stock > 0 ? selectedProduct.current_stock * selectedProduct.purchase_rate : 0)}</strong></span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Dynamic Recipe Batch Scaling Calculator - Open for all staff & storekeepers */}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setIsRecipeModalOpen(true)}
                    style={{
                      background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '7px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Calculate raw materials for 1kg, 2.5kg, 5kg, 50kg, 100kg"
                  >
                    <ChefHat size={15} color="#fef08a" />
                    👨‍🍳 Recipe Calculator (માપ ગણતરી)
                  </button>

                  {canEdit && (
                    <>
                      <button
                        className="btn btn-vyapar-red"
                        onClick={() => setIsManufactureModalOpen(true)}
                        style={{ padding: '7px 14px', fontSize: '0.82rem', fontWeight: 700 }}
                      >
                        <Factory size={15} />
                        MANUFACTURE
                      </button>

                      <button
                        className="btn btn-vyapar-blue"
                        onClick={() => setIsAdjustModalOpen(true)}
                        style={{ padding: '7px 14px', fontSize: '0.82rem', fontWeight: 700 }}
                      >
                        <SlidersHorizontal size={15} />
                        ADJUST
                      </button>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleOpenEdit}
                        title="Edit Item Details"
                      >
                        <Edit size={14} /> Edit
                      </button>

                      <button
                        className="btn btn-sm"
                        onClick={() => handleDeleteProduct(selectedProduct)}
                        title="Delete Item"
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fca5a5',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Transactions Section */}
              <div className="vyapar-card" style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    TRANSACTIONS HISTORY ({itemMovements.length})
                  </h3>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => exportToCSV(itemMovements, `${selectedProduct.name}_Stock_History.csv`)}
                  >
                    <Download size={13} /> Export CSV
                  </button>
                </div>

                <div className="table-container" style={{ flex: 1, maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>TYPE</th>
                        <th>REF NO</th>
                        <th>DATE</th>
                        <th>QUANTITY</th>
                        <th>PRICE / RATE</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemMovements.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                            No stock transactions recorded for this item yet.
                          </td>
                        </tr>
                      ) : (
                        itemMovements.map(m => {
                          const isIn = m.movement_type === 'IN' || m.movement_type === 'PRODUCTION_IN';
                          return (
                            <tr key={m.id}>
                              <td>
                                <span className={`badge ${isIn ? 'badge-green' : 'badge-orange'}`} style={{ fontWeight: 800 }}>
                                  {m.movement_type}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                {m.reference_no || `#${m.id}`}
                              </td>
                              <td style={{ color: 'var(--text-secondary)' }}>
                                {formatDate(m.movement_date)}
                              </td>
                              <td style={{
                                fontWeight: 800,
                                fontFamily: 'var(--font-mono)',
                                color: isIn ? '#15803d' : '#dc2626'
                              }}>
                                {isIn ? `+${m.quantity}` : `-${m.quantity}`} {selectedProduct.unit}
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>
                                {formatCurrency(m.cost_rate || 0)}
                              </td>
                              <td>
                                <span className="badge badge-blue">Recorded</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: '12px', padding: '30px' }}>
              Select an item from the left list to view stock details & recipe calculator.
            </div>
          )}
        </div>
      )}

      {/* Category Tab */}
      {topTab === 'CATEGORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          <div className="vyapar-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                📦 Item Categories ({categories.length})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Create and manage categories for Sweets, Snacks, Raw Materials, and Packaging
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '30px', fontSize: '0.82rem', width: '100%', padding: '6px 10px 6px 30px' }}
                  placeholder="Search category..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
              </div>

              {canEdit && (
                <button
                  type="button"
                  className="btn btn-vyapar-red btn-sm"
                  onClick={handleOpenCreateCategory}
                  style={{ fontSize: '0.82rem', padding: '6px 14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={15} /> + Add Category (નવી કેટેગરી)
                </button>
              )}
            </div>
          </div>

          {/* Categories Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {categories
              .filter(c => !categorySearch || c.name.toLowerCase().includes(categorySearch.toLowerCase()) || (c.type && c.type.toLowerCase().includes(categorySearch.toLowerCase())))
              .map(c => {
                const isFinished = c.type === 'FINISHED_PRODUCT';
                const isRaw = c.type === 'RAW_MATERIAL';
                const isPkg = c.type === 'PACKAGING';
                const isSemi = c.type === 'SEMI_FINISHED';

                return (
                  <div
                    key={c.id}
                    className="vyapar-card"
                    style={{
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                          {c.name}
                        </div>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '12px',
                          background: isFinished ? '#dcfce7' : isRaw ? '#ffedd5' : isPkg ? '#dbeafe' : isSemi ? '#fef9c3' : '#f3e8ff',
                          color: isFinished ? '#15803d' : isRaw ? '#c2410c' : isPkg ? '#1e40af' : isSemi ? '#854d0e' : '#6b21a8',
                          border: `1px solid ${isFinished ? '#86efac' : isRaw ? '#fdba74' : isPkg ? '#93c5fd' : isSemi ? '#fde047' : '#d8b4fe'}`
                        }}>
                          {isFinished ? '🍬 SWEETS' : isRaw ? '🌾 RAW MATERIAL' : isPkg ? '📦 PACKAGING' : isSemi ? '🥣 SEMI-FINISHED' : '⚡ EXPENSE'}
                        </span>
                      </div>

                      {c.description && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                          {c.description}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '0.72rem' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: 700 }}>
                          🍬 {c.product_count || 0} Products
                        </span>
                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: 700 }}>
                          🌾 {c.raw_material_count || 0} Raw Materials
                        </span>
                      </div>
                    </div>

                    {canEdit && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEditCategory(c)}
                          style={{ fontSize: '0.74rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Edit Category"
                        >
                          <Edit size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleDeleteCategory(c)}
                          style={{
                            fontSize: '0.74rem',
                            padding: '3px 8px',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                          title="Delete Category"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Units Tab */}
      {topTab === 'UNITS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          <div className="vyapar-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                ⚖️ Measurement Units ({units.length})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Manage units for selling, purchasing, and manufacturing conversions (KG, GM, PCS, BOX, LTR, PKT)
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '30px', fontSize: '0.82rem', width: '100%', padding: '6px 10px 6px 30px' }}
                  placeholder="Search unit..."
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                />
              </div>

              {canEdit && (
                <button
                  type="button"
                  className="btn btn-vyapar-blue btn-sm"
                  onClick={handleOpenCreateUnit}
                  style={{ fontSize: '0.82rem', padding: '6px 14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={15} /> + Add Unit (નવો એકમ)
                </button>
              )}
            </div>
          </div>

          {/* Units Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {units
              .filter(u => !unitSearch || u.name.toLowerCase().includes(unitSearch.toLowerCase()) || (u.symbol && u.symbol.toLowerCase().includes(unitSearch.toLowerCase())))
              .map(u => {
                const isWeight = u.unit_type === 'WEIGHT';
                const isVolume = u.unit_type === 'VOLUME';

                return (
                  <div
                    key={u.id}
                    className="vyapar-card"
                    style={{
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                            {u.name}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.84rem', color: '#0284c7', marginTop: '2px' }}>
                            Code: {u.symbol || u.short_name}
                          </div>
                        </div>

                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '12px',
                          background: isWeight ? '#fef3c7' : isVolume ? '#e0f2fe' : '#f1f5f9',
                          color: isWeight ? '#92400e' : isVolume ? '#0369a1' : '#334155',
                          border: `1px solid ${isWeight ? '#fde68a' : isVolume ? '#bae6fd' : '#cbd5e1'}`
                        }}>
                          {isWeight ? '⚖️ WEIGHT' : isVolume ? '🧪 VOLUME' : '🔢 COUNT'}
                        </span>
                      </div>

                      <div style={{ marginTop: '8px', fontSize: '0.74rem', color: 'var(--text-secondary)', background: '#f8fafc', padding: '6px 8px', borderRadius: '4px' }}>
                        <div><strong>Base Unit:</strong> {u.base_unit || u.symbol}</div>
                        <div><strong>Conversion Factor:</strong> {u.conversion_to_base || 1}</div>
                      </div>
                    </div>

                    {canEdit && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEditUnit(u)}
                          style={{ fontSize: '0.74rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Edit Unit"
                        >
                          <Edit size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleDeleteUnit(u)}
                          style={{
                            fontSize: '0.74rem',
                            padding: '3px 8px',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                          title="Delete Unit"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <CategoryModal
          isOpen={isCategoryModalOpen}
          category={editingCategory}
          onClose={() => setIsCategoryModalOpen(false)}
          onSuccess={() => {
            setIsCategoryModalOpen(false);
            fetchInitial();
          }}
        />
      )}

      {/* Unit Modal */}
      {isUnitModalOpen && (
        <UnitModal
          isOpen={isUnitModalOpen}
          unit={editingUnit}
          onClose={() => setIsUnitModalOpen(false)}
          onSuccess={() => {
            setIsUnitModalOpen(false);
            fetchInitial();
          }}
        />
      )}

      {/* Recipe Scaler Modal */}
      {isRecipeModalOpen && (
        <RecipeScalerModal
          isOpen={isRecipeModalOpen}
          product={selectedProduct}
          onClose={() => setIsRecipeModalOpen(false)}
        />
      )}

      {/* Product Modal */}
      {isProductModalOpen && (
        <ProductModal
          isOpen={isProductModalOpen}
          product={editingProduct}
          onClose={() => setIsProductModalOpen(false)}
          onSuccess={() => {
            setIsProductModalOpen(false);
            fetchInitial();
          }}
        />
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <StockAdjustmentModal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          onSuccess={() => {
            setIsAdjustModalOpen(false);
            fetchInitial();
          }}
        />
      )}

      {/* Manufacture Modal */}
      {isManufactureModalOpen && (
        <NewBatchModal
          isOpen={isManufactureModalOpen}
          preSelectedProductId={selectedProduct?.id}
          onClose={() => setIsManufactureModalOpen(false)}
          onSuccess={() => {
            setIsManufactureModalOpen(false);
            fetchInitial();
          }}
        />
      )}

      {/* Bulk Excel/CSV Import Modal */}
      {isBulkImportOpen && (
        <BulkImportModal
          isOpen={isBulkImportOpen}
          title="Bulk Import Items / Sweets"
          subtitle="Upload Excel / CSV to bulk create or update sweets & stock"
          type="PRODUCTS"
          onDownloadTemplate={downloadItemTemplateCSV}
          onImport={(rows) => api.bulkImportProducts(rows)}
          onClose={() => setIsBulkImportOpen(false)}
          onSuccessCallback={() => {
            setIsBulkImportOpen(false);
            fetchInitial();
          }}
        />
      )}
    </div>
  );
};
