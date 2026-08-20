import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  ScrollText, 
  Calculator, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  CheckCircle, 
  Calendar 
} from 'lucide-react';
import { api } from '../../api/client';
import { Recipe } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { RecipeDetailModal } from './RecipeDetailModal';
import { RecipeCostCalculatorModal } from './RecipeCostCalculatorModal';

export const RecipesView: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [calculatorRecipeId, setCalculatorRecipeId] = useState<number | null>(null);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const data = await api.getRecipes({ search });
      setRecipes(data);
    } catch (err) {
      console.error('Error fetching recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, [search]);

  const handleOpenDetail = async (recipeId: number) => {
    try {
      const fullRecipe = await api.getRecipeById(recipeId);
      setSelectedRecipe(fullRecipe);
      setIsDetailOpen(true);
    } catch (err) {
      console.error('Error loading recipe details:', err);
    }
  };

  const handleOpenCalculator = (recipeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCalculatorRecipeId(recipeId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Recipe Master & Bill of Materials (BOM)
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            Versioned formulas, dynamic batch scaling, ingredient ratios & multi-level BOM
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => { setSelectedRecipe(null); setIsDetailOpen(true); }}>
          <Plus size={16} />
          Create New Recipe
        </button>
      </div>

      {/* Search */}
      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder="Search recipes by formula name, sweet name, or recipe code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Recipe Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {recipes.map((rec) => (
          <div
            key={rec.id}
            className="glass-card"
            style={{
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
              cursor: 'pointer'
            }}
            onClick={() => handleOpenDetail(rec.id)}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24' }}>
                    {rec.code}
                  </span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                    {rec.name}
                  </h3>
                </div>
                <StatusBadge status={rec.version_status || 'ACTIVE'} />
              </div>

              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                  Target: {rec.product_name}
                </span>
                <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                  Base Batch: {rec.batch_size} {rec.batch_unit}
                </span>
                <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                  Version {rec.version_number || 1}
                </span>
              </div>

              {rec.description && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                  {rec.description}
                </p>
              )}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-subtle)'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>MRP / Selling:</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(rec.selling_rate)}/KG
                </div>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={(e) => handleOpenCalculator(rec.id, e)}
                style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderColor: '#f59e0b' }}
              >
                <Calculator size={14} />
                Cost Calculator & Scaler
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recipe Detail & Edit Modal */}
      {isDetailOpen && (
        <RecipeDetailModal
          isOpen={isDetailOpen}
          recipe={selectedRecipe}
          onClose={() => setIsDetailOpen(false)}
          onSuccess={() => {
            setIsDetailOpen(false);
            fetchRecipes();
          }}
        />
      )}

      {/* Recipe Cost Calculator Modal */}
      {calculatorRecipeId && (
        <RecipeCostCalculatorModal
          isOpen={!!calculatorRecipeId}
          recipeId={calculatorRecipeId}
          onClose={() => setCalculatorRecipeId(null)}
        />
      )}
    </div>
  );
};
