import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Factory, 
  Eye, 
  Download, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Layers,
  ChefHat,
  Scale,
  FileText,
  Printer,
  ArrowRight
} from 'lucide-react';
import { api } from '../../api/client';
import { ManufacturingOrder, Recipe } from '../../types';
import { formatCurrency, formatDate, formatQuantity } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportUtils';
import { StatusBadge } from '../common/StatusBadge';
import { NewBatchModal } from './NewBatchModal';
import { BatchDetailModal } from './BatchDetailModal';
import { VoiceSearchButton } from '../common/VoiceSearchButton';
import { printIsolatedDocument } from '../../utils/printUtils';
import { getGujaratiName, formatGujaratiQuantity } from '../../utils/gujaratiTranslation';

interface ManufacturingViewProps {
  onOpenNewBatchModal?: boolean;
}

export const ManufacturingView: React.FC<ManufacturingViewProps> = () => {
  const [activeTab, setActiveTab] = useState<'RECIPES' | 'BATCHES'>('RECIPES');
  
  // Batches state
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchSearch, setBatchSearch] = useState('');
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [batchTargetProductId, setBatchTargetProductId] = useState<number | null>(null);

  // Recipes state
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [recipeDetail, setRecipeDetail] = useState<any>(null);
  const [targetBatchKg, setTargetBatchKg] = useState<number>(10);
  const [customBatchInput, setCustomBatchInput] = useState<string>('10');
  const [settings, setSettings] = useState<any>(null);

  const fetchOrders = async () => {
    try {
      setLoadingBatches(true);
      const data = await api.getManufacturingOrders({ search: batchSearch });
      setOrders(data);
    } catch (err) {
      console.error('Error loading manufacturing orders:', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchRecipes = async () => {
    try {
      setLoadingRecipes(true);
      const data = await api.getRecipes({ search: recipeSearch });
      setRecipes(data);
      if (data.length > 0 && !selectedRecipeId) {
        setSelectedRecipeId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading recipes:', err);
    } finally {
      setLoadingRecipes(false);
    }
  };

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [batchSearch]);

  useEffect(() => {
    fetchRecipes();
  }, [recipeSearch]);

  useEffect(() => {
    if (selectedRecipeId) {
      api.getRecipeById(selectedRecipeId)
        .then(res => {
          setRecipeDetail(res);
          const base = Number(res.batch_size) || 10;
          setTargetBatchKg(base);
          setCustomBatchInput(String(base));
        })
        .catch(console.error);
    }
  }, [selectedRecipeId]);

  const handlePrintGujaratiKarigarSlip = () => {
    if (!recipeDetail) return;
    const sweetName = recipeDetail.product_name || recipeDetail.name;
    const sweetGuName = getGujaratiName(sweetName);
    const companyName = settings?.company_name || 'MATUKI SWEETS & SNACKS';
    const companyAddress = settings?.address ? `${settings.address}${settings.city ? `, ${settings.city}` : ''}${settings.state ? `, ${settings.state}` : ''}` : 'Katargam, Surat, Gujarat';
    const companyPhone = settings?.phone || '+91 98765 43210';
    const scaleFactor = (targetBatchKg || 1) / (recipeDetail.batch_size || 1);
    const items = (recipeDetail.items || []).map((item: any) => {
      const rawQty = (item.quantity || 0) * scaleFactor;
      return {
        ...item,
        gujaratiName: getGujaratiName(item.item_name || ''),
        scaledQtyFormatted: formatGujaratiQuantity(rawQty, item.unit),
        rawQty
      };
    });

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
            👨‍🍳 કારીગર ઉત્પાદન માપ સ્લિપ (SWEET PRODUCTION KARIGAR SLIP)
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: #fffbeb; border: 2px solid #b45309; padding: 6px 12px; border-radius: 6px; margin-bottom: 8px;">
          <div>
            <div style="font-size: 11.5px; color: #78350f; font-weight: 700;">મીઠાઈનું નામ (Sweet Item):</div>
            <div style="font-size: 17px; font-weight: 900; color: #000;">
              ${sweetGuName} <span style="font-size: 13px; font-weight: 700; color: #475569;">(${sweetName})</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11.5px; color: #78350f; font-weight: 700;">લક્ષિત બેચ વજન (Batch Weight):</div>
            <div style="font-size: 19px; font-weight: 900; color: #b45309; font-family: monospace;">
              ${targetBatchKg} KG (કિલો)
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
              ${items.map((ing: any, idx: number) => `
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
      documentTitle: `${sweetName}_Gujarati_Karigar_Slip_${targetBatchKg}KG`
    });
  };

  const filteredRecipes = recipes.filter(r => 
    !recipeSearch || 
    r.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
    (r.code && r.code.toLowerCase().includes(recipeSearch.toLowerCase())) ||
    ((r as any).product_name && (r as any).product_name.toLowerCase().includes(recipeSearch.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Header & Tab Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Manufacturing & Sweet Formulas
            </h2>
            <span style={{
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              🥣 {recipes.length} Sweet Formulas Loaded
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Browse sweet formulas, scale raw materials for 1kg to 100kg+, and log production batches
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activeTab === 'BATCHES' && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportToCSV(orders, 'Matuki_Manufacturing_Batches.csv')}
            >
              <Download size={14} /> Export CSV
            </button>
          )}
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setBatchTargetProductId(null);
              setIsNewBatchOpen(true);
            }}
            style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Factory size={16} /> + Produce Batch (નવું ઉત્પાદન)
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('RECIPES')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            border: activeTab === 'RECIPES' ? '2px solid #d97706' : '1px solid var(--border-color)',
            background: activeTab === 'RECIPES' ? '#fef3c7' : 'var(--bg-card)',
            color: activeTab === 'RECIPES' ? '#b45309' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ChefHat size={16} />
          🥣 Sweet Recipes Master ({recipes.length} ફોર્મ્યુલા)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BATCHES')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            border: activeTab === 'BATCHES' ? '2px solid #2563eb' : '1px solid var(--border-color)',
            background: activeTab === 'BATCHES' ? '#eff6ff' : 'var(--bg-card)',
            color: activeTab === 'BATCHES' ? '#1d4ed8' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Factory size={16} />
          🏭 Production Batch Log ({orders.length} બેચ)
        </button>
      </div>

      {/* TAB 1: SWEET RECIPES EXPLORER */}
      {activeTab === 'RECIPES' && (
        <div className="vyapar-party-layout" style={{ minHeight: '560px' }}>
          
          {/* Left Column: List of All Recipes */}
          <div className="vyapar-party-sidebar" style={{ width: '320px', minWidth: '300px' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card-alt)' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
                Sweet Recipes ({filteredRecipes.length})
              </span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '30px', paddingRight: '34px', padding: '5px 34px 5px 30px', fontSize: '0.8rem', width: '100%' }}
                  placeholder="Search sweet formula..."
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                />
                <div style={{ position: 'absolute', right: '4px' }}>
                  <VoiceSearchButton 
                    onTranscript={(spoken) => setRecipeSearch(spoken)}
                    title="🎙️ બોલીને રેસિપી શોધો"
                  />
                </div>
              </div>
            </div>

            {/* Scrollable Recipe List */}
            <div className="vyapar-party-list" style={{ flex: 1, overflowY: 'auto' }}>
              {loadingRecipes ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading recipes...</div>
              ) : filteredRecipes.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No recipes found</div>
              ) : (
                filteredRecipes.map(r => {
                  const isSelected = selectedRecipeId === r.id;
                  return (
                    <div
                      key={r.id}
                      className={`vyapar-party-item ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedRecipeId(r.id)}
                      style={{ cursor: 'pointer', padding: '10px 12px' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.84rem', color: isSelected ? '#d97706' : 'var(--text-main)' }}>
                          {r.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{r.code}</span>
                          <span>•</span>
                          <span>Yield: {r.batch_size || 1} {r.batch_unit || 'KG'}</span>
                        </div>
                      </div>
                      <ArrowRight size={14} color={isSelected ? '#d97706' : 'var(--text-muted)'} />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Recipe Details, Ingredients & Dynamic Batch Scaler */}
          <div className="vyapar-party-detail-panel" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            {recipeDetail ? (
              <>
                {/* Header Banner */}
                <div className="vyapar-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                        {recipeDetail.name}
                      </h2>
                      <span style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}>
                        ✅ Formula Active
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span>Code: <strong style={{ color: 'var(--text-main)' }}>{recipeDetail.code}</strong></span>
                      <span>Product: <strong style={{ color: 'var(--text-main)' }}>{recipeDetail.product_name}</strong></span>
                      <span>Base Batch: <strong style={{ color: 'var(--text-main)' }}>{recipeDetail.batch_size} {recipeDetail.batch_unit || 'KG'}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handlePrintGujaratiKarigarSlip}
                      style={{
                        background: '#fef3c7',
                        color: '#78350f',
                        borderColor: '#fde68a',
                        fontWeight: 800,
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Print Gujarati Karigar Slip"
                    >
                      <Printer size={15} />
                      🖨️ ગુજરાતી કારીગર સ્લિપ પ્રિન્ટ કરો
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setBatchTargetProductId(recipeDetail?.product_id);
                        setIsNewBatchOpen(true);
                      }}
                      style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Factory size={15} />
                      Produce This Sweet Batch
                    </button>
                  </div>
                </div>

                {/* Interactive Dynamic Batch Scaling Calculator */}
                <div className="glass-panel" style={{ padding: '14px 16px', background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.1) 0%, rgba(180, 83, 9, 0.04) 100%)', border: '1.5px solid #d97706', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 900, fontSize: '0.92rem', color: '#92400e' }}>
                        <Scale size={18} color="#b45309" />
                        ⚖️ BATCH SCALER (કેટલા કિલો મીઠાઈ બનાવવી છે?):
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: '2px' }}>
                        તમારી જરૂરિયાત મુજબ ગમે તેટલા કિલો અહીં ટાઈપ કરો અથવા ૧-ક્લિક બટન દબાવો
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Prominent Clickable / Editable Custom Input */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#ffffff',
                        border: '2px solid #d97706',
                        borderRadius: '8px',
                        padding: '3px 10px',
                        boxShadow: '0 2px 6px rgba(217, 119, 6, 0.2)'
                      }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400e' }}>વજન ટાઈપ કરો:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={customBatchInput}
                          onChange={(e) => {
                            setCustomBatchInput(e.target.value);
                            const num = parseFloat(e.target.value);
                            if (!isNaN(num) && num > 0) {
                              setTargetBatchKg(num);
                            }
                          }}
                          className="form-input"
                          style={{
                            width: '85px',
                            padding: '4px 6px',
                            fontSize: '1.05rem',
                            textAlign: 'center',
                            fontWeight: 900,
                            color: '#92400e',
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: '4px'
                          }}
                          placeholder="KG"
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#92400e' }}>KG</span>
                      </div>

                      {/* Quick 1-Tap Preset Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {[0.5, 1, 2, 2.5, 5, 10, 25, 50, 100].map(kg => (
                          <button
                            key={kg}
                            type="button"
                            onClick={() => {
                              setTargetBatchKg(kg);
                              setCustomBatchInput(String(kg));
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              border: targetBatchKg === kg ? '1.5px solid #b45309' : '1px solid #cbd5e1',
                              background: targetBatchKg === kg ? '#b45309' : '#ffffff',
                              color: targetBatchKg === kg ? '#ffffff' : '#78350f',
                              boxShadow: targetBatchKg === kg ? '0 2px 6px rgba(180, 83, 9, 0.3)' : 'none'
                            }}
                          >
                            {kg} KG
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scaled Ingredients Breakdown Table */}
                <div className="vyapar-card" style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      REQUIRED RAW MATERIALS FOR {targetBatchKg} KG BATCH ({recipeDetail.items?.length || 0} INGREDIENTS)
                    </h3>
                  </div>

                  <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>INGREDIENT (કાચો માલ / સામગ્રી)</th>
                          <th>BASE FORMULA (PER 1 KG)</th>
                          <th>SCALED QTY FOR {targetBatchKg} KG</th>
                          <th>UNIT</th>
                          <th>PURCHASE RATE</th>
                          <th>ESTIMATED COST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!recipeDetail.items || recipeDetail.items.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                              No ingredients mapped to this recipe formula.
                            </td>
                          </tr>
                        ) : (
                          (() => {
                            const scaleFactor = (targetBatchKg || 1) / (recipeDetail.batch_size || 1);
                            let totalEstimatedCost = 0;

                            const rows = recipeDetail.items.map((item: any, idx: number) => {
                              const scaledQty = (item.quantity || 0) * scaleFactor;
                              const rate = item.current_purchase_rate || item.standard_rate || 0;
                              const cost = scaledQty * rate;
                              totalEstimatedCost += cost;

                              return (
                                <tr key={item.id || idx}>
                                  <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                                  <td>
                                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.86rem' }}>
                                      {getGujaratiName(item.item_name || '')}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                      {item.item_name} {item.item_code ? `(${item.item_code})` : ''}
                                    </div>
                                  </td>
                                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                                    {item.quantity} {item.unit}
                                  </td>
                                  <td>
                                    <span style={{
                                      fontWeight: 900,
                                      fontSize: '0.86rem',
                                      color: '#b45309',
                                      background: '#fef3c7',
                                      padding: '2px 8px',
                                      borderRadius: '4px'
                                    }}>
                                      {formatGujaratiQuantity(scaledQty, item.unit)}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 700 }}>{item.unit}</td>
                                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                                    {rate > 0 ? formatCurrency(rate) : '—'}
                                  </td>
                                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-main)' }}>
                                    {cost > 0 ? formatCurrency(cost) : '—'}
                                  </td>
                                </tr>
                              );
                            });

                            return (
                              <>
                                {rows}
                                {totalEstimatedCost > 0 && (
                                  <tr style={{ background: 'var(--bg-card-alt)', fontWeight: 900 }}>
                                    <td colSpan={6} style={{ textAlign: 'right' }}>
                                      ESTIMATED RAW MATERIAL COST FOR {targetBatchKg} KG:
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: '#15803d' }}>
                                      {formatCurrency(totalEstimatedCost)}
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Select a sweet recipe formula to view details and scale ingredients
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTION BATCHES LOG */}
      {activeTab === 'BATCHES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '36px' }}
                placeholder="Search batches by Batch #, Sweet Name, or Manufacturing Voucher #..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Batch # / MFG No</th>
                  <th>Finished Sweet Produced</th>
                  <th>Planned Qty</th>
                  <th>Actual Output</th>
                  <th>Wastage %</th>
                  <th>Total Batch Cost</th>
                  <th>Cost per KG (Actual)</th>
                  <th>Std vs Actual Variance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No manufacturing batches recorded yet. Click "+ Produce Batch" to record your first batch!
                    </td>
                  </tr>
                ) : (
                  orders.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {formatDate(m.date)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                          {m.batch_number}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {m.manufacturing_no}
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: '#fff' }}>{m.finished_product_name}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          Recipe: {m.recipe_name} (v{m.version_number || 1})
                        </div>
                      </td>
                      <td>{m.planned_quantity} {m.planned_unit}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                          {m.actual_output} {m.actual_unit}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: m.wastage_pct > 5 ? '#fb7185' : 'var(--text-secondary)'
                        }}>
                          {m.wastage_quantity} {m.planned_unit} ({m.wastage_pct}%)
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontWeight: 800 }}>
                        {formatCurrency(m.total_batch_cost)}
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(m.cost_per_unit)}/{m.actual_unit}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: m.cost_variance > 0 ? '#fb7185' : '#34d399'
                        }}>
                          {m.cost_variance > 0 ? `+${formatCurrency(m.cost_variance)}` : formatCurrency(m.cost_variance)} ({m.cost_variance_pct}%)
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={m.status} />
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedBatchId(m.id)}
                          style={{ padding: '4px 8px' }}
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isNewBatchOpen && (
        <NewBatchModal
          isOpen={isNewBatchOpen}
          preSelectedProductId={batchTargetProductId}
          onClose={() => {
            setIsNewBatchOpen(false);
            setBatchTargetProductId(null);
          }}
          onSuccess={() => {
            setIsNewBatchOpen(false);
            setBatchTargetProductId(null);
            fetchOrders();
          }}
        />
      )}

      {selectedBatchId && (
        <BatchDetailModal
          isOpen={!!selectedBatchId}
          batchId={selectedBatchId}
          onClose={() => setSelectedBatchId(null)}
        />
      )}
    </div>
  );
};
