import React, { useState, useRef } from 'react';
import { Download, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, X, Check, ArrowRight } from 'lucide-react';
import { parseCSV } from '../../utils/exportUtils';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  type: 'PRODUCTS' | 'CUSTOMERS' | 'SUPPLIERS';
  onDownloadTemplate: () => void;
  onImport: (rows: any[]) => Promise<{ success: boolean; inserted: number; updated: number; total: number; errors?: string[] }>;
  onSuccessCallback?: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  type,
  onDownloadTemplate,
  onImport,
  onSuccessCallback
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; inserted: number; updated: number; total: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setError('No valid rows found in the CSV file. Please make sure the file is not empty and matches the template format.');
          setParsedRows([]);
          setPreviewHeaders([]);
          return;
        }

        const headers = Object.keys(rows[0] || {});
        setPreviewHeaders(headers);
        setParsedRows(rows);
      } catch (err: any) {
        setError(`Failed to read CSV: ${err.message}`);
      }
    };
    reader.readAsText(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }
      const fakeEvent = { target: { files: [droppedFile] } } as any;
      handleFileChange(fakeEvent);
    }
  };

  const handleUploadSubmit = async () => {
    if (parsedRows.length === 0) {
      setError('Please select and upload a valid CSV file first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await onImport(parsedRows);
      setResult(res);
      if (onSuccessCallback) {
        onSuccessCallback();
      }
    } catch (err: any) {
      setError(err.message || 'Import failed. Please verify the CSV columns and data.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setPreviewHeaders([]);
    setError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100000,
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        maxWidth: '720px',
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          padding: '16px 20px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={22} color="#a7f3d0" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>{title}</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#d1fae5' }}>{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#d1fae5', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Step 1: Download Template */}
          <div style={{
            background: 'var(--bg-card-alt)',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Step 1: Download Sample Excel / CSV Format Template
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Contains pre-filled column headers & example rows. Copy your items/parties into this file.
              </div>
            </div>
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 800, padding: '7px 12px', whiteSpace: 'nowrap' }}
            >
              <Download size={14} color="#059669" /> Download Template
            </button>
          </div>

          {/* Result Alert if successful */}
          {result && (
            <div style={{
              background: '#ecfdf5',
              border: '1.5px solid #10b981',
              borderRadius: '10px',
              padding: '14px 16px',
              color: '#065f46'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '0.9rem', marginBottom: '4px' }}>
                <CheckCircle2 size={20} color="#10b981" />
                <span>Bulk Import Completed Successfully!</span>
              </div>
              <div style={{ fontSize: '0.8rem', marginLeft: '28px' }}>
                Processed <strong>{result.total}</strong> rows in total: 
                <span style={{ color: '#047857', fontWeight: 800 }}> {result.inserted} Added </span> &bull; 
                <span style={{ color: '#0284c7', fontWeight: 800 }}> {result.updated} Updated</span>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '0.74rem', color: '#b45309', background: '#fffbeb', padding: '6px 10px', borderRadius: '6px' }}>
                  <strong>Notes/Skipped:</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#dc2626',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Step 2: Upload CSV File */}
          {!result && (
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                Step 2: Upload Your Filled Excel / CSV File
              </div>
              
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '12px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: 'var(--bg-card-alt)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <UploadCloud size={36} color="#059669" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                  {file ? file.name : 'Click to Browse or Drag & Drop .CSV File Here'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Supported format: Comma-Separated Values (.csv exported from Excel or Google Sheets)
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview Data Table */}
          {parsedRows.length > 0 && !result && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  📊 Preview Data ({parsedRows.length} Rows Detected)
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                >
                  Clear / Change File
                </button>
              </div>

              <div style={{ maxHeight: '160px', overflowY: 'auto', overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-card-alt)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>#</th>
                      {previewHeaders.slice(0, 5).map((h, i) => (
                        <th key={i} style={{ padding: '6px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 800, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                        {previewHeaders.slice(0, 5).map((h, i) => (
                          <td key={i} style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{row[h] || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 5 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '4px' }}>
                  + {parsedRows.length - 5} more rows ready to import
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          background: 'var(--bg-card-alt)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={loading}
          >
            {result ? 'Close' : 'Cancel'}
          </button>

          {!result && (
            <button
              type="button"
              onClick={handleUploadSubmit}
              className="btn btn-primary"
              disabled={loading || parsedRows.length === 0}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                borderColor: '#047857',
                fontWeight: 900,
                padding: '8px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? 'Importing Master Data...' : `Import ${parsedRows.length > 0 ? parsedRows.length : ''} Records into ERP`}
              {!loading && <ArrowRight size={16} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
